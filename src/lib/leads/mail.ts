import "server-only";
import { deskPath, deskReady, DESK_STATUSES } from "./desk";
import { LEAD } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

/**
 * Email through Resend. Set these in the environment (.env.local, or the host's settings):
 *   RESEND_API_KEY     an API key from resend.com
 *   INQUIRY_TO         the inbox that receives inquiries (comma-separate several)
 *   INQUIRY_FROM       a sender on a domain verified in Resend, e.g. "Chime Long <inquiries@yourdomain.com>"
 *   RESEND_SEGMENT_ID  optional: the Resend segment line-sheet signups join (else signups are emailed to the desk)
 * Until the first three are set nothing is sent: inquiries are logged (and stored, if there is a database) and the
 * buyer sees a demo notice, so no one mistakes a test setup for a live one.
 */
const MAIL = {
  key: process.env.RESEND_API_KEY,
  to: process.env.INQUIRY_TO?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
  from: process.env.INQUIRY_FROM,
  segment: process.env.RESEND_SEGMENT_ID,
};
export const mailReady = () => !!(MAIL.key && MAIL.to.length && MAIL.from);
export const deskInbox = () => MAIL.to;

/** `html` is optional: most emails here are plain text; the inquiry details also go as HTML with product photos. */
type Mail = { to: string[]; replyTo: string | string[]; subject: string; text: string; html?: string; idempotencyKey?: string };

