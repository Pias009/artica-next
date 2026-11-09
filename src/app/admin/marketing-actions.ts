"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin/auth";
import type { SaveResult } from "./content-actions";
import { dbReady } from "@/lib/leads/db";
import { sendMailBatch } from "@/lib/leads/mail";
import {
  CHANNELS,
  cleanTags,
  IDEA_KINDS,
  IDEA_PRIORITIES,
  IDEA_STAGES,
  isEmail,
  parseImport,
  PRIORITIES,
  STARTER_TEMPLATES,
  TEMPLATE_KINDS,
} from "@/lib/marketing/model";
import { buildEmail, runDueCampaigns, sendingBlockers } from "@/lib/marketing/send";
import { audienceFilter, campaigns, ensureMarketingIndexes, ideas, inquiriesEmailsNotSubscribed, recordSubscriber, refreshScores, setSubscriberStatus, subscribers, templates } from "@/lib/marketing/store";

/*
 * The Marketing and Social views' saves. Each checks the admin, validates every field, writes the audit log, then
 * refreshes the panel. The site itself isn't touched (tracking tags save through content-actions, with the site's
 * other edits), except the unsubscribe page, which reads the list directly.
 */

const NO_DB: SaveResult = { ok: false, error: "No database is connected (MONGODB_URI), so nothing can be saved." };
const ok = (): SaveResult => ({ ok: true, at: new Date().toISOString() });
const fail = (error: string): SaveResult => ({ ok: false, error });
const text = (max: number) => z.string().trim().max(max);
const oid = z.string().regex(/^[a-f0-9]{24}$/, "Unknown item").transform((s) => new ObjectId(s));

async function run(what: string, detail: string | ((who: string) => string), fn: (who: { email: string; name: string }) => Promise<SaveResult | void>): Promise<SaveResult> {
  const { admin } = await requireAdmin();
  if (!dbReady()) return NO_DB;
  try {
    await ensureMarketingIndexes();
    const r = await fn(admin);
    if (r && !r.ok) return r;
    await audit({ adminId: admin._id, email: admin.email, action: what, detail: typeof detail === "string" ? detail : detail(admin.email) }).catch(() => {});
    revalidatePath("/admin/marketing");
    revalidatePath("/admin/social");
    return r ?? ok();
  } catch (e) {
    console.error(`[marketing] ${what} failed`, e);
    return fail("The database didn't accept the change. Try again in a moment.");
  }
}

function parse<T extends z.ZodType>(schema: T, input: unknown): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const r = schema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.issues[0]?.message ?? "Some fields aren't valid." };
}

/* ---------- subscribers ---------- */

const SubscriberInput = z.object({
  email: z.string().trim().toLowerCase().refine(isEmail, "Enter a valid email address."),
  name: text(80).optional(),
  company: text(120).optional(),
  country: text(60).optional(),
  tags: z.array(z.string()).max(20).optional(),
  notes: text(1000).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

/** Adds one subscriber by hand. */
export async function addSubscriberAction(input: unknown): Promise<SaveResult> {
  const p = parse(SubscriberInput, input);
  if (!p.ok) return fail(p.error);
  return run("subscriber_added", p.data.email, async () => {
    const { created } = await recordSubscriber({ ...p.data, source: "manual", tags: cleanTags(p.data.tags ?? []) });
    if (!created) return fail(`${p.data.email} is already on the list.`);
  });
}

const SubscriberEdit = z.object({
  id: oid,
  name: text(80),
  company: text(120),
  country: text(60),
  tags: z.array(z.string()).max(20),
  notes: text(1000),
  priority: z.enum(PRIORITIES),
  priorityLocked: z.boolean(),
});

/** Changes a subscriber's details, tags or priority (a priority set by hand stays until unlocked). */
export async function updateSubscriberAction(input: unknown): Promise<SaveResult> {
  const p = parse(SubscriberEdit, input);
  if (!p.ok) return fail(p.error);
  const { id, tags, ...rest } = p.data;
  return run("subscriber_updated", id.toString(), async () => {
    const r = await subscribers().updateOne({ _id: id }, { $set: { ...rest, tags: cleanTags(tags), updatedAt: new Date() } });
    if (!r.matchedCount) return fail("That subscriber is gone. Refresh the page.");
  });
}

/** Sets the priority of several subscribers at once, locking it. */
export async function setPriorityAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ ids: z.array(oid).min(1).max(5000), priority: z.enum(PRIORITIES) }), input);
  if (!p.ok) return fail(p.error);
  return run("subscriber_priority", `${p.data.ids.length} → ${p.data.priority}`, async () => {
    await subscribers().updateMany({ _id: { $in: p.data.ids } }, { $set: { priority: p.data.priority, priorityLocked: true, updatedAt: new Date() } });
  });
}

