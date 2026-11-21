import "server-only";
import { deskInbox, mailReady, sendMail } from "./mail";
import { quotePath, quoteReady } from "./quote-link";
import { absoluteUrl } from "@/lib/site";

/*
 * The one follow-up a buyer gets when a quote has gone 5 days without an answer (Settings → Alerts, off by default).
 * Short and easy to answer: it asks once, offers help, and says we won't chase. Replies go to the desk inbox.
 */

export type NudgeTo = { ref: string; company: string; email: string; lastDeskAt: Date };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Shanghai" });

/** The email itself, plain text and simple HTML with the same words. Everything from the inquiry is escaped. */
export function quoteNudgeEmail(q: NudgeTo) {
  // the quick form asks for no company; then company holds their address, which makes a poor greeting
  const hello = q.company && !q.company.includes("@") ? `Hello ${q.company},` : `Hello,`;
  const paras = [
    `We sent you a quote on ${day(q.lastDeskAt)} (reference ${q.ref}) and wanted to make sure it reached you.`,
    `If anything would help you decide (other styles or colours, a different size run, samples first, or a question about shipping or payment), just reply to this email and the trade desk will answer within a day.`,
    `If the timing isn't right, no reply is needed. We won't chase you again.`,
  ];
  const site = absoluteUrl("/");
  // the buyer's quote page, where they can accept or ask in one click (only when the links are signed)
  const quote = quoteReady() ? absoluteUrl(quotePath(q.ref)) : null;
  const text = [hello, ``, ...paras.flatMap((p) => [p, ``]), ...(quote ? [`Your quote: ${quote}`, ``] : []), `Chime Long trade desk`, site].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f1f1ee;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px">
  <tr><td style="padding:28px">
    <div style="font-size:12px;font-weight:600;color:#984080">Inquiry ${esc(q.ref)}</div>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#121416">${esc(hello)}</p>
    ${paras.map((p) => `<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4b5157">${esc(p)}</p>`).join("\n    ")}
    ${quote ? `<p style="margin:20px 0 0"><a href="${esc(quote)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#121416;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">View your quote</a></p>` : ""}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#121416">Chime Long trade desk<br><a href="${esc(site)}" style="color:#5f656b">${esc(site.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></p>
  </td></tr>
</table>
</body></html>`;
  return {
    to: [q.email],
    replyTo: deskInbox(),
    subject: `Your Chime Long quote (${q.ref})`,
    text,
    html,
    // one per inquiry: a retry after a lost response can't send it twice
    idempotencyKey: `quote-nudge-${q.ref}`,
  };
}

/** Sends the nudge. Null when Resend accepted it, else a short reason; never sends while email isn't set up. */
export async function sendQuoteNudge(q: NudgeTo): Promise<string | null> {
  if (!mailReady()) return "email is not set up";
  return sendMail(quoteNudgeEmail(q));
}