/** One email. Resolves with null when Resend accepted it, else a short reason (kept on the outbox row). */
export async function sendMail({ to, replyTo, subject, text, html, idempotencyKey }: Mail): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAIL.key}`,
      "Content-Type": "application/json",
      // Resend drops a repeat with the same key for 24 hours, so a retry after a lost response can't send twice
      ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    },
    body: JSON.stringify({ from: MAIL.from, to, reply_to: replyTo, subject, text, ...(html && { html }) }),
    signal: AbortSignal.timeout(8000),
  }).catch((e: Error) => e);
  if (res instanceof Error) return `network: ${res.message}`.slice(0, 300);
  if (res.ok) return null;
  return `${res.status}: ${(await res.text().catch(() => "")).slice(0, 280)}`;
}

/** A campaign email: one recipient, its own HTML and text, and its own unsubscribe headers. */
export type BulkMail = { to: string; subject: string; text: string; html: string; headers: Record<string, string> };

/**
 * Up to 100 campaign emails in one call (Resend's batch endpoint). They go from MARKETING_FROM if set, else from the
 * inquiry sender; replies go to the trade desk. Resolves with null when Resend accepted the batch, else a reason.
 */
export async function sendMailBatch(mails: BulkMail[], idempotencyKey: string): Promise<string | null> {
  if (!mails.length) return null;
  const from = process.env.MARKETING_FROM || MAIL.from;
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${MAIL.key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(mails.slice(0, 100).map((m) => ({ from, to: [m.to], reply_to: MAIL.to, subject: m.subject, text: m.text, html: m.html, headers: m.headers }))),
    signal: AbortSignal.timeout(15_000),
  }).catch((e: Error) => e);
  if (res instanceof Error) return `network: ${res.message}`.slice(0, 300);
  if (res.ok) return null;
  return `${res.status}: ${(await res.text().catch(() => "")).slice(0, 280)}`;
}

/** Adds a line-sheet signup to Resend's contacts (and the segment, if set). Null when done, else a reason. */
export async function addContact(email: string): Promise<string | null> {
  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${MAIL.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false, ...(MAIL.segment && { segments: [{ id: MAIL.segment }] }) }),
    signal: AbortSignal.timeout(8000),
  }).catch((e: Error) => e);
  if (res instanceof Error) return `network: ${res.message}`;
  // already on the list counts as done
  if (res.ok || res.status === 409) return null;
  return `${res.status}: ${(await res.text().catch(() => "")).slice(0, 280)}`;
}
export const contactsReady = () => mailReady() && !!MAIL.segment;

/* ---- The two inquiry emails ---- */

export const INTENT_LABEL = {
  quote: "Quote",
  sample: "Sample request",
  visit: "Visit request",
  private_label: "Private label",
  shipping: "Shipping quote",
  /** "Talk to the desk" (footer, inquiry page): an email, maybe a WhatsApp number, and a request to be contacted. */
  contact: "Contact request",
} as const;
export type Intent = keyof typeof INTENT_LABEL;

export type InquiryLine = { productId: string; name: string; color: string; sizes: string; cases: number; pairs: number };
export type Inquiry = {
  /** CL-2026-0142; absent when the inquiry couldn't be stored and went out directly. */
  ref?: string;
  company: string;
  email: string;
  country: string;
  buyerType: string;
  intent: Intent;
  note: string;
  lines: InquiryLine[];
  pairs: number;
  /**
   * Asked for by email only ("Ask inquiry" box, /send-inquiry): the buyer gave just an address and the desk prepares
   * the details (prices, terms) in the admin panel and sends them (detailsEmail). Their first email is a receipt.
   */
  request?: boolean;
};

/** One style in the details the desk sends: as it was when sent, with its price per pair (USD), if given. */
export type DetailLine = InquiryLine & { price: number | null; /** The style's photo (a site path or full URL), for the HTML email. */ image?: string };
/** What the desk sends a buyer who asked by email (Admin -> Inquiries -> Email requests). */
export type Details = {
  lines: DetailLine[];
  leadTime: string;
  samples: string;
  payment: string;
  shipping: string;
  message: string;
};

const n = (x: number) => x.toLocaleString("en-US");

/** To the trade desk, laid out for whoever answers it; replying goes straight to the buyer. */
export function deskEmail(i: Inquiry): Mail {
  const rows = i.lines.map((l) => `  - Chime Long ${l.name} (${l.color}, ${l.sizes}): ${l.cases} cases, ${n(l.pairs)} pairs`);
  const links = [
    ...(i.ref ? ["", `Open in the admin: ${absoluteUrl(`/admin/inquiries/${i.ref}`)}`] : []),
    ...(i.ref && deskReady() ? ["", "Track it (one click each):", ...DESK_STATUSES.map((s) => `  ${s.padEnd(8)} ${absoluteUrl(deskPath(i.ref!, s))}`)] : []),
  ];
  return {
    to: MAIL.to,
    replyTo: i.email,
    subject: `${i.ref ? `[${i.ref}] ` : ""}${INTENT_LABEL[i.intent]}: ${i.company} (${i.buyerType}, ${i.country})${i.pairs ? `, ${n(i.pairs)} pairs` : ""}`,    text: [
      `New wholesale inquiry${i.ref ? ` ${i.ref}` : ""}`,
      ``,
      `Company:   ${i.company}`,
      `Buyer:     ${i.buyerType}`,
      `Wants:     ${INTENT_LABEL[i.intent]}`,
      `Ship to:   ${i.country}`,
      `Email:     ${i.email}   (reply to this email to answer the buyer)`,
      ``,
      i.lines.length
        ? `Styles (${i.lines.length}, ${n(i.pairs)} pairs):\n${rows.join("\n")}`
        : i.intent === "contact"
          ? `They asked the desk to contact them directly. Write to them first.`
          : `Styles: none chosen; they asked for the full line sheet.`,
      ``,
      `Notes:`,
      i.note || `  (none)`,
      ``,
      i.intent === "contact" ? `Promised on the site: a trade assistant writes within one working day.` : `Promised on the site: tier pricing within 24 hours.`,
      ...links,
    ].join("\n"),
  };
}

/**
 * To the buyer: a copy of their inquiry (styles, where it ships, their notes) and what happens next. Replying reaches
 * the desk. Without a reference (sent directly, the database down) it still goes out, just without the number.
 */
export function buyerEmail(i: Inquiry): Mail {
  if (i.intent === "contact" && i.ref) return contactEmail({ ...i, ref: i.ref });
  if (i.request) return requestEmail(i);
  const rows = i.lines.map((l) => `  - ${l.name} (${l.color}, ${l.sizes}): ${l.cases} cases, ${n(l.pairs)} pairs`);
  // the quick form asks for no company; then company holds their address, which makes a poor greeting
  const hello = i.company && !i.company.includes("@") ? `Hello ${i.company},` : `Hello,`;
  return {
    to: [i.email],
    replyTo: MAIL.to,
    subject: `Your Chime Long inquiry${i.ref ? ` (${i.ref})` : ""}: tier pricing within 24 hours`,
    text: [
      hello,
      ``,
      `Thank you for your inquiry. Here is a copy for your records.${i.ref ? ` Your reference is ${i.ref}.` : ""}`,
      ``,
      i.lines.length ? `You asked about ${i.lines.length} style${i.lines.length > 1 ? "s" : ""}, ${n(i.pairs)} pairs in all:\n${rows.join("\n")}` : `You asked for the full line sheet.`,
      ``,
      ...(i.country !== "Not given" ? [`Ships to: ${i.country}`] : []),
      ...(i.note ? [`Your notes:`, ...i.note.split("\n").map((l) => `  ${l}`)] : []),
      ...(i.country !== "Not given" || i.note ? [``] : []),
      `What happens next:`,
      `  1. Within 24 hours: your line sheet and tier pricing, by email.`,
      `  2. If you'd like samples, they reach you in about ${LEAD.samples.replace("d", "")} days.`,
      `  3. When you're ready, confirm styles and sizes and production starts.`,
      ``,
      `Anything to add? Just reply to this email${i.ref ? ` and quote ${i.ref}` : ""}.`,
      ``,
      `Chime Long trade desk`,
      absoluteUrl("/"),
    ].join("\n"),
  };
}

