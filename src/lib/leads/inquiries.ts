import "server-only";
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

  try {
    await col.insertOne({
      company: i.company,
      email: i.email,
      country: i.country,
      buyerType: i.buyerType,
      intent: i.intent,
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
      mail: { notify_desk: pending(), confirm_buyer: pending() },
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
