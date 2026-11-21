"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { noteContact } from "@/lib/analytics/visits";
import { dbReady, inquiries } from "@/lib/leads/db";
import { recordInquiry } from "@/lib/leads/inquiries";
import { addContact, buyerEmail, contactsReady, deskEmail, deskInbox, INTENT_LABEL, mailReady, sendMail, type Inquiry, type InquiryLine, type Intent } from "@/lib/leads/mail";
import { drain } from "@/lib/leads/outbox";
import { rateLimited, receiptLimited } from "@/lib/leads/ratelimit";
import { recordSubscriber, setSubscriberStatus } from "@/lib/marketing/store";
import { unsubscribeTokenOk } from "@/lib/marketing/unsubscribe";
import { byId, MOQ_CASES, PACK } from "@/lib/products";
import { SEASON_COOKIE } from "@/lib/season";

export type InquiryResult =
  | { status: "idle" }
  | { status: "error"; errors: { company?: string; email?: string; form?: string } }
  | { status: "success"; summary: string; delivered: boolean; demo: boolean; ref?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isIntent = (v: unknown): v is Intent => typeof v === "string" && v in INTENT_LABEL;

/** Longest we wait on the database before sending the inquiry straight to the desk instead. */
const DB_TIMEOUT = 4000;

/** What a visitor sees once they've hit a limit in src/lib/leads/ratelimit.ts. */
const LIMITED = "Too many tries from this connection. Please wait a few minutes and try again.";

/**
 * Whether success screens show the "Demo mode: email isn't connected" note. Only outside production: on the live site
 * it would just look broken to a buyer (their inquiry is still stored, or logged, either way).
 */
const demoMode = () => !mailReady() && (process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== "production" : process.env.NODE_ENV !== "production");

/**
 * An inquiry from the drawer or /inquiry. Where it goes (docs/design/inquiry-lead-pipeline.md):
 *  - with a database (MONGODB_URI): stored first, with its two emails queued, and the buyer gets their reference;
 *    the emails go out right after the response, and the cron retries any that fail.
 *  - without one, or if it is down: emailed to the desk directly, as before.
 *  - without email settings either: logged only, and the buyer sees a demo notice (src/lib/leads/mail.ts).
 */
export async function submitInquiry(_prev: InquiryResult, formData: FormData): Promise<InquiryResult> {
  // a field people never see; bots fill it in. Pretend it worked and drop it.
  if (String(formData.get("website") ?? "")) return { status: "success", summary: "Thank you.", delivered: true, demo: false };

  const company = String(formData.get("company") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const country = String(formData.get("country") ?? "Not given").slice(0, 80);
  const buyerType = String(formData.get("type") ?? "Retailer").slice(0, 40);
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000);
  const intent = formData.get("intent");

  const errors: { company?: string; email?: string } = {};
  if (!company) errors.company = "Enter your store or company name.";
  if (!EMAIL.test(email)) errors.email = "Enter a valid work email.";
  if (errors.company || errors.email) return { status: "error", errors };
  if (await rateLimited("submitInquiry")) return { status: "error", errors: { form: LIMITED } };

  const lines = readLines(formData);
  if (!lines) return { status: "error", errors: { form: "Your inquiry list could not be read. Please try again." } };

  const inquiry: Inquiry = {
    company,
    email,
    country,
    buyerType,
    intent: isIntent(intent) ? intent : "quote",
    note,
    lines,
    pairs: lines.reduce((a, l) => a + l.pairs, 0),
  };
  const summary = (ref?: string) =>
    (lines.length
      ? `${company}: ${lines.length} style${lines.length > 1 ? "s" : ""}, ${inquiry.pairs.toLocaleString("en-US")} pairs to ${country}. Line sheet and tier pricing go to ${email}.`
      : `${company}: full line sheet and tier pricing go to ${email}.`) + (ref ? ` Your reference is ${ref}.` : "");

  if (dbReady()) {
    const key = String(formData.get("key") ?? "");
    const [h, jar] = await Promise.all([headers(), cookies()]);
    try {
      const { ref } = await withTimeout(
        recordInquiry(inquiry, {
          key: UUID.test(key) ? key : crypto.randomUUID(),
          ipCountry: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry"),
          season: jar.get(SEASON_COOKIE.pick)?.value ?? jar.get(SEASON_COOKIE.season)?.value ?? null,
          sourcePath: String(formData.get("source") ?? "").slice(0, 200) || null,
        }),
        DB_TIMEOUT,
      );
      // whose footprint this is, for the panel's Visitors view (today's visit gets the email)
      const source = String(formData.get("source") ?? "").slice(0, 200) || null;
      after(() => noteContact({ email, via: "inquiry", path: source, ref, company }));
      // this inquiry's two emails first, then anything else that is due (retries ride along on new traffic)
      after(async () => {
        try {
          await drain({ ref });
          await drain({ limit: 10 });
        } catch (e) {
          console.error("[outbox] drain after submit failed; the cron will retry", e);
        }
      });
      return { status: "success", summary: summary(ref), delivered: mailReady(), demo: demoMode(), ref };
    } catch (e) {
      // stored nothing: fall through and email the desk directly, so the lead still reaches someone
      console.error("[inquiry] lead.db_fallback", e);
    }
  }

  if (mailReady()) {
    const error = await sendMail(deskEmail(inquiry));
    if (error) {
      console.error("[inquiry] delivery failed", error, inquiry);
      return { status: "error", errors: { form: "We couldn't send your inquiry just now. Please try again in a minute." } };
    }
  } else {
    console.info("[inquiry] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", inquiry);
  }
  return { status: "success", summary: summary(), delivered: mailReady(), demo: demoMode() };
}

export type SignupResult = { status: "idle" } | { status: "error"; error: string } | { status: "success"; delivered: boolean; demo: boolean };

/**
 * Joins the season mailing: Resend's contacts (RESEND_SEGMENT_ID), or, until that is set, an email to the desk. With a
 * database the signup is also kept on the panel's subscriber list (Admin → Marketing), with its SUB- id and priority.
 */
async function joinList(email: string, from: string, source: "line-sheet" | "talk-to-desk" = "line-sheet", company?: string) {
  if (dbReady())
    after(() =>
      recordSubscriber({ email, source, ...(company && { company }), tags: [source === "line-sheet" ? "line-sheet" : "desk-contact"] }).catch((e) =>
        console.error("[signup] not kept on the subscriber list", e),
      ),
    );
  return contactsReady()
    ? addContact(email)
    : mailReady()
      ? sendMail({
          to: deskInbox(),
          replyTo: email,
          subject: `Line sheet signup: ${email}`,
          text: `Add ${email} to the season line-sheet mailing.\nSigned up on: ${from || "the website"}.`,
        })
      : (console.info("[signup] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", { email, from }), null);
}

/** "Next line sheet first": one email field. */
export async function subscribe(_prev: SignupResult, formData: FormData): Promise<SignupResult> {
  if (String(formData.get("website") ?? "")) return { status: "success", delivered: true, demo: false };

  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const from = String(formData.get("from") ?? "").slice(0, 80);
  if (!EMAIL.test(email)) return { status: "error", error: "Enter a valid work email." };
  if (await rateLimited("subscribe")) return { status: "error", error: LIMITED };

  const error = await joinList(email, from);
  if (error) {
    console.error("[signup] failed", error);
    return { status: "error", error: "We couldn't sign you up just now. Please try again in a minute." };
  }
  return { status: "success", delivered: mailReady(), demo: demoMode() };
}

export type ContactResult =
  | { status: "idle" }
  | { status: "error"; error: string; field?: "email" | "phone" | "want" }
  | { status: "success"; email: string; contact: boolean; updates: boolean; delivered: boolean; demo: boolean; ref?: string };

const PHONE = /^\+?[\d\s().-]{6,24}$/;

/**
 * "Talk to the desk" (footer, inquiry page): a work email, maybe a WhatsApp number, and what the buyer wants:
 *  - contact: stored as an inquiry ("Contact request") like any other, so it lands in Admin → Inquiries with its
 *    stages, the desk is emailed, and the buyer gets a note saying who will write and when;
 *  - updates: joins the season mailing (new styles and order dates), as the line-sheet signup does.
 */
export async function requestContact(_prev: ContactResult, formData: FormData): Promise<ContactResult> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const contact = formData.get("contact") === "on";
  const updates = formData.get("updates") === "on";
  if (String(formData.get("website") ?? "")) return { status: "success", email, contact, updates, delivered: true, demo: false };

  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const company = String(formData.get("company") ?? "").trim().slice(0, 200);
  const from = String(formData.get("source") ?? "").slice(0, 200);
  if (!EMAIL.test(email)) return { status: "error", error: "Enter a valid work email.", field: "email" };
  if (phone && !PHONE.test(phone)) return { status: "error", error: "Enter the number with its country code, e.g. +1 415 555 0134.", field: "phone" };
  if (!contact && !updates) return { status: "error", error: "Pick at least one: a message from the desk, or email updates.", field: "want" };
  if (await rateLimited("requestContact")) return { status: "error", error: LIMITED };

  const failed = { status: "error", error: "We couldn't send that just now. Please try again in a minute." } as const;
  if (updates) {
    const error = await joinList(email, from, "talk-to-desk", company || undefined);
    // a failed signup only fails the form when it was all they asked for
    if (error) {
      console.error("[talk] signup failed", error);
      if (!contact) return failed;
    }
  }
  if (!contact) return { status: "success", email, contact, updates, delivered: mailReady(), demo: demoMode() };

  const inquiry: Inquiry = {
    company: company || email.split("@")[1],
    email,
    country: "Not given",
    buyerType: "Not given",
    intent: "contact",
    note: [
      "Asked the trade desk to contact them directly.",
      phone && `WhatsApp / phone: ${phone}`,
      `Email updates (new styles, order dates): ${updates ? "yes, signed up" : "no"}`,
      from && `Left on: ${from}`,
    ]
      .filter(Boolean)
      .join("\n"),
    lines: [],
    pairs: 0,
  };

  if (dbReady()) {
    const key = String(formData.get("key") ?? "");
    const [h, jar] = await Promise.all([headers(), cookies()]);
    try {
      const { ref } = await withTimeout(
        recordInquiry(inquiry, {
          key: UUID.test(key) ? key : crypto.randomUUID(),
          ipCountry: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry"),
          season: jar.get(SEASON_COOKIE.pick)?.value ?? jar.get(SEASON_COOKIE.season)?.value ?? null,
          sourcePath: from || null,
        }),
        DB_TIMEOUT,
      );
      after(async () => {
        try {
          await drain({ ref });
        } catch (e) {
          console.error("[outbox] drain after contact request failed; the cron will retry", e);
        }
      });
      return { status: "success", email, contact, updates, delivered: mailReady(), demo: demoMode(), ref };
    } catch (e) {
      console.error("[talk] lead.db_fallback", e);
    }
  }

  if (mailReady()) {
    const error = await sendMail(deskEmail(inquiry));
    if (error) {
      console.error("[talk] delivery failed", error, inquiry);
      return failed;
    }
  } else {
    console.info("[talk] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", inquiry);
  }
  return { status: "success", email, contact, updates, delivered: mailReady(), demo: demoMode() };
}