/** To a buyer who asked the desk to contact them: who will write, when, and how to reach the desk meanwhile. */
function contactEmail(i: Inquiry & { ref: string }): Mail {
  return {
    to: [i.email],
    replyTo: MAIL.to,
    subject: `A trade assistant will write to you within one working day (${i.ref})`,
    text: [
      `Hello,`,
      ``,
      `Thank you for getting in touch with Chime Long. A trade assistant from our Guangzhou desk will write to you`,
      `at this address within one working day. Your reference is ${i.ref}.`,
      ``,
      `To help us answer well, you can reply to this email with:`,
      `  - what you sell (men, women, kids, waterproof) and where`,
      `  - roughly how many pairs you order a season`,
      `  - the season you're buying for`,
      ``,
      `Meanwhile, the full catalogue is at ${absoluteUrl("/catalog")}.`,
      ``,
      `Chime Long trade desk`,
      absoluteUrl("/"),
    ].join("\n"),
  };
}

/** To a buyer who asked by email: we have it, and the desk is preparing the details (sent later with detailsEmail). */
function requestEmail(i: Inquiry): Mail {
  const rows = i.lines.map((l) => `  - ${l.name} (${l.color}, ${l.sizes}): ${l.cases} cases, ${n(l.pairs)} pairs`);
  return {
    to: [i.email],
    replyTo: MAIL.to,
    subject: `We have your inquiry request${i.ref ? ` (${i.ref})` : ""}: details within one working day`,
    text: [
      `Hello,`,
      ``,
      `Thank you for asking Chime Long.${i.ref ? ` Your reference is ${i.ref}.` : ""}`,
      ``,
      i.lines.length ? `You asked about ${i.lines.length} style${i.lines.length > 1 ? "s" : ""}:\n${rows.join("\n")}` : `You asked for the full line sheet.`,
      ``,
      `Our trade desk is preparing the details for you: prices per pair, lead time, samples, payment and shipping terms.`,
      `They come to this address within one working day.`,
      ``,
      `Anything to add meanwhile? Just reply to this email.`,
      ``,
      `Chime Long trade desk`,
      absoluteUrl("/"),
    ].join("\n"),
  };
}

const money = (x: number) => `$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The details the desk prepared in the admin panel, to the buyer who asked by email. Replying reaches the desk. */
export function detailsEmail(i: Pick<Inquiry, "email" | "company"> & { ref: string }, d: Details): Mail {
  const rows = d.lines.map((l) => {
    const head = `  - ${l.name} (${l.color}, ${l.sizes}): ${l.cases} cases, ${n(l.pairs)} pairs`;
    return l.price !== null ? `${head} x ${money(l.price)} per pair = ${money(l.price * l.pairs)}` : `${head} (price on request)`;
  });
  const priced = d.lines.filter((l) => l.price !== null);
  const total = priced.reduce((a, l) => a + l.price! * l.pairs, 0);
  const pairs = d.lines.reduce((a, l) => a + l.pairs, 0);
  const hello = i.company && !i.company.includes("@") ? `Hello ${i.company},` : `Hello,`;
  const terms = (
    [
      ["Lead time", d.leadTime],
      ["Samples", d.samples],
      ["Payment", d.payment],
      ["Shipping", d.shipping],
    ] as const
  ).filter(([, v]) => v);
  return {
    to: [i.email],
    replyTo: MAIL.to,
    subject: `Your Chime Long inquiry details (${i.ref})`,
    text: [
      hello,
      ``,
      `Here are the details of your inquiry ${i.ref}.`,
      ``,
      ...(d.lines.length
        ? [
            `Styles (${d.lines.length}, ${n(pairs)} pairs):`,
            ...rows,
            ``,
            ...(priced.length ? [`${priced.length === d.lines.length ? "Order total" : "Total for the priced styles"}: ${money(total)} (USD, FOB)`, ``] : []),
          ]
        : []),
      ...(terms.length ? [`Terms:`, ...terms.map(([k, v]) => `  ${(k + ":").padEnd(11)}${v}`), ``] : []),
      ...(d.message ? [d.message, ``] : []),
      `To go ahead, reply with the styles and size runs you want, or ask us anything. Quote ${i.ref}.`,
      ``,
      `Chime Long trade desk`,
      absoluteUrl("/"),
    ].join("\n"),
    html: detailsHtml(i, d, { hello, priced: priced.length, total, pairs, terms }),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const photo = (src?: string) => (src ? (/^https?:\/\//.test(src) ? src : absoluteUrl(src)) : null);

/**
 * The same details as an email page: a row per style with its photo, the total, the terms and the message. Tables and
 * inline styles only, which is what email apps render reliably; everything the desk typed is escaped.
 */
function detailsHtml(
  i: { ref: string },
  d: Details,
  x: { hello: string; priced: number; total: number; pairs: number; terms: readonly (readonly [string, string])[] },
) {
  const font = "font-family:-apple-system,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
  const rows = d.lines
    .map((l) => {
      const img = photo(l.image);
      return `<tr>
  <td style="padding:14px 0;border-bottom:1px solid #e8eaea;width:84px;vertical-align:middle">
    ${img ? `<img src="${esc(img)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;object-fit:contain;background:#f1f1ee;border-radius:12px">` : `<div style="width:72px;height:72px;background:#f1f1ee;border-radius:12px"></div>`}
  </td>
  <td style="padding:14px 12px;border-bottom:1px solid #e8eaea;vertical-align:middle">
    <div style="font-size:15px;font-weight:600;color:#121416">${esc(l.name)}</div>
    <div style="font-size:13px;color:#5f656b;margin-top:2px">${esc(l.color)} &middot; ${esc(l.sizes)}</div>
    <div style="font-size:13px;color:#4b5157;margin-top:4px">${l.cases} cases &middot; ${n(l.pairs)} pairs${l.price !== null ? ` &middot; ${money(l.price)} per pair` : ""}</div>
  </td>
  <td align="right" style="padding:14px 0;border-bottom:1px solid #e8eaea;vertical-align:middle;font-size:15px;font-weight:600;color:#121416;white-space:nowrap">
    ${l.price !== null ? money(l.price * l.pairs) : `<span style="font-size:13px;font-weight:500;color:#5f656b">On request</span>`}
  </td>
