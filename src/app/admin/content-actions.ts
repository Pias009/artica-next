"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { CONTENT_TAG, readContent, saveContent } from "@/lib/content/store";
import { forgetRouting } from "@/lib/content/routing";
import type { SiteContent } from "@/lib/content/model";
import { HOME_SECTIONS } from "@/lib/home-sections";
import { dbReady } from "@/lib/leads/db";
import { setStatus } from "@/lib/leads/inquiries";
import { isDeskStatus } from "@/lib/leads/desk";
import { ProductsPayload } from "@/lib/admin/product-schema";
import { SEASON_IDS } from "@/lib/season";
import { SITE_PAGES } from "@/lib/site-pages";

/*
 * Saving from the admin panel's views. Each action checks the session, validates every field (unknown styles, pages
 * or sections are refused, text is trimmed and capped), saves, writes the audit log, then expires the cached content
 * and every page so the site shows the change on the next visit.
 */

export type SaveResult = { ok: true; at: string } | { ok: false; error: string };

const text = (max: number) => z.string().trim().max(max);
const season = z.enum(SEASON_IDS);
/** A photo on the site (public/images), one uploaded in the panel, or one on the site's Cloudinary. */
const IMAGE_SRC = /^(\/images\/[\w./-]+|\/api\/img\/[a-f0-9]{24}|https:\/\/res\.cloudinary\.com\/doulxmmm\/image\/upload\/[\w./,-]+)$/;
const PATHS = new Set(SITE_PAGES.map((p) => p.path.split("?")[0]));
const SECTION_IDS = new Set<string>(HOME_SECTIONS.map((s) => s.id));

const PageEdit = z.object({
  published: z.boolean().optional(),
  title: text(70).optional(),
  description: text(170).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().refine((id) => SECTION_IDS.has(id), "Unknown section"),
        visible: z.boolean(),
        title: text(90).optional(),
        sub: text(200).optional(),
      }),
    )
    .max(40)
    .optional(),
  // any page's intro and section words, by "<heading id>.title|sub", and the sections hidden (by heading id); on the
  // home page also each section's photos ("<section>.img-<k>": a site photo or one uploaded here) and the styles it
  // names ("<section>.style-<k>": a style's address, or "none")
  copy: z
    .record(z.string().regex(/^[\w-]{1,40}(\.[\w-]{1,40}){1,3}$/, "Unknown text"), text(600))
    .refine((r) => Object.keys(r).length <= 600, "Too many changes on one page")
    .refine((r) => Object.entries(r).every(([k, v]) => !/\.img-[\w-]+$/.test(k) || IMAGE_SRC.test(v)), "Use a site photo or one uploaded here")
    .refine((r) => Object.entries(r).every(([k, v]) => !/\.style-[\w-]+$/.test(k) || /^[a-z0-9-]{1,60}$/.test(v)), "Unknown style")
    .optional(),
  hidden: z.array(z.string().regex(/^[\w-]{1,40}$/)).max(40).optional(),
});
const Pages = z.record(z.string(), PageEdit).refine((r) => Object.keys(r).every((p) => PATHS.has(p)), "Unknown page");

const Seasons = z.object({
  auto: z.boolean(),
  fallback: season,
  campaigns: z.partialRecord(season, z.object({ live: z.boolean() })),
});
const Controls = z.object({ effects: z.boolean(), campaign: z.boolean() });
const Settings = z.object({
  contact: z.object({
    email: z.union([z.literal(""), z.email().max(120)]).optional(),
    phone: text(40).optional(),
    hours: text(60).optional(),
  }),
  alerts: z.object({
    notifyNew: z.boolean(),
    notifyOverdue: z.boolean(),
    weekly: z.boolean(),
  }),
});
const Assistant = z.object({
  trade: z.boolean(),
  plan: z.boolean(),
  model: z.boolean(),
  tone: z.enum(["plain", "warm", "formal"]),
});

async function save<T extends z.ZodType>(schema: T, input: unknown, what: string, toPatch: (v: z.infer<T>) => Partial<SiteContent>): Promise<SaveResult> {
  const { admin } = await requireAdmin();
  if (!dbReady())
    return {
      ok: false,
      error: "No database is connected (MONGODB_URI), so changes can't be saved.",
    };
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Some fields aren't valid.",
    };
  try {
    const patch = toPatch(parsed.data);
    await saveContent(patch, admin.email, what);
    await audit({
      adminId: admin._id,
      email: admin.email,
      action: "content_saved",
      detail: what,
    });
  } catch (e) {
    console.error("[admin] save failed", e);
    return {
      ok: false,
      error: "The database didn't accept the change. Try again in a moment.",
    };
  }
  updateTag(CONTENT_TAG);
  forgetRouting();
  // every page of the site may show the change (products appear on most of them)
  revalidatePath("/", "layout");
  return { ok: true, at: new Date().toISOString() };
}

