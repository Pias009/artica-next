import "server-only";
import { unstable_cache } from "next/cache";
import { EMPTY_CONTENT, publicContent, withDefaults, type SiteContent } from "./model";
import { setLive } from "./live";
import { database, dbReady } from "../leads/db";
// imported for their onLive() registration: setLive() below applies the edits to them
import "../company";
import "../products";

/*
 * The admin panel's edits, stored as one MongoDB document (`site_content`, _id "site") and read through Next.js's
 * cache (tag "site-content"), so pages don't query the database on every request. Saving (app/admin/content-actions)
 * writes the document and expires the tag and the pages, and the site shows the change on the next visit.
 */

export const CONTENT_TAG = "site-content";
type Doc = Partial<SiteContent> & { _id: "site" };
export const contentDoc = () => database().collection<Doc>("site_content");

/** Straight from the database: what the admin panel edits. The defaults when there's no database or it can't be read. */
export async function readContent(): Promise<SiteContent> {
  if (!dbReady()) return EMPTY_CONTENT;
  try {
    const doc = await contentDoc().findOne({ _id: "site" });
    if (!doc) return EMPTY_CONTENT;
    const { _id, ...rest } = doc;
    void _id;
    return withDefaults(rest);
  } catch (e) {
    console.error("[content] read failed; showing the site as built", e);
    return EMPTY_CONTENT;
  }
}

const cached = unstable_cache(readContent, ["site-content-v1"], {
  tags: [CONTENT_TAG],
  revalidate: 300,
});

/** The edits, cached: for rendering the site. A copy cached by an older build may lack newer fields, so it's filled out too. */
export const getContent = () => (dbReady() ? cached().then(withDefaults) : Promise.resolve(EMPTY_CONTENT));

/**
 * Loads the edits and applies them to the shared catalogue and contact details before rendering. Called by the root
 * layout and by every page, route and action that reads products, so none of them can render ahead of it.
 */
export async function loadContent() {
  const c = await getContent();
  setLive(publicContent(c));
  return c;
}

/** Saves some top-level parts of the document (each replaced whole). */
export async function saveContent(patch: Partial<Omit<SiteContent, "updatedAt" | "updatedBy">>, by: string) {
  await contentDoc().updateOne({ _id: "site" }, { $set: { ...patch, updatedAt: new Date().toISOString(), updatedBy: by } }, { upsert: true });
}