/** Unsubscribes or re-subscribes. Re-subscribing is for people who asked to come back. */
export async function setSubscriberStatusAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ ids: z.array(oid).min(1).max(5000), status: z.enum(["subscribed", "unsubscribed"]) }), input);
  if (!p.ok) return fail(p.error);
  return run("subscriber_status", `${p.data.ids.length} → ${p.data.status}`, async () => {
    for (const id of p.data.ids) await setSubscriberStatus({ id }, p.data.status);
  });
}

/** Deletes subscribers for good (a data deletion request). */
export async function deleteSubscribersAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ ids: z.array(oid).min(1).max(5000) }), input);
  if (!p.ok) return fail(p.error);
  return run("subscriber_deleted", `${p.data.ids.length}`, async () => {
    await subscribers().deleteMany({ _id: { $in: p.data.ids } });
  });
}

/** Pasted rows: "email, company, country, tags". Returns how many were added. */
export async function importSubscribersAction(input: unknown): Promise<SaveResult & { added?: number; skipped?: number }> {
  const p = parse(z.object({ text: z.string().max(500_000), tags: z.array(z.string()).max(10).optional() }), input);
  if (!p.ok) return fail(p.error);
  const { rows, skipped } = parseImport(p.data.text);
  if (!rows.length) return fail("No valid email addresses found. Put one per line.");
  let added = 0;
  const r = await run("subscribers_imported", () => `${rows.length} rows`, async () => {
    const extra = cleanTags(p.data.tags ?? []);
    for (const row of rows) {
      const { created } = await recordSubscriber({ ...row, tags: [...row.tags, ...extra], source: "import" });
      if (created) added++;
    }
  });
  return r.ok ? { ...r, added, skipped: skipped + (rows.length - added) } : r;
}

/** Adds buyers who sent an inquiry but aren't on the list (all of them, or the emails given). */
export async function importBuyersAction(input: unknown): Promise<SaveResult & { added?: number }> {
  const p = parse(z.object({ emails: z.array(z.string().trim().toLowerCase()).max(1000).optional() }), input);
  if (!p.ok) return fail(p.error);
  let added = 0;
  const r = await run("subscribers_from_inquiries", "buyers", async () => {
    const buyers = await inquiriesEmailsNotSubscribed(p.data.emails?.filter(isEmail));
    for (const b of buyers) {
      const { created } = await recordSubscriber({ email: b.email, company: b.company, country: b.country, source: "inquiry", tags: ["buyer"] });
      if (created) added++;
    }
    await refreshScores();
  });
  return r.ok ? { ...r, added } : r;
}

/** Re-scores every subscriber from the inquiries. */
export async function refreshScoresAction(): Promise<SaveResult & { changed?: number }> {
  let changed = 0;
  const r = await run("subscriber_scores", "recalculated", async () => {
    changed = await refreshScores();
  });
  return r.ok ? { ...r, changed } : r;
}

/* ---------- mail models ---------- */

const TemplateInput = z.object({
  id: oid.optional(),
  name: text(80).min(1, "Give the mail model a name."),
  kind: z.enum(TEMPLATE_KINDS),
  subject: text(200).min(1, "Write a subject line."),
  preheader: text(200),
  body: text(20_000).min(1, "Write the email."),
});

export async function saveTemplateAction(input: unknown): Promise<SaveResult & { id?: string }> {
  const p = parse(TemplateInput, input);
  if (!p.ok) return fail(p.error);
  const { id, ...fields } = p.data;
  let saved = id?.toString();
  const r = await run("mail_model_saved", fields.name, async (who) => {
    const now = new Date();
    if (id) {
      const u = await templates().updateOne({ _id: id }, { $set: { ...fields, updatedAt: now, updatedBy: who.email } });
      if (!u.matchedCount) return fail("That mail model is gone. Refresh the page.");
    } else {
      saved = (await templates().insertOne({ ...fields, createdAt: now, updatedAt: now, updatedBy: who.email })).insertedId.toString();
    }
  });
  return r.ok ? { ...r, id: saved } : r;
}

export async function deleteTemplateAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ id: oid }), input);
  if (!p.ok) return fail(p.error);
  return run("mail_model_deleted", p.data.id.toString(), async () => {
    await templates().deleteOne({ _id: p.data.id });
  });
}

