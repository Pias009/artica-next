import "server-only";
import type { ObjectId, WithId } from "mongodb";
import { dbReady } from "../leads/db";
import { deskInbox, mailReady, sendMailBatch, type BulkMail } from "../leads/mail";
import { COMPANY } from "../company";
import { SITE_URL, absoluteUrl } from "../site";
import { emailHtml, renderTemplate, type MergeVars } from "./model";
import { audienceFilter, campaigns, subscribers, type CampaignDoc, type SubscriberDoc } from "./store";
import { unsubscribePath, unsubscribeReady } from "./unsubscribe";

/*
 * Sends the mail schedule. A campaign is due once its time has passed; a sender claims it with one atomic update (and
 * a 10-minute lock), walks its audience in subscriber order 100 at a time through Resend's batch endpoint, and writes
 * how far it got after each batch, so a crash or a timeout resumes where it stopped instead of starting over. Each
 * batch carries an idempotency key, so a batch retried after a lost response isn't sent twice.
 *
 * Who calls it: "Send now" in the panel, the daily cron, and visitor traffic (at most every two minutes per server),
 * so a scheduled campaign goes out within minutes of its time on any plan, and at the latest with the daily run.
 */

const BATCH = 100;
const LOCK_MS = 10 * 60_000;
const MAX_ERRORS = 5;

export const sendingReady = () => dbReady() && mailReady() && unsubscribeReady();

/** What's missing before campaigns can go out, in words for the panel; empty when nothing is. */
export function sendingBlockers() {
  const out: string[] = [];
  if (!dbReady()) out.push("a database (MONGODB_URI)");
  if (!mailReady()) out.push("email settings (RESEND_API_KEY, INQUIRY_TO, INQUIRY_FROM)");
  if (!unsubscribeReady()) out.push("a signing secret for unsubscribe links (MARKETING_SECRET, 16+ characters)");
  return out;
}

/** The merge values for one subscriber. */
export const varsFor = (s: Pick<SubscriberDoc, "sid" | "email" | "name" | "company" | "country">): MergeVars => ({
  company: s.company,
  first_name: s.name?.trim().split(/\s+/)[0],
  email: s.email,
  country: s.country,
  subscriber_id: s.sid,
  site_url: SITE_URL.replace(/\/$/, ""),
});

