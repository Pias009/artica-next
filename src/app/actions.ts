"use server";

import { byId, MOQ_CASES, PACK } from "@/lib/products";

export type InquiryResult =
  | { status: "idle" }
  | { status: "error"; errors: { company?: string; email?: string; form?: string } }
  | { status: "success"; summary: string; delivered: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where inquiries go. Set these in the environment (.env.local, or the host's settings):
 *   RESEND_API_KEY  an API key from resend.com
 *   INQUIRY_TO      the inbox that receives inquiries (comma-separate several)
 *   INQUIRY_FROM    a sender on a domain verified in Resend, e.g. "Chime Long <inquiries@yourdomain.com>"
 * Until all three are set the form still works but nothing is sent: the inquiry is logged on the server and the
 * buyer sees a demo notice, so no one mistakes a test setup for a live one.
 */
const MAIL = {
  key: process.env.RESEND_API_KEY,
  to: process.env.INQUIRY_TO?.split(",").map((s) => s.trim()).filter(Boolean),
  from: process.env.INQUIRY_FROM,
};
const mailReady = () => !!(MAIL.key && MAIL.to?.length && MAIL.from);

export async function submitInquiry(_prev: InquiryResult, formData: FormData): Promise<InquiryResult> {
  // a field people never see; bots fill it in. Pretend it worked and drop it.
  if (String(formData.get("website") ?? "")) return { status: "success", summary: "Thank you.", delivered: true };

  const company = String(formData.get("company") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const country = String(formData.get("country") ?? "Not given").slice(0, 80);
  const buyerType = String(formData.get("type") ?? "Retailer").slice(0, 40);
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000);

  const errors: { company?: string; email?: string } = {};
  if (!company) errors.company = "Enter your store or company name.";
  if (!EMAIL.test(email)) errors.email = "Enter a valid work email.";
  if (errors.company || errors.email) return { status: "error", errors };

  let lines: { id: string; cases: number }[] = [];
  try {
    lines = (JSON.parse(String(formData.get("lines") ?? "[]")) as { id: string; cases: number }[]).filter(
      (l) => byId[l.id] && Number.isInteger(l.cases) && l.cases >= MOQ_CASES,
    );
  } catch {
    return { status: "error", errors: { form: "Your inquiry list could not be read. Please try again." } };
  }

  const pairs = lines.reduce((a, l) => a + l.cases * PACK, 0);
  const inquiry = { company, email, country, buyerType, note, lines, pairs };

  if (mailReady()) {
    const sent = await sendMail(
      email,
      `Wholesale inquiry: ${company} (${buyerType}, ${country})${pairs ? `, ${pairs.toLocaleString("en-US")} pairs` : ""}`,
      emailText(inquiry),
    );
    if (!sent) {
      console.error("[inquiry] delivery failed", inquiry);
      return { status: "error", errors: { form: "We couldn't send your inquiry just now. Please try again in a minute." } };
    }
  } else {
    console.info("[inquiry] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", inquiry);
  }

  const summary = lines.length
    ? `${company}: ${lines.length} style${lines.length > 1 ? "s" : ""}, ${pairs.toLocaleString("en-US")} pairs to ${country}. Line sheet and tier pricing go to ${email}.`
    : `${company}: full line sheet and tier pricing go to ${email}.`;

  return { status: "success", summary, delivered: mailReady() };
}

/** One email to the trade desk through Resend. True when it was accepted. */
async function sendMail(replyTo: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${MAIL.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MAIL.from, to: MAIL.to, reply_to: replyTo, subject, text }),
  }).catch(() => null);
  return !!res?.ok;
}

export type SignupResult = { status: "idle" } | { status: "error"; error: string } | { status: "success"; delivered: boolean };

/** "Next line sheet first": the trade desk gets the address and adds it to the season mailing. */
export async function subscribe(_prev: SignupResult, formData: FormData): Promise<SignupResult> {
  if (String(formData.get("website") ?? "")) return { status: "success", delivered: true };

  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const from = String(formData.get("from") ?? "").slice(0, 80);
  if (!EMAIL.test(email)) return { status: "error", error: "Enter a valid work email." };

  if (mailReady()) {
    const sent = await sendMail(email, `Line sheet signup: ${email}`, `Add ${email} to the season line-sheet mailing.\nSigned up on: ${from || "the website"}.`);
    if (!sent) return { status: "error", error: "We couldn't sign you up just now. Please try again in a minute." };
  } else {
    console.info("[signup] not sent (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM are not all set)", { email, from });
  }
  return { status: "success", delivered: mailReady() };
}

/** The inquiry as a plain-text email, laid out for whoever answers it. */
function emailText(i: { company: string; email: string; country: string; buyerType: string; note: string; lines: { id: string; cases: number }[]; pairs: number }) {
  const rows = i.lines.map((l) => {
    const p = byId[l.id];
    return `  - Chime Long ${p.name} (${p.color.name}, ${p.sizes}): ${l.cases} cases, ${l.cases * PACK} pairs`;
  });
  return [
    `New wholesale inquiry`,
    ``,
    `Company:   ${i.company}`,
    `Buyer:     ${i.buyerType}`,
    `Ship to:   ${i.country}`,
    `Email:     ${i.email}   (reply to this email to answer the buyer)`,
    ``,
    i.lines.length ? `Styles (${i.lines.length}, ${i.pairs.toLocaleString("en-US")} pairs):\n${rows.join("\n")}` : `Styles: none chosen; they asked for the full line sheet.`,
    ``,
    `Notes:`,
    i.note || `  (none)`,
    ``,
    `Promised on the site: tier pricing within 24 hours.`,
  ].join("\n");
}
