import { headers } from "next/headers";
import { BOT, deviceOf, ensureVisitIndexes, sourceOf, visitId, visits, type VisitDoc } from "@/lib/analytics/visits";
import { dbReady } from "@/lib/leads/db";
import { filterProducts, products } from "@/lib/products";
import { loadContent } from "@/lib/content/store";
import { SEASON_COOKIE } from "@/lib/season";

/**
 * The visitor log's beacon (components/Track.tsx sends one per page view, search and opened inquiry form). Checks
 * every field, drops bots, and stores the visit without the IP address. Always answers 204, so a visitor never waits
 * on it or sees an error.
 */
export async function POST(req: Request) {
  const none = new Response(null, { status: 204 });
  if (!dbReady()) return none;
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (BOT.test(ua) || h.get("sec-gpc") === "1") return none;
  const raw = await req.text().catch(() => "");
  if (raw.length > 2000) return none;
  let b: {
    k?: unknown;
    p?: unknown;
    r?: unknown;
    w?: unknown;
    q?: unknown;
    n?: unknown;
    id?: unknown;
  };
  try {
    b = JSON.parse(raw);
  } catch {
    return none;
  }
  const kind = b.k === "search" || b.k === "inquiry" || b.k === "add" ? b.k : "view";
  // a style put on the inquiry list: its id, as the catalogue knows it
  const pid = kind === "add" && typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : undefined;
  if (kind === "add" && !pid) return none;
  const full = typeof b.p === "string" && b.p.startsWith("/") && b.p.length <= 300 ? b.p : null;
  if (!full) return none;
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const sid = visitId(ip, ua);
  const url = new URL(full, "http://x");
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return none;

  const cookie = h.get("cookie")?.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([A-Z]{2})`))?.[1];
  const doc: VisitDoc = {
    sid,
    kind,
    path: url.pathname,
    at: new Date(),
    country: cookie ?? h.get("x-vercel-ip-country") ?? null,
    device: deviceOf(ua, typeof b.w === "number" ? b.w : 0),
    source: sourceOf(typeof b.r === "string" ? b.r.slice(0, 300) : undefined, h.get("host") ?? ""),
    ...(pid && { pid }),
  };
  // a search: typed in the site search, or the catalog opened with ?q=
  const q = (typeof b.q === "string" ? b.q : kind === "view" && url.pathname === "/catalog" ? (url.searchParams.get("q") ?? "") : "").trim().slice(0, 80);
  const docs: VisitDoc[] = [doc];
  if (q) {
    await loadContent();
    const found = typeof b.n === "number" ? Math.max(0, Math.min(999, Math.round(b.n))) : filterProducts(products, "all", q).length;
    if (kind === "search") Object.assign(doc, { q: q.toLowerCase(), found });
    else docs.push({ ...doc, kind: "search", q: q.toLowerCase(), found });
  }
  try {
    await ensureVisitIndexes();
    await visits().insertMany(docs);
  } catch (e) {
    console.error("[track]", e);
  }
  return none;
}