</tr>`;
    })
    .join("");
  const total = x.priced
    ? `<tr><td colspan="2" style="padding:16px 0 0;font-size:14px;color:#4b5157">${x.priced === d.lines.length ? "Order total" : "Total for the priced styles"} &middot; ${n(x.pairs)} pairs<br><span style="font-size:12px;color:#5f656b">USD, FOB</span></td>
       <td align="right" style="padding:16px 0 0;font-size:22px;font-weight:700;color:#121416;white-space:nowrap">${money(x.total)}</td></tr>`
    : "";
  const terms = x.terms.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f5f5f2;border-radius:16px">
  <tr><td style="padding:18px 20px 6px;font-size:13px;font-weight:700;color:#121416">Terms</td></tr>
  ${x.terms.map(([k, v]) => `<tr><td style="padding:6px 20px;font-size:14px;color:#4b5157"><b style="color:#121416;display:inline-block;min-width:96px">${esc(k)}</b> ${esc(v)}</td></tr>`).join("")}
  <tr><td style="height:12px"></td></tr>
</table>`
    : "";
  const message = d.message
    ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#121416;white-space:pre-line">${esc(d.message)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef3f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f5;${font}">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden">
  <tr><td style="background:#121416;padding:22px 28px">
    <span style="font-size:18px;font-weight:700;letter-spacing:.02em;color:#ffffff">CHIME LONG</span>
    <span style="float:right;font-size:12px;color:#c9cdd1;line-height:26px">Wholesale footwear</span>
  </td></tr>
  <tr><td style="padding:28px 28px 8px">
    <div style="font-size:12px;font-weight:600;color:#984080">Inquiry ${esc(i.ref)}</div>
    <h1 style="margin:6px 0 0;font-size:26px;line-height:1.2;font-weight:600;color:#121416">Your inquiry details</h1>
    <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#4b5157">${esc(x.hello)} here are the styles, prices and terms you asked about.</p>
  </td></tr>
  <tr><td style="padding:8px 28px 0">
    ${d.lines.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${total}</table>` : ""}
    ${terms}
    ${message}
  </td></tr>
  <tr><td style="padding:28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#121416;border-radius:999px">
      <a href="mailto:${esc(String(MAIL.to[0] ?? ""))}?subject=${encodeURIComponent(`Re: inquiry ${i.ref}`)}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">Reply to confirm or ask</a>
    </td></tr></table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#5f656b">Reply with the styles and size runs you want, or any question. Please quote ${esc(i.ref)}.</p>
  </td></tr>
  <tr><td style="padding:18px 28px;border-top:1px solid #e8eaea;font-size:12px;color:#5f656b">
    Chime Long trade desk &middot; <a href="${esc(absoluteUrl("/"))}" style="color:#5f656b">${esc(absoluteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}
