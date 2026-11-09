import "server-only";
import { ObjectId, type Filter, type WithId } from "mongodb";
import { counters, database, dbReady, inquiries } from "../leads/db";
import {
  cleanTags,
  isEmail,
  normalEmail,
  priorityFromScore,
  scoreSubscriber,
  subscriberId,
  type Audience,
  type BuyerHistory,
  type CampaignStatus,
  type Channel,
  type IdeaKind,
  type IdeaPriority,
  type IdeaStage,
  type Priority,
  type SubscriberSource,
  type SubscriberStatus,
  type TemplateKind,
} from "./model";

/*
 * The marketing desk's data in MongoDB: subscribers (with their SUB- ids and priorities), mail models, the mail
 * schedule (campaigns) and the Social team's ideas board. Every reader fails soft (an empty list and a log line) so a
 * hiccup never takes the panel down; writers throw and the server actions turn that into a message.
 */

const DAY = 86_400_000;

export type SubscriberDoc = {
  _id?: ObjectId;
  sid: string;
  seq: number;
  email: string;
  name?: string;
  company?: string;
  country?: string;
  source: SubscriberSource;
  tags: string[];
  score: number;
  priority: Priority;
  /** Set by hand: the score no longer moves the tier. */
  priorityLocked: boolean;
  status: SubscriberStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  unsubscribedAt: Date | null;
  lastSentAt: Date | null;
  sent: number;
};

export type TemplateDoc = {
  _id?: ObjectId;
  name: string;
  kind: TemplateKind;
  subject: string;
  preheader: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
};

export type CampaignDoc = {
  _id?: ObjectId;
  name: string;
  templateId: ObjectId | null;
  /** The mail model as it was when the campaign was saved: editing the model later doesn't change a scheduled send. */
  subject: string;
  preheader: string;
  body: string;
  audience: Audience;
  status: CampaignStatus;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  sentAt: Date | null;
  /** While a sender works on it; a sender that dies lets go when this passes. */
  lockedUntil: Date | null;
  /** The last subscriber seq sent to: sending walks the audience in seq order and resumes from here. */
  cursor: number;
  errors: number;
  stats: { targeted: number; sent: number; failed: number };
  lastError: string | null;
};

export type IdeaDoc = {
  _id?: ObjectId;
  title: string;
  kind: IdeaKind;
  channel: Channel;
  stage: IdeaStage;
  priority: IdeaPriority;
  owner: string;
  /** yyyy-mm-dd, for the content calendar. */
  due: string | null;
  notes: string;
  link: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export const subscribers = () => database().collection<SubscriberDoc>("subscribers");
export const templates = () => database().collection<TemplateDoc>("mail_templates");
export const campaigns = () => database().collection<CampaignDoc>("mail_campaigns");
export const ideas = () => database().collection<IdeaDoc>("marketing_ideas");

let indexed: Promise<unknown> | null = null;
/** The indexes (also made by scripts/migrate.mjs), made once per server on first use. */
export function ensureMarketingIndexes() {
  indexed ??= Promise.all([
    subscribers().createIndexes([
      { key: { email: 1 }, name: "email_unique", unique: true },
      { key: { sid: 1 }, name: "sid_unique", unique: true },
      { key: { status: 1, priority: 1, seq: 1 }, name: "audience" },
      { key: { createdAt: -1 }, name: "created" },
    ]),
    campaigns().createIndexes([{ key: { status: 1, scheduledAt: 1 }, name: "due" }]),
    ideas().createIndexes([{ key: { stage: 1, updatedAt: -1 }, name: "board" }]),
  ]).catch((e) => {
    indexed = null;
    console.error("[marketing] indexes", e);
  });
  return indexed;
}

async function soft<T>(what: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[marketing] ${what} couldn't be read`, e);
    return fallback;
  }
}

/* ---------- subscribers ---------- */

