"use server";

import { ObjectId } from "mongodb";
import { revalidatePath, updateTag } from "next/cache";
import { audit, requireAdmin } from "@/lib/admin/auth";
import { forgetRouting } from "@/lib/content/routing";
import { CONTENT_TAG, historyDoc, readContent, saveContent, type HistoryEntry } from "@/lib/content/store";
import type { SiteContent } from "@/lib/content/model";
import { dbReady } from "@/lib/leads/db";

/*
 * A style's history, from what each save replaced (content/store.ts): every change to its listing, visibility, prices
 * or availability, newest first, and putting the style back as it was before any one of them.
 */

const KEYS = ["products", "added", "prices", "availability"] as const;
type Key = (typeof KEYS)[number];
type State = Record<Key, unknown>;

const LABEL: Record<Key, string> = { products: "listing", added: "listing", prices: "prices", availability: "availability" };
const FIELD: Record<string, string> = { live: "shown/hidden", featured: "featured", name: "name", desc: "description", badge: "badge", seasons: "seasons", type: "type", outer: "main photo", zip: "second photo", materials: "materials", color: "colour", sizes: "sizes", sizeRun: "sizes", tags: "tags", rating: "rating", category: "category", line: "line", spec: "spec", scene: "backdrop" };

function pick(k: Key, block: unknown, id: string) {
  if (k === "added") return (Array.isArray(block) ? block : []).find((p: { id?: string }) => p?.id === id) ?? null;
  return (block as Record<string, unknown> | null)?.[id] ?? null;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function changed(k: Key, a: unknown, b: unknown): string[] {
  if (k === "prices" || k === "availability") return [LABEL[k]];
  const x = (a ?? {}) as Record<string, unknown>;
  const y = (b ?? {}) as Record<string, unknown>;
  if (k === "added" && (!a || !b)) return [a ? "deleted" : "added"];
  const fields = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((f) => !same(x[f], y[f]));
  return [...new Set(fields.map((f) => FIELD[f] ?? f))];
}

/** Walks the history back from now, for one style: each entry with its state before and after. */
async function walk(id: string) {
  const current = await readContent();
  const after: State = { products: pick("products", current.products, id), added: pick("added", current.added, id), prices: pick("prices", current.prices, id), availability: pick("availability", current.availability, id) };
  const entries = await historyDoc().find({}).sort({ at: -1 }).limit(400).toArray();
  const out: { e: HistoryEntry; before: State; fields: string[] }[] = [];
  for (const e of entries) {
    const before = { ...after };
    const fields: string[] = [];
    for (const k of KEYS) {
      if (!(k in e.before)) continue;
      before[k] = pick(k, e.before[k], id);
      if (!same(before[k], after[k])) fields.push(...changed(k, before[k], after[k]));
    }
    if (fields.length) out.push({ e, before: { ...before }, fields: [...new Set(fields)] });
    Object.assign(after, before);
  }
  return out;
}

export type StyleChange = { id: string; at: string; by: string; fields: string[] };

export async function styleHistoryAction(id: string): Promise<StyleChange[]> {
  await requireAdmin();
  if (!dbReady() || !/^[\w-]{1,40}$/.test(id)) return [];
  return (await walk(id)).slice(0, 50).map(({ e, fields }) => ({ id: String(e._id), at: e.at.toISOString(), by: e.by, fields }));
}

/** Puts the style back as it was just before change `entry`: its listing, visibility, prices and availability. */
export async function restoreStyleAction(id: string, entry: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { admin } = await requireAdmin();
  if (!dbReady() || !/^[\w-]{1,40}$/.test(id) || !ObjectId.isValid(entry)) return { ok: false, error: "Unknown change." };
  const found = (await walk(id)).find((x) => String(x.e._id) === entry);
  if (!found) return { ok: false, error: "That change is no longer in the history." };
  const c = await readContent();
  const b = found.before;
  const products = { ...c.products };
  if (b.products) products[id] = b.products as SiteContent["products"][string];
  else delete products[id];
  const prices = { ...c.prices };
  if (b.prices) prices[id] = b.prices as SiteContent["prices"][string];
  else delete prices[id];
  const availability = { ...c.availability };
  if (b.availability) availability[id] = b.availability as SiteContent["availability"][string];
  else delete availability[id];
  const others = c.added.filter((p) => p.id !== id);
  const added = b.added ? [...others, b.added as SiteContent["added"][number]] : others;
  await saveContent({ products, prices, availability, added }, admin.email, `restore ${id}`);
  await audit({ adminId: admin._id, email: admin.email, action: "content_saved", detail: `restored ${id} to before ${found.e.at.toISOString()}` });
  updateTag(CONTENT_TAG);
  forgetRouting();
  revalidatePath("/", "layout");
  return { ok: true };
}
