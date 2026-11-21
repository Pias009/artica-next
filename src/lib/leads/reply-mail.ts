import "server-only";
import { deskInbox, type sendMail } from "./mail";
import { absoluteUrl } from "@/lib/site";

/**
 * A reply the desk writes in the admin panel, to the buyer. Plain text plus a simple HTML version in the house style of
 * the details email (tables and inline styles, which email apps render reliably). Reply-To is the desk inbox, not the
 * admin's own mailbox, so whatever the buyer answers reaches the whole desk.
 */
type Mail = Parameters<typeof sendMail>[0];

/** The subject as sent: the desk's own, with the inquiry ref added when it isn't there, so both sides can find it. */
export function replySubject(ref: string, subject: string): string {
  const s = subject.trim();
  if (!s) return `Re: your inquiry ${ref}`;
  return s.includes(ref) ? s : `${s} (${ref})`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function replyEmail(i: { ref: string; email: string }, r: { subject: string; body: string }): Mail {
  const subject = replySubject(i.ref, r.subject);
  const body = r.body.trim();
  const site = absoluteUrl("/");
  return {
    to: [i.email],
    replyTo: deskInbox(),
    subject,
    text: [body, ``, `--`, `Inquiry ${i.ref}. Just reply to this email to answer; please keep ${i.ref} in the subject.`, site].join("\n"),
    html: replyHtml(i.ref, body, site),
  };
}

function replyHtml(ref: string, body: string, site: string) {
  const font = "font-family:-apple-system,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
  // one paragraph per blank-line block; single line breaks inside a block are kept with pre-line
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#121416;white-space:pre-line">${esc(p)}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef3f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f5;${font}">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden">
  <tr><td style="background:#121416;padding:22px 28px">
    <span style="font-size:18px;font-weight:700;letter-spacing:.02em;color:#ffffff">CHIME LONG</span>
    <span style="float:right;font-size:12px;color:#c9cdd1;line-height:26px">Wholesale footwear</span>
  </td></tr>
  <tr><td style="padding:28px 28px 12px">
    <div style="font-size:12px;font-weight:600;color:#984080;margin-bottom:16px">Inquiry ${esc(ref)}</div>
    ${paragraphs}
  </td></tr>
  <tr><td style="padding:0 28px 24px">
    <p style="margin:0;font-size:13px;line-height:1.5;color:#5f656b">Just reply to this email to answer. Please keep ${esc(ref)} in the subject.</p>
  </td></tr>
  <tr><td style="padding:18px 28px;border-top:1px solid #e8eaea;font-size:12px;color:#5f656b">
    Chime Long trade desk &middot; <a href="${esc(site)}" style="color:#5f656b">${esc(site.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}