/** The inquiry list sent with a form: known styles only, at MOQ or more, once each, each as it is today (the catalog changes). Null if unreadable. */
function readLines(formData: FormData): InquiryLine[] | null {
  let asked: { id: string; cases: number }[];
  try {
    asked = JSON.parse(String(formData.get("lines") ?? "[]"));
    if (!Array.isArray(asked)) return null;
  } catch {
    return null;
  }
  const seen = new Set<string>();
  return asked
    .filter((l) => byId[l?.id] && Number.isInteger(l.cases) && l.cases >= MOQ_CASES && l.cases <= 10_000 && !seen.has(l.id) && seen.add(l.id))
    .slice(0, 200)
    .map((l) => {
      const p = byId[l.id];
      return { productId: p.id, name: p.name, color: p.color.name, sizes: p.sizes, cases: l.cases, pairs: l.cases * PACK };
    });
}

export type SendResult =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; email: string; styles: number; pairs: number; delivered: boolean; demo: boolean; ref?: string };

/**
 * "Get your inquiry by email" (/send-inquiry, the short link the floating button and the menus point to): the buyer
 * gives only an email. The inquiry list goes with it (none: the full line sheet). It is stored like any other inquiry
 * (Admin -> Inquiries -> Email requests), the desk is told and the buyer gets a receipt; the desk then adds prices and
 * terms there and sends the details (saveDetailsAction in app/admin/request-actions.ts).
 */
