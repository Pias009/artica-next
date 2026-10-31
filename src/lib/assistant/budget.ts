import "server-only";
import { database, dbReady } from "../leads/db";

/*
 * Keeps Kai under the AI provider's limits, so the model is never asked more than it allows: a cap per minute and per
 * day on model calls, a daily token cap, and a pause after the provider says "too many" or "busy". Whenever the model
 * isn't allowed, Kai answers with its offline engine instead, so a buyer never sees a limit.
 *   ASSISTANT_RPM  model calls per minute (default 10; one chat reply can be 1–4 calls)
 *   ASSISTANT_RPD  model calls per day (default 1000)
 *   ASSISTANT_TPD  tokens per day, in and out (default 2,000,000)
 * The day's counts live in the database when there is one (shared by every server instance), else in memory.
 */

const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);
const RPM = num(process.env.ASSISTANT_RPM, 10);
const RPD = num(process.env.ASSISTANT_RPD, 1000);
const TPD = num(process.env.ASSISTANT_TPD, 2_000_000);

let recent: number[] = [];
let pausedUntil = 0;
let local = { day: "", calls: 0, tokens: 0 };
let shared: { day: string; calls: number; tokens: number; read: number } | null = null;

const today = () => new Date().toISOString().slice(0, 10);
type Usage = { _id: string; calls: number; tokens: number };
const usage = () => database().collection<Usage>("assistant_usage");

async function dayCounts() {
  const day = today();
  if (local.day !== day) local = { day, calls: 0, tokens: 0 };
  if (!dbReady()) return local;
  // read at most every 15 seconds; between reads, add what this instance has used
  if (!shared || shared.day !== day || Date.now() - shared.read > 15_000) {
    try {
      const doc = await usage().findOne({ _id: day });
      shared = { day, calls: doc?.calls ?? 0, tokens: doc?.tokens ?? 0, read: Date.now() };
    } catch {
      return local;
    }
  }
  return shared;
}

/** May Kai call the model for this reply? */
export async function modelAllowed() {
  const now = Date.now();
  if (now < pausedUntil) return false;
  recent = recent.filter((t) => now - t < 60_000);
  if (recent.length >= RPM) return false;
  const d = await dayCounts();
  return d.calls < RPD && d.tokens < TPD;
}

/** A model call is starting. */
export const spend = () => recent.push(Date.now());

/** A reply finished: count its model calls (tool steps) and tokens for the day. */
export async function record(calls: number, tokens: number) {
  for (let i = 1; i < calls; i++) recent.push(Date.now());
  const d = await dayCounts();
  d.calls += calls;
  d.tokens += tokens;
  if (d !== local) {
    local.calls += calls;
    local.tokens += tokens;
  }
  if (dbReady()) await usage().updateOne({ _id: today() }, { $inc: { calls, tokens } }, { upsert: true }).catch(() => {});
}

/**
 * The provider refused or failed: pause the model and answer offline meanwhile. A daily quota pauses for an hour,
 * a per-minute limit for a minute, "busy" for 20 seconds.
 */
export function backOff(error: unknown) {
  const e = error as { statusCode?: number; message?: string } | undefined;
  const text = `${e?.message ?? ""}`;
  if (e?.statusCode === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(text)) {
    pausedUntil = Date.now() + (/per ?day|daily|PerDay/i.test(text) ? 3_600_000 : 60_000);
  } else if (e?.statusCode === 503 || /UNAVAILABLE|overloaded|high demand/i.test(text)) {
    pausedUntil = Date.now() + 20_000;
  }
}

/** For the admin and logs: where the day stands. */
export async function budgetStatus() {
  const d = await dayCounts();
  return { callsToday: d.calls, tokensToday: d.tokens, limits: { perMinute: RPM, perDay: RPD, tokensPerDay: TPD }, pausedForSeconds: Math.max(0, Math.round((pausedUntil - Date.now()) / 1000)) };
}
