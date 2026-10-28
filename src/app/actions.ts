"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { dbReady } from "@/lib/leads/db";
import { recordInquiry } from "@/lib/leads/inquiries";
import { addContact, contactsReady, deskEmail, deskInbox, INTENT_LABEL, mailReady, sendMail, type Inquiry, type Intent } from "@/lib/leads/mail";
import { drain } from "@/lib/leads/outbox";
import { byId, MOQ_CASES, PACK } from "@/lib/products";
import { SEASON_COOKIE } from "@/lib/season";

export type InquiryResult =
  | { status: "idle" }
  | { status: "error"; errors: { company?: string; email?: string; form?: string } }
  | { status: "success"; summary: string; delivered: boolean; ref?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isIntent = (v: unknown): v is Intent => typeof v === "string" && v in INTENT_LABEL;

/** Longest we wait on the database before sending the inquiry straight to the desk instead. */
const DB_TIMEOUT = 4000;

/**
 * An inquiry from the drawer or /inquiry. Where it goes (docs/design/inquiry-lead-pipeline.md):
 *  - with a database (MONGODB_URI): stored first, with its two emails queued, and the buyer gets their reference;
 *    the emails go out right after the response, and the cron retries any that fail.
 *  - without one, or if it is down: emailed to the desk directly, as before.
 *  - without email settings either: logged only, and the buyer sees a demo notice (src/lib/leads/mail.ts).
 */
export async function submitInquiry(_prev: InquiryResult, formData: FormData): Promise<InquiryResult> {
  // a field people never see; bots fill it in. Pretend it worked and drop it.
  if (String(formData.get("website") ?? "")) return { status: "success", summary: "Thank you.", delivered: true };

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

  let asked: { id: string; cases: number }[];
  try {
    asked = JSON.parse(String(formData.get("lines") ?? "[]"));
    if (!Array.isArray(asked)) throw new Error();
  } catch {
    return { status: "error", errors: { form: "Your inquiry list could not be read. Please try again." } };
  }
  // known styles only, at MOQ or more, once each; each line keeps the style as it is today (the catalog changes)
  const seen = new Set<string>();
  const lines = asked
    .filter((l) => byId[l?.id] && Number.isInteger(l.cases) && l.cases >= MOQ_CASES && l.cases <= 10_000 && !seen.has(l.id) && seen.add(l.id))
    .slice(0, 200)
    .map((l) => {
      const p = byId[l.id];
      return { productId: p.id, name: p.name, color: p.color.name, sizes: p.sizes, cases: l.cases, pairs: l.cases * PACK };
    });

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
      // this inquiry's two emails first, then anything else that is due (retries ride along on new traffic)
      after(async () => {
        try {
          await drain({ ref });
          await drain({ limit: 10 });
        } catch (e) {
          console.error("[outbox] drain after submit failed; the cron will retry", e);
        }
      });
      return { status: "success", summary: summary(ref), delivered: mailReady(), ref };
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
  return { status: "success", summary: summary(), delivered: mailReady() };
}

export type SignupResult = { status: "idle" } | { status: "error"; error: string } | { status: "success"; delivered: boolean };

/** "Next line sheet first": joins Resend's contacts (RESEND_SEGMENT_ID), or, until that is set, emails the desk. */
export async function subscribe(_prev: SignupResult, formData: FormData): Promise<SignupResult> {
  if (String(formData.get("website") ?? "")) return { status: "success", delivered: true };

  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const from = String(formData.get("from") ?? "").slice(0, 80);
  if (!EMAIL.test(email)) return { status: "error", error: "Enter a valid work email." };

  const error = contactsReady()
    ? await addContact(email)
    : mailReady()
      ? await sendMail({
          to: deskInbox(),
          replyTo: email,
          subject: `Line sheet signup: ${email}`,
          text: `Add ${email} to the season line-sheet mailing.\nSigned up on: ${from || "the website"}.`,
        })
      : (console.info("[signup] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", { email, from }), null);
  if (error) {
    console.error("[signup] failed", error);
    return { status: "error", error: "We couldn't sign you up just now. Please try again in a minute." };
  }
  return { status: "success", delivered: mailReady() };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))]);
}
