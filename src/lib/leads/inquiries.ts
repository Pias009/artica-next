import "server-only";
import { getContent } from "../content/store";
import { MongoServerError } from "mongodb";
import { counters, inquiries, type InquiryDoc, type MailState } from "./db";
import type { DeskStatus } from "./desk";
import type { Inquiry } from "./mail";

/** What's kept beside the inquiry for reporting. No IP address. */
export type Context = { key: string; ipCountry: string | null; season: string | null; sourcePath: string | null };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Stores the inquiry with its lines and its two emails-to-send in one document, so either all of it is saved or none.
 * The form's idempotency key (unique index) makes a repeat (double click, retried request) return the first one's ref
 * instead of storing it twice. A repeat that races the first can use up a ref number: refs are unique, not a count.
 */
export async function recordInquiry(i: Inquiry, c: Context): Promise<{ ref: string; created: boolean }> {
  const col = inquiries();
  const first = await col.findOne({ idempotencyKey: c.key }, { projection: { ref: 1 } });
  if (first) return { ref: first.ref, created: false };

  const now = new Date();
  const year = now.getUTCFullYear();
  const counter = await counters().findOneAndUpdate({ _id: `inquiry-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  const ref = `CL-${year}-${String(counter!.seq).padStart(4, "0")}`;
  const pending = (): MailState => ({ attempts: 0, nextAt: now, sentAt: null, lastError: null });
  // the desk's "every new inquiry" alert can be switched off in the admin panel (Settings → Alerts)
  const { alerts } = await getContent();
  const skipped: MailState = { attempts: 0, nextAt: now, sentAt: now, lastError: "Not sent: new-inquiry alerts are off in the admin settings" };

  try {
    await col.insertOne({
      company: i.company,
      email: i.email,
      country: i.country,
      buyerType: i.buyerType,
      intent: i.intent,
      ...(i.request && { request: true }),
      note: i.note,
      lines: i.lines,
      pairs: i.pairs,
      ref,
      idempotencyKey: c.key,
      createdAt: now,
      ipCountry: c.ipCountry,
      season: c.season,
      sourcePath: c.sourcePath,
      status: "new",
      statusAt: now,
      firstReplyAt: null,
      mail: { notify_desk: alerts.notifyNew ? pending() : skipped, confirm_buyer: pending() },
    });
    return { ref, created: true };
  } catch (e) {
    // the same key stored by a request in flight alongside this one
    if (e instanceof MongoServerError && e.code === 11000) {
      const doc = await col.findOne({ idempotencyKey: c.key }, { projection: { ref: 1 } });
      if (doc) return { ref: doc.ref, created: false };
    }
    throw e;
  }
}

export type Summary = Pick<InquiryDoc, "ref" | "company" | "country" | "intent" | "pairs" | "status" | "createdAt" | "firstReplyAt">;
const SUMMARY = { _id: 0, ref: 1, company: 1, country: 1, intent: 1, pairs: 1, status: 1, createdAt: 1, firstReplyAt: 1 } as const;

export async function findInquiry(ref: string): Promise<Summary | null> {
  return inquiries().findOne<Summary>({ ref }, { projection: SUMMARY });
}

/** Moves an inquiry along the desk's workflow. The first move past "new" (other than spam) is the first reply. */
export async function setStatus(ref: string, status: DeskStatus): Promise<Summary | null> {
  return inquiries().findOneAndUpdate(
    { ref },
    [
      {
        $set: {
          status: { $literal: status },
          statusAt: "$$NOW",
          firstReplyAt: status === "spam" ? "$firstReplyAt" : { $ifNull: ["$firstReplyAt", "$$NOW"] },
        },
      },
    ],
    { returnDocument: "after", projection: SUMMARY },
  ) as Promise<Summary | null>;
}

/** For the daily digest: inquiries still unanswered after 20 hours (the site promises 24), up to two weeks back. */
export async function overdue(): Promise<Summary[]> {
  const now = Date.now();
  return inquiries()
    .find<Summary>({ status: "new", createdAt: { $lt: new Date(now - 20 * HOUR), $gt: new Date(now - 14 * DAY) } }, { projection: SUMMARY })
    .sort({ createdAt: 1 })
    .toArray();
}

/** Spam kept 30 days after it was marked, then deleted. Returns how many. */
export async function purgeSpam(): Promise<number> {
  const { deletedCount } = await inquiries().deleteMany({ status: "spam", statusAt: { $lt: new Date(Date.now() - 30 * DAY) } });
  return deletedCount;
}

/** A quote the buyer hasn't answered: who to write to, and when the desk last wrote to them. */
export type QuietQuote = Summary & { email: string; followup: InquiryDoc["followup"] | null; lastDeskAt: Date };

/**
 * For the daily follow-ups: quotes ("quoted") the buyer hasn't answered in 3 days. The desk's last contact is when the
 * details went out (else when it was marked quoted), or a later reply sent from the panel; any buyer answer after that
 * (on the quote page, or a reply) means it isn't quiet. Only the last 60 days: an older quote is a lost lead, not a
 * follow-up. Oldest contact first. Not spam by construction (the status is "quoted").
 */
export async function quietQuotes(): Promise<QuietQuote[]> {
  const now = Date.now();
  const at = (from: "desk" | "buyer") => ({
    $map: {
      input: {
        $filter: {
          input: { $ifNull: ["$messages", []] },
          // a reply that failed to send never reached the buyer
          cond: from === "desk" ? { $and: [{ $eq: ["$$this.from", "desk"] }, { $eq: [{ $ifNull: ["$$this.error", null] }, null] }] } : { $eq: ["$$this.from", "buyer"] },
        },
      },
      in: "$$this.at",
    },
  });
  return inquiries()
    .aggregate<QuietQuote>([
      { $match: { status: "quoted", createdAt: { $gt: new Date(now - 60 * DAY) } } },
      {
        $addFields: {
          lastDeskAt: { $max: [{ $ifNull: ["$details.sentAt", "$statusAt"] }, { $max: at("desk") }] },
          lastBuyerAt: { $max: { $concatArrays: [{ $map: { input: { $ifNull: ["$buyerResponses", []] }, in: "$$this.at" } }, at("buyer")] } },
        },
      },
      {
        $match: {
          $expr: {
            $and: [{ $lt: ["$lastDeskAt", new Date(now - 3 * DAY)] }, { $or: [{ $eq: ["$lastBuyerAt", null] }, { $lte: ["$lastBuyerAt", "$lastDeskAt"] }] }],
          },
        },
      },
      { $sort: { lastDeskAt: 1 } },
      { $limit: 200 },
      { $project: { ...SUMMARY, email: 1, followup: { $ifNull: ["$followup", null] }, lastDeskAt: 1 } },
    ])
    .toArray();
}

/** Notes that the desk's digest listed these quotes, so each is listed once. */
export async function markDeskFollowup(refs: string[], at = new Date()): Promise<void> {
  if (refs.length) await inquiries().updateMany({ ref: { $in: refs } }, { $set: { "followup.deskAt": at } });
}

/**
 * Claims one quote for the buyer nudge before it is sent, so two runs at once can't both send it: true when this call
 * set followup.buyerAt. Only a quote that is still "quoted" (not won, lost or spam since) and never nudged.
 */
export async function claimBuyerNudge(ref: string, at: Date): Promise<boolean> {
  const { modifiedCount } = await inquiries().updateOne({ ref, status: "quoted", "followup.buyerAt": null }, { $set: { "followup.buyerAt": at } });
  return modifiedCount === 1;
}

/** Hands a claim back when the nudge couldn't be sent, so the next run tries again. */
export async function releaseBuyerNudge(ref: string, at: Date): Promise<void> {
  await inquiries().updateOne({ ref, "followup.buyerAt": at }, { $set: { "followup.buyerAt": null } });
}