const nextSeq = async () => (await counters().findOneAndUpdate({ _id: "subscribers" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" }))!.seq;

/** What each email has done with the desk, from the inquiries (spam left out). Emails compared in lower case. */
export async function buyerHistories(emails?: string[]): Promise<Map<string, BuyerHistory>> {
  const rows = await inquiries()
    .aggregate<{ _id: string; n: number; quoted: number; won: number; pairs: number; last: Date }>([
      { $match: { status: { $ne: "spam" } } },
      { $project: { e: { $toLower: "$email" }, status: 1, pairs: 1, createdAt: 1 } },
      ...(emails ? [{ $match: { e: { $in: emails } } }] : []),
      {
        $group: {
          _id: "$e",
          n: { $sum: 1 },
          quoted: { $sum: { $cond: [{ $in: ["$status", ["quoted", "won"]] }, 1, 0] } },
          won: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
          pairs: { $sum: "$pairs" },
          last: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();
  const now = Date.now();
  return new Map(
    rows.map((r) => [r._id, { inquiries: r.n, quoted: r.quoted, won: r.won, pairs: r.pairs ?? 0, lastInquiryDays: Math.floor((now - r.last.getTime()) / DAY) }]),
  );
}
const NO_HISTORY: BuyerHistory = { inquiries: 0, quoted: 0, won: 0, pairs: 0, lastInquiryDays: null };

export type NewSubscriber = { email: string; source: SubscriberSource; name?: string; company?: string; country?: string; tags?: string[]; notes?: string; priority?: Priority };

/**
 * Adds someone to the list, or updates them if they're on it: missing details are filled in and tags added. Someone who
 * unsubscribed is only put back when they sign up again themselves (a signup form), never by an import or the desk.
 * Returns the subscriber id and whether they're new.
 */
export async function recordSubscriber(input: NewSubscriber): Promise<{ sid: string; created: boolean }> {
  await ensureMarketingIndexes();
  const email = normalEmail(input.email);
  if (!isEmail(email)) throw new Error("invalid email");
  const tags = cleanTags(input.tags ?? []);
  const now = new Date();
  const selfSignup = input.source === "line-sheet" || input.source === "talk-to-desk";

  const existing = await subscribers().findOne({ email });
  if (existing) {
    const set: Partial<SubscriberDoc> = { updatedAt: now };
    if (input.name && !existing.name) set.name = input.name;
    if (input.company && !existing.company) set.company = input.company;
    if (input.country && !existing.country) set.country = input.country;
    if (selfSignup && existing.status === "unsubscribed") Object.assign(set, { status: "subscribed", unsubscribedAt: null });
    await subscribers().updateOne({ _id: existing._id }, { $set: set, ...(tags.length && { $addToSet: { tags: { $each: tags } } }) });
    return { sid: existing.sid, created: false };
  }

  const history = (await buyerHistories([email]).catch(() => new Map<string, BuyerHistory>())).get(email) ?? NO_HISTORY;
  const score = scoreSubscriber(history, input.source);
  const seq = await nextSeq();
  const doc: SubscriberDoc = {
    sid: subscriberId(seq),
    seq,
    email,
    ...(input.name && { name: input.name }),
    ...(input.company && { company: input.company }),
    ...(input.country && { country: input.country }),
    ...(input.notes && { notes: input.notes }),
    source: input.source,
    tags,
    score,
    priority: input.priority ?? priorityFromScore(score),
    priorityLocked: !!input.priority,
    status: "subscribed",
    createdAt: now,
    updatedAt: now,
    unsubscribedAt: null,
    lastSentAt: null,
    sent: 0,
  };
  try {
    await subscribers().insertOne(doc);
    return { sid: doc.sid, created: true };
  } catch (e) {
    // the same address signing up twice at once: the other insert won, so update that one instead
    if ((e as { code?: number }).code === 11000) return recordSubscriber(input);
    throw e;
  }
}

/** Re-scores everyone from the inquiries and moves the tier of anyone not set by hand. Returns how many changed. */
export async function refreshScores(): Promise<number> {
  await ensureMarketingIndexes();
  const [subs, histories] = await Promise.all([
    subscribers().find({}, { projection: { email: 1, source: 1, createdAt: 1, score: 1, priority: 1, priorityLocked: 1 } }).toArray(),
    buyerHistories(),
  ]);
  const now = Date.now();
  const ops = subs.flatMap((s) => {
    const score = scoreSubscriber(histories.get(s.email) ?? NO_HISTORY, s.source, Math.floor((now - s.createdAt.getTime()) / DAY));
    const priority = s.priorityLocked ? s.priority : priorityFromScore(score);
    return score === s.score && priority === s.priority ? [] : [{ updateOne: { filter: { _id: s._id }, update: { $set: { score, priority } } } }];
  });
  for (let i = 0; i < ops.length; i += 500) await subscribers().bulkWrite(ops.slice(i, i + 500), { ordered: false });
  return ops.length;
}

/** Takes an address off the list (an unsubscribe link, or the desk). Returns false when there's no such subscriber. */
export async function setSubscriberStatus(by: { sid: string } | { id: ObjectId }, status: SubscriberStatus) {
  const filter = "sid" in by ? { sid: by.sid } : { _id: by.id };
  const r = await subscribers().updateOne(filter, { $set: { status, updatedAt: new Date(), unsubscribedAt: status === "unsubscribed" ? new Date() : null } });
  return r.matchedCount > 0;
}

/** Buyers who sent an inquiry (not spam) and aren't on the list, newest first: all of them, or only `emails`. */
export async function inquiriesEmailsNotSubscribed(emails?: string[]) {
  return inquiries()
    .aggregate<{ email: string; company: string; country: string }>([
      { $match: { status: { $ne: "spam" } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { $toLower: "$email" }, company: { $first: "$company" }, country: { $first: "$country" } } },
      ...(emails ? [{ $match: { _id: { $in: emails } } }] : []),
      { $lookup: { from: "subscribers", localField: "_id", foreignField: "email", as: "sub" } },
      { $match: { sub: { $size: 0 } } },
      { $limit: 1000 },
      { $project: { _id: 0, email: "$_id", company: 1, country: { $cond: [{ $eq: ["$country", "Not given"] }, null, "$country"] } } },
    ])
    .toArray()
    .then((rows) => rows.filter((r) => isEmail(r.email)).map((r) => ({ ...r, country: r.country || undefined })));
}

/** The Mongo filter for a campaign's audience. */
export const audienceFilter = (a: Audience): Filter<SubscriberDoc> => ({
  status: "subscribed",
  ...(a.priorities.length && { priority: { $in: a.priorities } }),
  ...(a.tags.length && { tags: { $in: a.tags } }),
});

/* ---------- the panel's read ---------- */

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const LIST_CAP = 5000;

function serialSubscriber(s: WithId<SubscriberDoc>) {
  return {
    id: s._id.toString(),
    sid: s.sid,
    email: s.email,
    name: s.name ?? "",
    company: s.company ?? "",
    country: s.country ?? "",
    source: s.source,
    tags: s.tags,
    score: s.score,
    priority: s.priority,
    priorityLocked: s.priorityLocked,
    status: s.status,
    notes: s.notes ?? "",
    createdAt: s.createdAt.toISOString(),
    lastSentAt: iso(s.lastSentAt),
    sent: s.sent,
  };
}
export type MarketingSubscriber = ReturnType<typeof serialSubscriber>;

function serialTemplate(t: WithId<TemplateDoc>) {
  return { id: t._id.toString(), name: t.name, kind: t.kind, subject: t.subject, preheader: t.preheader, body: t.body, updatedAt: t.updatedAt.toISOString(), updatedBy: t.updatedBy };
}
export type MarketingTemplate = ReturnType<typeof serialTemplate>;

function serialCampaign(c: WithId<CampaignDoc>) {
  return {
    id: c._id.toString(),
    name: c.name,
    templateId: c.templateId?.toString() ?? null,
    subject: c.subject,
    preheader: c.preheader,
    body: c.body,
    audience: c.audience,
    status: c.status,
    scheduledAt: iso(c.scheduledAt),
    sentAt: iso(c.sentAt),
    createdAt: c.createdAt.toISOString(),
    createdBy: c.createdBy,
    stats: c.stats,
    lastError: c.lastError,
  };
}
export type MarketingCampaign = ReturnType<typeof serialCampaign>;

function serialIdea(i: WithId<IdeaDoc>) {
  return {
    id: i._id.toString(),
    title: i.title,
    kind: i.kind,
    channel: i.channel,
    stage: i.stage,
    priority: i.priority,
    owner: i.owner,
    due: i.due,
    notes: i.notes,
    link: i.link,
    updatedAt: i.updatedAt.toISOString(),
    createdBy: i.createdBy,
  };
}
export type MarketingIdea = ReturnType<typeof serialIdea>;

/** Everything the Marketing view shows. */
export async function marketingData() {
  if (!dbReady()) return null;
  await ensureMarketingIndexes();
  const since = new Date(Date.now() - 30 * DAY);
  const [subs, total, tpl, camps, growth, buyers] = await Promise.all([
    soft("subscribers", [], () => subscribers().find({}).sort({ score: -1, seq: 1 }).limit(LIST_CAP).toArray()),
    soft("subscriber count", 0, () => subscribers().estimatedDocumentCount()),
    soft("mail models", [], () => templates().find({}).sort({ updatedAt: -1 }).limit(200).toArray()),
    soft("campaigns", [], () => campaigns().find({}).sort({ createdAt: -1 }).limit(200).toArray()),
    soft("growth", [], () =>
      subscribers()
        .aggregate<{ _id: string; n: number }>([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
        ])
        .toArray(),
    ),
    // buyers who sent an inquiry but aren't on the list yet
    soft("buyers", [], () =>
      inquiries()
        .aggregate<{ _id: string; company: string; country: string; ref: string; status: string; at: Date; n: number }>([
          { $match: { status: { $ne: "spam" } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: { $toLower: "$email" }, company: { $first: "$company" }, country: { $first: "$country" }, ref: { $first: "$ref" }, status: { $first: "$status" }, at: { $first: "$createdAt" }, n: { $sum: 1 } } },
          { $lookup: { from: "subscribers", localField: "_id", foreignField: "email", as: "sub" } },
          { $match: { sub: { $size: 0 } } },
          { $sort: { at: -1 } },
          { $limit: 100 },
          { $project: { sub: 0 } },
        ])
        .toArray(),
    ),
  ]);
  const byDay = new Map(growth.map((g) => [g._id, g.n]));
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * DAY).toISOString().slice(0, 10));
  return {
    subscribers: subs.map(serialSubscriber),
    total,
    capped: total > subs.length,
    templates: tpl.map(serialTemplate),
    campaigns: camps.map(serialCampaign),
    growth: days.map((d) => ({ day: d, n: byDay.get(d) ?? 0 })),
    buyers: buyers.map((b) => ({ email: b._id, company: b.company, country: b.country, ref: b.ref, status: b.status, at: b.at.toISOString(), inquiries: b.n })),
  };
}
export type MarketingData = NonNullable<Awaited<ReturnType<typeof marketingData>>>;

/** The ideas board, and the campaigns for the content calendar. */
export async function socialData() {
  if (!dbReady()) return null;
  await ensureMarketingIndexes();
  const [board, camps] = await Promise.all([
    soft("ideas", [], () => ideas().find({}).sort({ updatedAt: -1 }).limit(500).toArray()),
    soft("campaigns", [], () =>
      campaigns()
        .find({ status: { $in: ["scheduled", "sending", "sent"] } }, { projection: { name: 1, status: 1, scheduledAt: 1, sentAt: 1 } })
        .sort({ scheduledAt: -1 })
        .limit(100)
        .toArray(),
    ),
  ]);
  return {
    ideas: board.map(serialIdea),
    campaigns: camps.map((c) => ({ id: c._id.toString(), name: c.name, status: c.status, at: iso(c.scheduledAt ?? c.sentAt) })),
  };
}
export type SocialData = NonNullable<Awaited<ReturnType<typeof socialData>>>;