export async function sendInquiry(_prev: SendResult, formData: FormData): Promise<SendResult> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  if (String(formData.get("website") ?? "")) return { status: "success", email, styles: 0, pairs: 0, delivered: true, demo: false };
  if (!EMAIL.test(email)) return { status: "error", error: "Enter your email address, e.g. yourname@gmail.com." };
  if (await rateLimited("sendInquiry")) return { status: "error", error: LIMITED };
  // each request emails a receipt to the address typed: cap them per address, so the site can't be used to mail a stranger
  if (await receiptLimited(email))
    return { status: "error", error: "We've already sent a few requests to this email today. Please check that inbox (and its spam folder), or try again tomorrow." };

  const lines = readLines(formData);
  if (!lines) return { status: "error", error: "Your inquiry list could not be read. Please try again." };
  const source = String(formData.get("source") ?? "").slice(0, 200) || null;

  const inquiry: Inquiry = {
    // no company asked for: their address stands in, so the desk and the panel always have something to show
    company: email,
    email,
    country: "Not given",
    buyerType: "Not given",
    intent: "quote",
    note: "",
    lines,
    pairs: lines.reduce((a, l) => a + l.pairs, 0),
    // the desk prepares the details in Admin -> Inquiries -> Email requests; the buyer's first email is a receipt
    request: true,
  };
  const done = (ref?: string): SendResult => ({ status: "success", email, styles: lines.length, pairs: inquiry.pairs, delivered: mailReady(), demo: demoMode(), ref });

  if (dbReady()) {
    const key = String(formData.get("key") ?? "");
    const [h, jar] = await Promise.all([headers(), cookies()]);
    try {
      const { ref } = await withTimeout(
        recordInquiry(inquiry, {
          key: UUID.test(key) ? key : crypto.randomUUID(),
          ipCountry: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry"),
          season: jar.get(SEASON_COOKIE.pick)?.value ?? jar.get(SEASON_COOKIE.season)?.value ?? null,
          sourcePath: source,
        }),
        DB_TIMEOUT,
      );
      after(() => noteContact({ email, via: "inquiry", path: source, ref }));
      // the desk's alert and the buyer's copy go out right after the response; the cron retries either if it fails
      after(async () => {
        try {
          await drain({ ref });
        } catch (e) {
          console.error("[outbox] drain after quick inquiry failed; the cron will retry", e);
        }
      });
      return done(ref);
    } catch (e) {
      console.error("[send] lead.db_fallback", e);
    }
  }

  if (mailReady()) {
    // nothing stored: the desk first (that one must arrive), then the buyer's copy
    const error = await sendMail(deskEmail(inquiry));
    if (error) {
      console.error("[send] delivery failed", error, inquiry);
      return { status: "error", error: "We couldn't send your inquiry just now. Please try again in a minute." };
    }
    const copy = await sendMail(buyerEmail(inquiry));
    if (copy) console.error("[send] buyer copy failed", copy);
  } else {
    console.info("[send] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", inquiry);
  }
  return done();
}

