/*
 * The admin panel's edits as the site renders them, on the server and in the browser alike.
 *
 * Server: content/store.ts loadContent() calls setLive() before rendering. Next.js keeps separate copies of modules for
 * server components and for server-rendering client components, so the edits live on globalThis, and every copy of a
 * module that applies them (products.ts, company.ts) registers with onLive() and is re-applied on each setLive().
 * Browser: the root layout prints the same edits into the page's head; live() reads them from there, so the browser
 * renders what the server did and hydration matches.
 */

import { CONTENT_ELEMENT, type PublicContent } from "./model";
import type { SeasonId } from "../season";

type Global = {
  __clLive?: PublicContent;
  __clAppliers?: Set<(c: PublicContent) => void>;
};
const G = globalThis as typeof globalThis & Global;
let fromPage: PublicContent | null | undefined;

/** The edits in force: null before the server has loaded them (or on a site with no database). */
export function live(): PublicContent | null {
  if (typeof document === "undefined") return G.__clLive ?? null;
  if (fromPage === undefined) {
    try {
      const text = document.getElementById(CONTENT_ELEMENT)?.textContent;
      fromPage = text ? (JSON.parse(text) as PublicContent) : null;
    } catch {
      fromPage = null;
    }
  }
  return fromPage;
}

/** Server only: the edits to render with from now on, applied to every module that uses them. */
export function setLive(c: PublicContent) {
  G.__clLive = c;
  for (const apply of G.__clAppliers ?? []) apply(c);
}

/** Runs `apply` with the edits now (if loaded) and, on the server, again whenever they change. */
export function onLive(apply: (c: PublicContent) => void) {
  if (typeof document === "undefined") (G.__clAppliers ??= new Set()).add(apply);
  const c = live();
  if (c) apply(c);
}

/** A page's rewritten words for a key ("intro.title", "h-how.sub"), if the admin wrote some. */
export const pageCopy = (path: string, key: string) => live()?.pages?.[path]?.copy[key] || undefined;
/** Whether the admin hid the section with this heading id on this page. */
export const pageHidden = (path: string, id: string) => !!live()?.pages?.[path]?.hidden.includes(id);

/** A home-page section's new headline and supporting line, if the admin wrote one. */
export const sectionCopy = (id: string) => live()?.copy[id];
export const controlOn = (k: "effects" | "campaign") => live()?.controls[k] ?? true;
export const campaignLive = (s: SeasonId) => live()?.seasons.campaigns[s]?.live ?? true;
/** A style's availability as set in the admin panel (Products); undefined: made to order, as usual. */
/** The admin's list for a home section or the featured order (ids); empty: the built-in way. */
export const merchList = (k: "hot" | "arrivals" | "order") => live()?.merch?.[k] ?? [];
export const availabilityOf = (id: string) => live()?.availability?.[id];
export const deskOn = (d: "trade" | "plan") => live()?.assistant[d] ?? true;
