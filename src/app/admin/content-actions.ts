"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { CONTENT_TAG, saveContent } from "@/lib/content/store";
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
  // any page's intro and section words, by "<heading id>.title|sub", and the sections hidden (by heading id)
  copy: z
    .record(z.string().regex(/^[\w-]{1,40}\.(title|sub)$/, "Unknown text"), text(300))
    .refine((r) => Object.keys(r).length <= 80, "Too many changes on one page")
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
    await saveContent(patch, admin.email);
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