/** One campaign email for one subscriber, with its unsubscribe link and one-click headers. */
export function buildEmail(c: Pick<CampaignDoc, "subject" | "preheader" | "body">, s: Pick<SubscriberDoc, "sid" | "email" | "name" | "company" | "country">): BulkMail {
  const vars = varsFor(s);
  const unsubscribe = absoluteUrl(unsubscribePath(s.sid));
  const oneClick = absoluteUrl(unsubscribePath(s.sid).replace("/unsubscribe?", "/api/unsubscribe?"));
  const body = renderTemplate(c.body, vars);
  const desk = deskInbox()[0];
  return {
    to: s.email,
    subject: renderTemplate(c.subject, vars).replace(/\s+/g, " ").trim().slice(0, 200) || COMPANY.name,
    text: `${body}\n\n--\nYou get this because you joined the ${COMPANY.name} trade list.\nUnsubscribe: ${unsubscribe}`,
    html: emailHtml({ body, preheader: c.preheader ? renderTemplate(c.preheader, vars) : undefined, unsubscribeUrl: unsubscribe, company: COMPANY.name }),
    headers: {
      "List-Unsubscribe": `<${oneClick}>${desk ? `, <mailto:${desk}?subject=unsubscribe>` : ""}`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

async function claim(id?: ObjectId) {
  const now = new Date();
  return campaigns().findOneAndUpdate(
    {
      ...(id && { _id: id }),
      status: { $in: ["scheduled", "sending"] },
      scheduledAt: { $lte: now },
      $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
    },
    { $set: { status: "sending", lockedUntil: new Date(now.getTime() + LOCK_MS), updatedAt: now } },
    { sort: { scheduledAt: 1 }, returnDocument: "after" },
  );
}

/** Sends one claimed campaign, up to `budget` emails. Returns how many went out and failed. */
async function work(c: WithId<CampaignDoc>, budget: number) {
  const filter = audienceFilter(c.audience);
  if (!c.stats.targeted) {
    const targeted = await subscribers().countDocuments(filter);
    await campaigns().updateOne({ _id: c._id }, { $set: { "stats.targeted": targeted } });
  }
  let cursor = c.cursor ?? 0;
  let sent = 0;
  let failed = 0;
  while (sent + failed < budget) {
    const batch = await subscribers()
      .find({ ...filter, seq: { $gt: cursor } }, { projection: { sid: 1, seq: 1, email: 1, name: 1, company: 1, country: 1 } })
      .sort({ seq: 1 })
      .limit(Math.min(BATCH, budget - sent - failed))
      .toArray();
    if (!batch.length) {
      await campaigns().updateOne({ _id: c._id }, { $set: { status: "sent", sentAt: new Date(), lockedUntil: null, updatedAt: new Date() } });
      return { sent, failed };
    }
    const first = batch[0].seq;
    const last = batch[batch.length - 1].seq;
    const error = await sendMailBatch(
      batch.map((s) => buildEmail(c, s)),
      `campaign-${c._id}-${first}-${last}`,
    );
    // a repeat of a batch Resend already took (same key, audience changed since): it went out the first time
    const already = !!error && error.startsWith("409") && /idempoten/i.test(error);
    if (error && !already) {
      failed += batch.length;
      const errors = (c.errors ?? 0) + 1;
      console.error(`[campaign] ${c.name} batch ${first}-${last} failed (${errors}/${MAX_ERRORS}): ${error}`);
      await campaigns().updateOne(
        { _id: c._id },
        {
          $set: {
            errors,
            lastError: error,
            updatedAt: new Date(),
            // try again in 5 minutes; after too many failures stop and show it in the panel
            ...(errors >= MAX_ERRORS ? { status: "failed", lockedUntil: null } : { lockedUntil: new Date(Date.now() + 5 * 60_000) }),
          },
          $inc: { "stats.failed": batch.length },
        },
      );
      return { sent, failed };
    }
    cursor = last;
    sent += batch.length;
    await Promise.all([
      campaigns().updateOne({ _id: c._id }, { $set: { cursor, lockedUntil: new Date(Date.now() + LOCK_MS), updatedAt: new Date() }, $inc: { "stats.sent": batch.length } }),
      subscribers().updateMany({ _id: { $in: batch.map((s) => s._id) } }, { $set: { lastSentAt: new Date() }, $inc: { sent: 1 } }),
    ]);
  }
  // out of budget for this run: let go, and the next run carries on from the cursor
  await campaigns().updateOne({ _id: c._id }, { $set: { lockedUntil: null } });
  return { sent, failed };
}

/** Sends every campaign that's due (or just `id`), up to `budget` emails in all. */
export async function runDueCampaigns({ id, budget = 1000 }: { id?: ObjectId; budget?: number } = {}) {
  if (!sendingReady()) return { campaigns: 0, sent: 0, failed: 0 };
  let n = 0;
  let sent = 0;
  let failed = 0;
  while (sent + failed < budget) {
    const c = await claim(id);
    if (!c) break;
    n++;
    const r = await work(c, budget - sent - failed);
    sent += r.sent;
    failed += r.failed;
    if (id || r.failed) break;
  }
  return { campaigns: n, sent, failed };
}

let lastCheck = 0;
/** From visitor traffic: at most every two minutes per server, a cheap look for anything due, and send it. */
export async function maybeRunCampaigns() {
  if (!sendingReady() || Date.now() - lastCheck < 120_000) return;
  lastCheck = Date.now();
  try {
    const now = new Date();
    const due = await campaigns().findOne(
      { status: { $in: ["scheduled", "sending"] }, scheduledAt: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
      { projection: { _id: 1 } },
    );
    if (due) await runDueCampaigns({ budget: 500 });
  } catch (e) {
    console.error("[campaign] traffic run failed; the daily run retries", e);
  }
}