/** The four starter models (skipping any whose name is taken). */
export async function seedTemplatesAction(): Promise<SaveResult> {
  return run("mail_models_seeded", "starters", async (who) => {
    const taken = new Set((await templates().find({}, { projection: { name: 1 } }).toArray()).map((t) => t.name));
    const now = new Date();
    const fresh = STARTER_TEMPLATES.filter((t) => !taken.has(t.name)).map((t) => ({ ...t, createdAt: now, updatedAt: now, updatedBy: who.email }));
    if (fresh.length) await templates().insertMany(fresh);
  });
}

/** Sends a mail model, filled in with sample details, to the signed-in admin. */
export async function sendTestAction(input: unknown): Promise<SaveResult> {
  const p = parse(TemplateInput.omit({ id: true, name: true, kind: true }), input);
  if (!p.ok) return fail(p.error);
  const { admin } = await requireAdmin();
  const blockers = sendingBlockers();
  if (blockers.length) return fail(`To send email, set ${blockers.join(" and ")}.`);
  const mail = buildEmail(p.data, { sid: "SUB-00000", email: admin.email, name: admin.name, company: "Your Store Ltd", country: "United Kingdom" });
  const error = await sendMailBatch([{ ...mail, subject: `[Test] ${mail.subject}` }], `test-${crypto.randomUUID()}`);
  if (error) {
    console.error("[marketing] test email failed", error);
    return fail(`Resend refused the test email: ${error.slice(0, 160)}`);
  }
  return ok();
}

/* ---------- the mail schedule ---------- */

const CampaignInput = z.object({
  id: oid.optional(),
  name: text(100).min(1, "Give the campaign a name."),
  templateId: oid,
  subject: text(200).optional(),
  audience: z.object({ priorities: z.array(z.enum(PRIORITIES)).max(4), tags: z.array(z.string()).max(10) }),
  /** ISO time; null with `schedule` false keeps it as a draft. */
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
  mode: z.enum(["draft", "schedule", "now"]),
});

export async function saveCampaignAction(input: unknown): Promise<SaveResult & { id?: string }> {
  const p = parse(CampaignInput, input);
  if (!p.ok) return fail(p.error);
  const { id, templateId, mode, audience, ...fields } = p.data;
  if (mode !== "draft") {
    const blockers = sendingBlockers();
    if (blockers.length) return fail(`To schedule email, set ${blockers.join(" and ")}. You can save it as a draft meanwhile.`);
  }
  const when = mode === "now" ? new Date() : fields.scheduledAt ? new Date(fields.scheduledAt) : null;
  if (mode === "schedule" && (!when || when.getTime() < Date.now() - 60_000)) return fail("Pick a time in the future, or send it now.");
  let saved = id?.toString();
  const r = await run(mode === "draft" ? "campaign_saved" : "campaign_scheduled", fields.name, async (who) => {
    const tpl = await templates().findOne({ _id: templateId });
    if (!tpl) return fail("That mail model is gone. Pick another one.");
    const clean = { priorities: audience.priorities, tags: cleanTags(audience.tags) };
    if (mode !== "draft" && !(await subscribers().countDocuments(audienceFilter(clean), { limit: 1 })))
      return fail("Nobody on the list matches that audience. Widen the tiers or tags.");
    const now = new Date();
    const doc = {
      name: fields.name,
      templateId,
      subject: fields.subject || tpl.subject,
      preheader: tpl.preheader,
      body: tpl.body,
      audience: clean,
      status: mode === "draft" ? ("draft" as const) : ("scheduled" as const),
      scheduledAt: when,
      updatedAt: now,
    };
    if (id) {
      const u = await campaigns().updateOne({ _id: id, status: { $in: ["draft", "scheduled", "cancelled"] } }, { $set: { ...doc, cursor: 0, errors: 0, stats: { targeted: 0, sent: 0, failed: 0 }, lastError: null } });
      if (!u.matchedCount) return fail("That campaign has already started sending, so it can't be changed.");
    } else {
      saved = (
        await campaigns().insertOne({
          ...doc,
          createdAt: now,
          createdBy: who.email,
          sentAt: null,
          lockedUntil: null,
          cursor: 0,
          errors: 0,
          stats: { targeted: 0, sent: 0, failed: 0 },
          lastError: null,
        })
      ).insertedId.toString();
    }
  });
  if (r.ok && mode === "now" && saved) {
    const target = new ObjectId(saved);
    after(() => runDueCampaigns({ id: target, budget: 5000 }).catch((e) => console.error("[campaign] send now failed; the next run retries", e)));
  }
  return r.ok ? { ...r, id: saved } : r;
}

