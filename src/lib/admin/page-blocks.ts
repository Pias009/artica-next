import "server-only";
import { unstable_cache } from "next/cache";
import { BLOCKS_HEADER, blocksToken } from "../content/blocks-token";
import { SITE_PAGES } from "../site-pages";

/*
 * The words on each page that the admin panel can rewrite, read from the pages themselves: every page intro and
 * section heading marks its text with data-copy (the key) and data-default (the words as built). Reading the real
 * pages means the panel always lists what visitors see, for every page, with no list to keep up to date.
 */

export type Block = {
  /** "intro", or the section heading's id. */
  id: string;
  label: string;
  kind: "Intro" | "Section";
  title: string;
  /** null: the block has no supporting line. */
  sub: string | null;
  hideable: boolean;
};

const unescape = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function blocksIn(html: string): Block[] {
  const found = new Map<string, Block>();
  for (const m of html.matchAll(/data-copy="([\w-]+)\.(title|sub)" data-default="([^"]*)"/g)) {
    const [, id, part, raw] = m;
    const text = unescape(raw);
    const b = found.get(id) ?? { id, label: "", kind: id === "intro" ? "Intro" : "Section", title: "", sub: null, hideable: id !== "intro" };
    if (part === "title") {
      b.title = text;
      b.label = id === "intro" ? "Page intro" : text.replace(/\*/g, "").slice(0, 60) || id;
    } else b.sub = text;
    found.set(id, b);
  }
  return [...found.values()].filter((b) => b.title);
}

/** One page's blocks. A failed read throws, so it is never cached and the next panel load tries again. */
async function readOne(origin: string, path: string) {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const headers = { [BLOCKS_HEADER]: blocksToken(), "user-agent": "chime-long-admin", ...(bypass && { "x-vercel-protection-bypass": bypass }) };
  const res = await fetch(origin + path, { headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return blocksIn(await res.text());
}
const cachedOne = unstable_cache(readOne, ["page-blocks-v2"], { revalidate: 600 });

async function read(origin: string, paths: string[]) {
  const out: Record<string, Block[] | null> = {};
  // a few at a time: a dev server compiles each page on its first visit
  for (let i = 0; i < paths.length; i += 5) {
    await Promise.all(
      paths.slice(i, i + 5).map(async (path) => {
        out[path] = await cachedOne(origin, path).catch((e) => (console.error("[page-blocks]", String(e)), null));
      }),
    );
  }
  return out;
}

/**
 * Where this server's own pages are: this deployment on Vercel, else the local server the admin is using. Never a
 * host taken from the request on a public server, so the panel can't be pointed at another site.
 */
export function siteOrigin(host: string | null) {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const name = (host ?? "").toLowerCase();
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(name)) return `http://${name}`;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `http://localhost:${process.env.PORT ?? 3000}`;
}

/** Each page's editable words, by path (null: couldn't be read just now); each page cached for 10 minutes. */
export const pageBlocks = read;

/** Every site page but the home page (whose sections are listed from code), for the Pages view. */
export const editablePaths = () => SITE_PAGES.filter((p) => !p.path.includes("?") && p.path !== "/").map((p) => p.path);