export type RequestInfo = { name?: string; country?: string; volume?: string };
export type RequestInfoResult = { ok: true } | { ok: false; error: string };

/** A form value as plain one-line text, capped: control characters become spaces. */
const oneLine = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max) : "");

/**
 * The optional second step on the email request's thank-you screen (EmailForm in components/inquiry/SendInquiry.tsx):
 * a name or company, where it ships and the volume, so the desk can price it sooner. It only changes the request just
 * made: the idempotency key the browser sent with it proves it's the same visitor, and only for a day. The name and
 * country also replace the placeholders on the inquiry (the email stands in as its company), so the board shows them.
 */
export async function addRequestInfo(ref: string, key: string, data: RequestInfo): Promise<RequestInfoResult> {
  const missing = { ok: false, error: "We couldn't add that to your request. The desk will still reply by email." } as const;
  if (typeof ref !== "string" || !/^CL-\d{4}-\d{4,}$/.test(ref) || typeof key !== "string" || !UUID.test(key) || !dbReady()) return missing;

  const name = oneLine(data?.name, 200);
  const country = oneLine(data?.country, 80);
  const volume = oneLine(data?.volume, 40);
  if (!name && !country && !volume) return { ok: false, error: "Fill in at least one, or skip this step." };
  if (await rateLimited("addRequestInfo")) return { ok: false, error: LIMITED };

  try {
    const { matchedCount } = await withTimeout(
      inquiries().updateOne(
        { ref, idempotencyKey: key, request: true, createdAt: { $gte: new Date(Date.now() - 24 * 3600_000) } },
        {
          $set: {
            requestInfo: { ...(name && { name }), ...(country && { country }), ...(volume && { volume }), at: new Date() },
            ...(name && { company: name }),
            ...(country && { country }),
          },
        },
      ),
      DB_TIMEOUT,
    );
    return matchedCount ? { ok: true } : missing;
  } catch (e) {
    console.error("[send] request info not saved", e);
    return missing;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))]);
}

/** The unsubscribe page's button (app/(site)/unsubscribe): takes the signed subscriber id off the campaign list. */
export async function unsubscribeAction(formData: FormData) {
  const sid = String(formData.get("s") ?? "");
  if (!unsubscribeTokenOk(sid, String(formData.get("t") ?? ""))) redirect("/unsubscribe");
  if (dbReady()) await setSubscriberStatus({ sid }, "unsubscribed");
  redirect("/unsubscribe?done=1");
}
