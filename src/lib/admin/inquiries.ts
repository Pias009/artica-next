import "server-only";
import type { Filter } from "mongodb";
import { auditLog } from "./auth";
import { inquiries, MAIL_KINDS, type InquiryDoc, type Status } from "@/lib/leads/db";
import { INTENT_LABEL, type Intent } from "@/lib/leads/mail";
import { drain, MAX_ATTEMPTS, stuck } from "@/lib/leads/outbox";

/** What the admin panel reads. Every caller has already passed requireAdmin(). */

export const STATUSES: Status[] = ["new", "replied", "quoted", "won", "lost", "spam"];
export const INTENTS = Object.keys(INTENT_LABEL) as Intent[];
export const PAGE_SIZE = 25;
const HOUR = 3_600_000;
/** The site promises tier pricing within 24 hours; the panel flags inquiries from 20 hours on. */
export const DUE_HOURS = 20;

export type ListQuery = {
  status: Status | "all" | "overdue";
  intent: Intent | "all";
  q: string;
  page: number;
};

/** Turns the address bar's search params into a safe query: unknown values fall back to "all", text is capped. */
export function parseQuery(sp: Record<string, string | string[] | undefined>): ListQuery {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = one("status");
  const intent = one("intent");
  const page = Number.parseInt(one("page"), 10);
  return {
    status: STATUSES.includes(status as Status) || status === "overdue" ? (status as Status | "overdue") : "all",
    intent: INTENTS.includes(intent as Intent) ? (intent as Intent) : "all",
    q: one("q").trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 && page < 10_000 ? page : 1,
  };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function filterFor(q: ListQuery): Filter<InquiryDoc> {
  const f: Filter<InquiryDoc> = {};
  if (q.status === "overdue")
    Object.assign(f, {
      status: "new",
      createdAt: { $lt: new Date(Date.now() - DUE_HOURS * HOUR) },
    });
  else if (q.status !== "all") f.status = q.status;
  if (q.intent !== "all") f.intent = q.intent;
  if (q.q) {
    // user text only ever reaches the database as an escaped, anchored-free regex: no operators, no injection
    const re = new RegExp(escape(q.q), "i");
    f.$or = [{ ref: re }, { company: re }, { email: re }, { country: re }];
  }
  return f;
}

export type Row = Pick<InquiryDoc, "ref" | "company" | "email" | "country" | "buyerType" | "intent" | "pairs" | "status" | "createdAt" | "firstReplyAt"> & {
  lineCount: number;
  mailFailing: boolean;
};

export async function listInquiries(q: ListQuery) {
  const filter = filterFor(q);
  const [rows, total] = await Promise.all([
    inquiries()
      .aggregate<Row>([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: (q.page - 1) * PAGE_SIZE },
        { $limit: PAGE_SIZE },
        {
          $project: {
            _id: 0,
            ref: 1,
            company: 1,
            email: 1,
            country: 1,
            buyerType: 1,
            intent: 1,
            pairs: 1,
            status: 1,
            createdAt: 1,
            firstReplyAt: 1,
            lineCount: { $size: "$lines" },
            mailFailing: {
              $or: MAIL_KINDS.map((k) => ({
                $and: [{ $eq: [`$mail.${k}.sentAt`, null] }, { $gt: [`$mail.${k}.attempts`, 0] }],
              })),
            },
          },
        },
      ])
      .toArray(),
    inquiries().countDocuments(filter),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function dashboard() {
  const now = Date.now();
  const [facets, failing] = await Promise.all([
    inquiries()
      .aggregate<{
        byStatus: { _id: Status; n: number }[];
        week: { n: number }[];
        overdue: { n: number }[];
        reply: { hours: number | null }[];
      }>([
        {
          $facet: {
            byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
            week: [
              {
                $match: { createdAt: { $gte: new Date(now - 7 * 24 * HOUR) } },
              },
              { $count: "n" },
            ],
            overdue: [
              {
                $match: {
                  status: "new",
                  createdAt: { $lt: new Date(now - DUE_HOURS * HOUR) },
                },
              },
              { $count: "n" },
            ],
            // median time to first reply over the last 30 days
            reply: [
              {
                $match: {
                  createdAt: { $gte: new Date(now - 30 * 24 * HOUR) },
                  firstReplyAt: { $ne: null },
                },
              },
              {
                $group: {
                  _id: null,
                  hours: {
                    $median: {
                      input: {
                        $divide: [{ $subtract: ["$firstReplyAt", "$createdAt"] }, HOUR],
                      },
                      method: "approximate",
                    },
                  },
                },
              },
            ],
          },
        },
      ])
      .next(),
    stuck(),
  ]);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, facets?.byStatus.find((b) => b._id === s)?.n ?? 0])) as Record<Status, number>;
  return {
    byStatus,
    total: Object.values(byStatus).reduce((a, n) => a + n, 0),
    week: facets?.week[0]?.n ?? 0,
    overdue: facets?.overdue[0]?.n ?? 0,
    medianReplyHours: facets?.reply[0]?.hours ?? null,
    emailsStuck: failing.length,
  };
}

/** One inquiry in full, without the idempotency key (internal). */
export async function inquiryDetail(ref: string) {
  if (!/^CL-\d{4}-\d{4,}$/.test(ref)) return null;
  return inquiries().findOne({ ref }, { projection: { idempotencyKey: 0 } });
}

export async function historyFor(ref: string) {
  return auditLog().find({ ref }).sort({ at: -1 }).limit(50).toArray();
}

/** Puts this inquiry's unsent emails back in the queue as fresh and sends them now. */
export async function retryEmails(ref: string) {
  const unsent = Object.fromEntries(
    MAIL_KINDS.flatMap((k) => [
      [`mail.${k}.attempts`, 0],
      [`mail.${k}.nextAt`, new Date()],
    ]),
  );
  const doc = await inquiries().findOne({ ref }, { projection: { mail: 1 } });
  if (!doc) return { sent: 0, failed: 0 };
  const reset = Object.fromEntries(Object.entries(unsent).filter(([k]) => !doc.mail[k.split(".")[1] as keyof typeof doc.mail].sentAt));
  if (Object.keys(reset).length) await inquiries().updateOne({ ref }, { $set: reset });
  return drain({ ref });
}

export { MAX_ATTEMPTS };
