import { EMPTY_CONTENT, withDefaults, type SiteContent } from "./model";
import { database, dbReady } from "../leads/db";

/*
 * What proxy.ts needs from the admin panel's edits on every request: unpublished pages and the season rule. Kept in
 * memory for 30 seconds per server, so a change reaches every visitor within half a minute without a database
 * query per page view.
 */

const TTL = 30_000;
// on globalThis, so a save in this server process (forgetRouting) reaches the proxy's copy of this module too
const G = globalThis as typeof globalThis & { __clRouting?: { at: number; value: Promise<Routing> } | null };
type Routing = { hidden: Set<string>; seasons: SiteContent["seasons"] };

async function read(): Promise<Routing> {
  let c = EMPTY_CONTENT;
  if (dbReady()) {
    try {
      const doc = await database()
        .collection<Partial<SiteContent> & { _id: string }>("site_content")
        .findOne({ _id: "site" }, { projection: { pages: 1, seasons: 1 }, maxTimeMS: 1500 });
      c = withDefaults(doc);
    } catch {
      // the site as built: never let a slow database take pages down
    }
  }
  const hidden = new Set(Object.entries(c.pages).flatMap(([path, p]) => (p.published === false && path !== "/" ? [path] : [])));
  return { hidden, seasons: c.seasons };
}

export function routing(): Promise<Routing> {
  if (!G.__clRouting || Date.now() - G.__clRouting.at > TTL) G.__clRouting = { at: Date.now(), value: read() };
  return G.__clRouting.value;
}

/** After a save on this server: the next request reads again. */
export const forgetRouting = () => {
  G.__clRouting = null;
};