/** Cancel (stops a scheduled or sending campaign where it is), send now, or retry a failed one. */
export async function campaignCommandAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ id: oid, command: z.enum(["cancel", "send-now", "retry", "delete", "duplicate"]) }), input);
  if (!p.ok) return fail(p.error);
  const { id, command } = p.data;
  if ((command === "send-now" || command === "retry") && sendingBlockers().length) return fail(`To send email, set ${sendingBlockers().join(" and ")}.`);
  const r = await run(`campaign_${command}`, id.toString(), async (who) => {
    const c = await campaigns().findOne({ _id: id });
    if (!c) return fail("That campaign is gone. Refresh the page.");
    const now = new Date();
    if (command === "cancel") {
      if (!["scheduled", "sending", "draft"].includes(c.status)) return fail("Only a draft, scheduled or sending campaign can be cancelled.");
      await campaigns().updateOne({ _id: id }, { $set: { status: "cancelled", lockedUntil: null, updatedAt: now } });
    } else if (command === "send-now" || command === "retry") {
      if (!["draft", "scheduled", "failed", "cancelled"].includes(c.status)) return fail("That campaign is already sending or sent.");
      // a retry carries on from where it stopped; sending a draft or cancelled one starts from the top
      const fresh = command === "retry" ? { errors: 0, lastError: null } : { cursor: 0, errors: 0, lastError: null, stats: { targeted: 0, sent: 0, failed: 0 } };
      await campaigns().updateOne({ _id: id }, { $set: { status: "scheduled", scheduledAt: now, lockedUntil: null, updatedAt: now, ...fresh } });
    } else if (command === "delete") {
      if (c.status === "sending") return fail("Cancel it first: it's sending.");
      await campaigns().deleteOne({ _id: id });
    } else {
      const { _id, ...rest } = c;
      void _id;
      await campaigns().insertOne({
        ...rest,
        name: `${c.name} (copy)`.slice(0, 100),
        status: "draft",
        scheduledAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: who.email,
        sentAt: null,
        lockedUntil: null,
        cursor: 0,
        errors: 0,
        stats: { targeted: 0, sent: 0, failed: 0 },
        lastError: null,
      });
    }
  });
  if (r.ok && (command === "send-now" || command === "retry")) after(() => runDueCampaigns({ id, budget: 5000 }).catch((e) => console.error("[campaign] send failed; the next run retries", e)));
  return r;
}

/* ---------- the ideas board ---------- */

const IdeaInput = z.object({
  id: oid.optional(),
  title: text(140).min(1, "Give it a title."),
  kind: z.enum(IDEA_KINDS),
  channel: z.enum(CHANNELS),
  stage: z.enum(IDEA_STAGES),
  priority: z.enum(IDEA_PRIORITIES),
  owner: text(60),
  due: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
    .nullable(),
  notes: text(4000),
  link: text(500).refine((v) => !v || /^https?:\/\//.test(v), "Links start with https://"),
});

export async function saveIdeaAction(input: unknown): Promise<SaveResult & { id?: string }> {
  const p = parse(IdeaInput, input);
  if (!p.ok) return fail(p.error);
  const { id, ...fields } = p.data;
  let saved = id?.toString();
  const r = await run("idea_saved", fields.title, async (who) => {
    const now = new Date();
    if (id) {
      const u = await ideas().updateOne({ _id: id }, { $set: { ...fields, updatedAt: now } });
      if (!u.matchedCount) return fail("That card is gone. Refresh the page.");
    } else saved = (await ideas().insertOne({ ...fields, createdAt: now, updatedAt: now, createdBy: who.email })).insertedId.toString();
  });
  return r.ok ? { ...r, id: saved } : r;
}

export async function moveIdeaAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ id: oid, stage: z.enum(IDEA_STAGES) }), input);
  if (!p.ok) return fail(p.error);
  return run("idea_moved", `${p.data.id} → ${p.data.stage}`, async () => {
    await ideas().updateOne({ _id: p.data.id }, { $set: { stage: p.data.stage, updatedAt: new Date() } });
  });
}

export async function deleteIdeaAction(input: unknown): Promise<SaveResult> {
  const p = parse(z.object({ id: oid }), input);
  if (!p.ok) return fail(p.error);
  return run("idea_deleted", p.data.id.toString(), async () => {
    await ideas().deleteOne({ _id: p.data.id });
  });
}
