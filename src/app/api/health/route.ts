import { headers } from "next/headers";
import { BOT, visitId } from "@/lib/analytics/visits";
import { dbReady } from "@/lib/leads/db";
import { ensureHealthIndexes, health, VITALS, type HealthDoc } from "@/lib/vela/health";

/**
 * The site-health beacon (components/SiteHealth.tsx): real-visitor speed and JavaScript errors for Vela's Engineering
 * team. Checks every field, drops bots and admin pages, keeps no address. Always answers 204, so a visitor never
 * waits on it or sees an error.
 */
const MAX_BYTES = 6000;
const MAX_ITEMS = 20;

export async function POST(req: Request) {
  const none = new Response(null, { status: 204 });
  if (!dbReady()) return none;
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (BOT.test(ua) || h.get("sec-gpc") === "1") return none;
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > MAX_BYTES) return none;
  let items: unknown;
  try {
    items = (JSON.parse(raw) as { m?: unknown }).m;
  } catch {
    return none;
  }
  if (!Array.isArray(items)) return none;

  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const sid = visitId(ip, ua);
  const at = new Date();
  const docs: HealthDoc[] = [];
  for (const it of items.slice(0, MAX_ITEMS)) {
    if (!it || typeof it !== "object") continue;
    const m = it as Record<string, unknown>;
    const path = typeof m.p === "string" && m.p.startsWith("/") ? m.p.split("?")[0].slice(0, 200) : null;
    if (!path || path.startsWith("/admin") || path.startsWith("/api")) continue;
    const value = typeof m.v === "number" && Number.isFinite(m.v) ? Math.max(0, Math.min(m.v, 120_000)) : null;
    if (m.n === "js_error") {
      const message = typeof m.msg === "string" ? m.msg.trim().slice(0, 300) : "";
      if (!message) continue;
      docs.push({ name: "js_error", value: 1, path, at, sid, message, ...(typeof m.src === "string" && { source: m.src.slice(0, 200) }) });
    } else if ((VITALS as readonly unknown[]).includes(m.n) && value !== null) {
      const rating = m.r === "good" || m.r === "needs-improvement" || m.r === "poor" ? m.r : undefined;
      docs.push({ name: m.n as HealthDoc["name"], value, path, at, sid, ...(rating && { rating }) });
    }
  }
  if (!docs.length) return none;
  try {
    await ensureHealthIndexes();
    await health().insertMany(docs);
  } catch (e) {
    console.error("[health]", e);
  }
  return none;
}