/** Only what differs from the site as built is stored: an empty edit is dropped. */
const compact = <V extends object>(r: Record<string, V>) =>
  Object.fromEntries(Object.entries(r).filter(([, v]) => Object.values(v).some((x) => x !== undefined)));

const ids = (max: number) => z.array(z.string().regex(/^[\w-]{1,40}$/, "Unknown style")).max(max);
const Merch = z.object({ hot: ids(12), arrivals: ids(10), order: ids(500), seasonEdit: z.partialRecord(season, ids(6)).optional() });

/**
 * The home page's Hot products, New arrivals and each season's edit, and the featured order (Pages → Home, Products →
 * Arrange). A season's edit left empty goes back to the season's own picks.
 */
export async function saveMerchAction(merch: unknown) {
  return save(Merch, merch, "arrangement", (v) => {
    const seasonEdit = Object.fromEntries(Object.entries(v.seasonEdit ?? {}).flatMap(([s, list]) => (list?.length ? [[s, [...new Set(list)]]] : [])));
    return { merch: { hot: [...new Set(v.hot)], arrivals: [...new Set(v.arrivals)], order: [...new Set(v.order)], seasonEdit } };
  });
}

const words = (max: number) => z.string().trim().max(max).optional();
const SeasonCopyEdit = z.object({
  hero: z.object({ eyebrowBadge: words(40), headlineLead: words(60), headlineAccent: words(60), description: words(160) }).optional(),
  campaign: z
    .object({
      seasonTag: words(30),
      headlineLead: words(70),
      headlineAccent: words(70),
      description: words(200),
      accentColor: z.union([z.literal(""), z.string().regex(/^#[0-9a-f]{6}$/i, "Accent colour must be like #f2c9ea")]).optional(),
      image: z.union([z.literal(""), z.string().regex(IMAGE_SRC, "Use a site photo or one uploaded here")]).optional(),
      alt: words(200),
      wornSlugs: z.array(z.string().regex(/^[a-z0-9-]{1,60}$/)).max(4).optional(),
    })
    .optional(),
});
const SeasonCopy = z.partialRecord(season, SeasonCopyEdit);

/** Each season's hero and campaign words and photo (Seasons). Only filled fields are kept. */
export async function saveSeasonCopyAction(copy: unknown) {
  return save(SeasonCopy, copy, "season words", (v) => {
    // the headline's first part runs into its coloured end: it keeps the space between them
    const spaced = (k: string, x: unknown) => (k === "headlineLead" && typeof x === "string" && x && !/\s$/.test(x) ? `${x} ` : x);
    const clean = (o?: Record<string, unknown>) =>
      o ? Object.fromEntries(Object.entries(o).filter(([, x]) => (Array.isArray(x) ? x.length : x !== undefined && x !== "")).map(([k, x]) => [k, spaced(k, x)])) : undefined;
    const out = Object.fromEntries(
      Object.entries(v).flatMap(([id, c]) => {
        const hero = clean(c?.hero);
        const campaign = clean(c?.campaign);
        const keep = { ...(hero && Object.keys(hero).length && { hero }), ...(campaign && Object.keys(campaign).length && { campaign }) };
        return Object.keys(keep).length ? [[id, keep]] : [];
      }),
    );
    return { seasonCopy: out as SiteContent["seasonCopy"] };
  });
}

export async function saveProductsAction(payload: unknown) {
  return save(ProductsPayload, payload, "products", (v) => {
    // through JSON so a field left out stays out, rather than reaching the database as null
    const { edits, added } = JSON.parse(JSON.stringify(v)) as typeof v;
    return { products: compact(edits) as SiteContent["products"], added: added as SiteContent["added"] };
  });
}
export async function savePagesAction(edits: unknown) {
  return save(Pages, edits, "pages", (v) => ({ pages: compact(v) }));
}
export async function saveSeasonsAction(seasons: unknown) {
  return save(Seasons, seasons, "seasons", (v) => ({ seasons: v }));
}
export async function saveControlsAction(controls: unknown) {
  return save(Controls, controls, "site controls", (v) => ({ controls: v }));
}
export async function saveSettingsAction(settings: unknown) {
  return save(Settings, settings, "settings", (v) => ({
    contact: v.contact,
    alerts: v.alerts,
  }));
}
export async function saveAssistantAction(assistant: unknown) {
  return save(Assistant, assistant, "assistant", (v) => ({ assistant: v }));
}

/** The dashboard's pipeline: move an inquiry to another stage. */
const price = z.number().positive().max(10_000).optional();
const PriceRow = z.object({ t300: price, t600: price, t1000: price });
const Prices = z.record(z.string().regex(/^[\w-]{1,40}$/, "Unknown style"), PriceRow).refine((r) => Object.keys(r).length <= 500, "Too many styles");

/**
 * Prices for some styles (the rest keep theirs): saved straight away, private. A row with no prices clears that
 * style's. Nothing on the public site changes, so only the panel is refreshed.
 */
export async function savePricesAction(rows: unknown): Promise<SaveResult> {
  const { admin } = await requireAdmin();
  if (!dbReady()) return { ok: false, error: "No database is connected (MONGODB_URI), so prices can't be saved." };
  const parsed = Prices.safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Some prices aren't valid." };
  const { prices } = await readContent();
  const next = { ...prices };
  for (const [id, row] of Object.entries(parsed.data)) {
    const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => !!v).map(([k, v]) => [k, Math.round(v! * 100) / 100]));
    if (Object.keys(clean).length) next[id] = clean;
    else next[id] = {};
  }
  const kept = Object.fromEntries(Object.entries(next).filter(([, r]) => Object.keys(r).length));
  try {
    await saveContent({ prices: kept }, admin.email, "prices");
    await audit({ adminId: admin._id, email: admin.email, action: "content_saved", detail: `prices (${Object.keys(parsed.data).length} styles)` });
  } catch (e) {
    console.error("[admin] prices not saved", e);
    return { ok: false, error: "The database didn't accept the change. Try again in a moment." };
  }
  updateTag(CONTENT_TAG);
  revalidatePath("/admin", "layout");
  return { ok: true, at: new Date().toISOString() };
}

const Avail = z.object({
  status: z.enum(["order", "stock", "production", "soldout"]),
  shipsFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.number().int().min(1).max(365).optional(),
  note: z.string().trim().max(120).optional(),
});
const Avails = z.record(z.string().regex(/^[\w-]{1,40}$/, "Unknown style"), Avail.nullable()).refine((r) => Object.keys(r).length <= 500, "Too many styles");

/** Availability for some styles (null: back to made to order), saved straight away and shown on the site. */
export async function saveAvailabilityAction(rows: unknown): Promise<SaveResult> {
  const { admin } = await requireAdmin();
  if (!dbReady()) return { ok: false, error: "No database is connected (MONGODB_URI), so this can't be saved." };
  const parsed = Avails.safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Some fields aren't valid." };
  const { availability } = await readContent();
  const next = { ...availability };
  for (const [id, a] of Object.entries(parsed.data)) {
    if (!a || (a.status === "order" && !a.days && !a.note)) delete next[id];
    else next[id] = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== "")) as typeof a;
  }
  try {
    await saveContent({ availability: next }, admin.email, "availability");
    await audit({ adminId: admin._id, email: admin.email, action: "content_saved", detail: `availability (${Object.keys(parsed.data).length} styles)` });
  } catch (e) {
    console.error("[admin] availability not saved", e);
    return { ok: false, error: "The database didn't accept the change. Try again in a moment." };
  }
  updateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
  return { ok: true, at: new Date().toISOString() };
}

export async function moveInquiryAction(ref: string, status: string): Promise<SaveResult> {
  const { admin } = await requireAdmin();
  if (!dbReady()) return { ok: false, error: "No database is connected." };
  if (!/^CL-\d{4}-\d{4,}$/.test(ref) || !isDeskStatus(status)) return { ok: false, error: "Unknown inquiry or stage." };
  const done = await setStatus(ref, status);
  if (!done) return { ok: false, error: "That inquiry wasn't found." };
  await audit({
    adminId: admin._id,
    email: admin.email,
    action: "status",
    ref,
    detail: status,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, at: new Date().toISOString() };
}
