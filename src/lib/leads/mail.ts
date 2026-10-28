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

type Mail = { to: string[]; replyTo: string | string[]; subject: string; text: string; idempotencyKey?: string };

/** One email. Resolves with null when Resend accepted it, else a short reason (kept on the outbox row). */
export async function sendMail({ to, replyTo, subject, text, idempotencyKey }: Mail): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAIL.key}`,
      "Content-Type": "application/json",
      // Resend drops a repeat with the same key for 24 hours, so a retry after a lost response can't send twice
      ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    },
    body: JSON.stringify({ from: MAIL.from, to, reply_to: replyTo, subject, text }),
    signal: AbortSignal.timeout(8000),
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
    subject: `${i.ref ? `[${i.ref}] ` : ""}${INTENT_LABEL[i.intent]}: ${i.company} (${i.buyerType}, ${i.country})${i.pairs ? `, ${n(i.pairs)} pairs` : ""}`,
    text: [
      `New wholesale inquiry${i.ref ? ` ${i.ref}` : ""}`,
      ``,
      `Company:   ${i.company}`,
      `Buyer:     ${i.buyerType}`,
      `Wants:     ${INTENT_LABEL[i.intent]}`,
      `Ship to:   ${i.country}`,
      `Email:     ${i.email}   (reply to this email to answer the buyer)`,
      ``,
      i.lines.length ? `Styles (${i.lines.length}, ${n(i.pairs)} pairs):\n${rows.join("\n")}` : `Styles: none chosen; they asked for the full line sheet.`,
      ``,
      `Notes:`,
      i.note || `  (none)`,
      ``,
      `Promised on the site: tier pricing within 24 hours.`,
      ...links,
    ].join("\n"),
  };
}

/** To the buyer: what we got and what happens next. Replying reaches the desk. */
export function buyerEmail(i: Inquiry & { ref: string }): Mail {
  const rows = i.lines.map((l) => `  - ${l.name} (${l.color}): ${l.cases} cases, ${n(l.pairs)} pairs`);
  return {
    to: [i.email],
    replyTo: MAIL.to,
    subject: `We have your inquiry (${i.ref}): tier pricing within 24 hours`,
    text: [
      `Hello ${i.company},`,
      ``,
      `Thank you for your inquiry. Your reference is ${i.ref}.`,
      ``,
      i.lines.length ? `You asked about ${i.lines.length} style${i.lines.length > 1 ? "s" : ""}, ${n(i.pairs)} pairs in all:\n${rows.join("\n")}` : `You asked for the full line sheet.`,
      ``,
      `What happens next:`,
      `  1. Within 24 hours: your line sheet and tier pricing, by email.`,
      `  2. If you'd like samples, they reach you in about ${LEAD.samples.replace("d", "")} days.`,
      `  3. When you're ready, confirm styles and sizes and production starts.`,
      ``,
      `Anything to add? Just reply to this email and quote ${i.ref}.`,
      ``,
      `Chime Long trade desk`,
      absoluteUrl("/"),
    ].join("\n"),
  };
}
