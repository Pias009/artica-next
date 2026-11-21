"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { readContent } from "@/lib/content/store";
import { dbReady, inquiries } from "@/lib/leads/db";
import { setStatus } from "@/lib/leads/inquiries";
import { detailsEmail, mailReady, sendMail, type DetailLine } from "@/lib/leads/mail";
import { builtInProducts, PACK } from "@/lib/products";

/*
 * Email requests (Admin -> Inquiries): a buyer left only an email in the "Ask inquiry" box or on /send-inquiry; the desk
 * fills in the styles, prices and terms here and sends them. Like every admin action it checks the session itself and
 * validates every field: the client's form is only a suggestion.
 */

const REF = /^CL-\d{4}-\d{4,}$/;
const text = (max: number) => z.string().trim().max(max);
const Input = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().max(80),
        cases: z.number().int().min(1).max(10_000),
        price: z.number().min(0).max(10_000).nullable(),
      }),
    )
    .max(200),
  leadTime: text(200),
  samples: text(200),
  payment: text(300),
  shipping: text(200),
  message: text(4000),
});
export type DetailsInput = z.infer<typeof Input>;
export type DetailsResult = { ok: true; sent: boolean; at: string } | { ok: false; error: string; saved?: boolean };

/** Saves the details on the inquiry and, with `send`, emails them to the buyer and moves the inquiry to Quoted. */
export async function saveDetailsAction(ref: string, input: DetailsInput, send: boolean): Promise<DetailsResult> {
  const { admin } = await requireAdmin();
  if (!dbReady()) return { ok: false, error: "No database is connected." };
  if (!REF.test(ref)) return { ok: false, error: "Unknown inquiry." };
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the styles: whole cases from 1, prices from $0." };

  const doc = await inquiries().findOne({ ref }, { projection: { email: 1, company: 1, details: 1 } });
  if (!doc) return { ok: false, error: "That inquiry wasn't found." };

  // each style as it is in the catalogue today (built-in and added in the panel), once each
  const { added } = await readContent();
  const catalog = new Map([...builtInProducts(), ...added].map((p) => [p.id, p]));
  const seen = new Set<string>();
  const lines: DetailLine[] = parsed.data.lines
    .filter((l) => catalog.has(l.productId) && !seen.has(l.productId) && !!seen.add(l.productId))
    .map((l) => {
      const p = catalog.get(l.productId)!;
      return {
        productId: p.id,
        name: p.name,
        color: p.color.name,
        sizes: p.sizes,
        cases: l.cases,
        pairs: l.cases * PACK,
        price: l.price === null ? null : Math.round(l.price * 100) / 100,
        image: p.outer.src,
      };
    });
  const details = { ...parsed.data, lines };
  if (send && !lines.length && !details.message) return { ok: false, error: "Add at least one style or a message before sending." };

  const now = new Date();
  // a draft saved after sending keeps what was sent (the buyer's quote page shows that copy)
  const keep = { sentAt: doc.details?.sentAt ?? null, sentBy: doc.details?.sentBy ?? null, sent: doc.details?.sent ?? null };
  await inquiries().updateOne({ ref }, { $set: { details: { ...details, savedAt: now, ...keep, lastError: null } } });

  if (!send) {
    await audit({ adminId: admin._id, email: admin.email, action: "save_details", ref, detail: `${lines.length} styles` });
    revalidatePath("/admin", "layout");
    return { ok: true, sent: false, at: now.toISOString() };
  }

  const failed = async (why: string, error: string) => {
    await inquiries().updateOne({ ref }, { $set: { "details.lastError": why } });
    await audit({ adminId: admin._id, email: admin.email, action: "send_details_failed", ref, detail: why.slice(0, 200) });
    revalidatePath("/admin", "layout");
    return { ok: false as const, error, saved: true };
  };
  if (!mailReady())
    return failed(
      "Email isn't connected (RESEND_API_KEY, INQUIRY_TO, INQUIRY_FROM)",
      "Saved, but not sent: email delivery isn't connected yet (RESEND_API_KEY, INQUIRY_TO and INQUIRY_FROM).",
    );
  // a new key per send: a deliberate resend goes out, a retried request within the same millisecond does not
  const error = await sendMail({ ...detailsEmail({ ref, email: doc.email, company: doc.company }, details), idempotencyKey: `${ref}-details-${now.getTime()}` });
  if (error) return failed(error, `Saved, but the email didn't go out: ${error.slice(0, 140)}`);

  await inquiries().updateOne({ ref }, { $set: { "details.sentAt": now, "details.sentBy": admin.email, "details.lastError": null, "details.sent": details } });
  await setStatus(ref, "quoted");
  await audit({ adminId: admin._id, email: admin.email, action: "send_details", ref, detail: `${lines.length} styles to ${doc.email}` });
  revalidatePath("/admin", "layout");
  return { ok: true, sent: true, at: now.toISOString() };
}
