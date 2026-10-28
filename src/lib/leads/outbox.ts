import "server-only";
import type { Filter, WithId } from "mongodb";
import { inquiries, MAIL_KINDS, type InquiryDoc, type MailKind } from "./db";
import { buyerEmail, deskEmail, mailReady, sendMail } from "./mail";

/** After this many tries an email stays unsent and shows up in the daily digest instead (about 4 hours of backoff). */
export const MAX_ATTEMPTS = 8;

/**
 * Sends the emails that are due: right after an inquiry is stored (through after()), and from the cron for anything
 * that failed. Claiming one is a single atomic update that also pushes its next try out (1, 2, 4 … 60 minutes), so two
 * drains running at once never take the same email, and a crash mid-send simply retries later. Resend's idempotency
 * key (one per inquiry and email) stops that retry from sending twice. Pass `ref` to send one inquiry's emails only.
 */
export async function drain({ ref = null, limit = 20 }: { ref?: string | null; limit?: number } = {}) {
  if (!mailReady()) return { sent: 0, failed: 0 };
  const col = inquiries();

  const claimed: { doc: WithId<InquiryDoc>; kind: MailKind }[] = [];
  for (const kind of MAIL_KINDS) {
    const f = `mail.${kind}`;
    while (claimed.length < limit) {
      const doc = await col.findOneAndUpdate(
        {
          ...(ref && { ref }),
          [`${f}.sentAt`]: null,
          [`${f}.nextAt`]: { $lte: new Date() },
          [`${f}.attempts`]: { $lt: MAX_ATTEMPTS },
        } as Filter<InquiryDoc>,
        [
          {
            $set: {
              [`${f}.attempts`]: { $add: [`$${f}.attempts`, 1] },
              [`${f}.nextAt`]: {
                $dateAdd: { startDate: "$$NOW", unit: "minute", amount: { $toLong: { $min: [{ $pow: [2, `$${f}.attempts`] }, 60] } } },
              },
            },
          },
        ],
        { sort: { createdAt: 1 } },
      );
      if (!doc) break;
      claimed.push({ doc, kind });
    }
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    claimed.map(async ({ doc, kind }) => {
      const f = `mail.${kind}`;
      const error = await sendMail({ ...(kind === "notify_desk" ? deskEmail(doc) : buyerEmail(doc)), idempotencyKey: `${doc._id}-${kind}` });
      if (error) {
        failed++;
        console.error(`[outbox] ${kind} for ${doc.ref} failed: ${error}`);
        await col.updateOne({ _id: doc._id }, { $set: { [`${f}.lastError`]: error } });
      } else {
        sent++;
        await col.updateOne({ _id: doc._id }, { $set: { [`${f}.sentAt`]: new Date(), [`${f}.lastError`]: null } });
      }
    }),
  );
  return { sent, failed };
}

/** Emails that gave up, or have waited over 15 minutes: for the digest and the logs. */
export async function stuck() {
  const since = new Date(Date.now() - 15 * 60_000);
  const late = (k: MailKind) => ({ [`mail.${k}.sentAt`]: null, $or: [{ [`mail.${k}.attempts`]: { $gte: MAX_ATTEMPTS } }, { createdAt: { $lt: since } }] });
  const docs = await inquiries()
    .find({ $or: MAIL_KINDS.map(late) } as Filter<InquiryDoc>, { projection: { ref: 1, createdAt: 1, mail: 1 } })
    .sort({ createdAt: 1 })
    .limit(100)
    .toArray();
  return docs.flatMap((d) =>
    MAIL_KINDS.filter((k) => !d.mail[k].sentAt && (d.mail[k].attempts >= MAX_ATTEMPTS || d.createdAt < since)).map((kind) => ({
      ref: d.ref,
      kind,
      attempts: d.mail[kind].attempts,
      last_error: d.mail[kind].lastError,
    })),
  );
}
