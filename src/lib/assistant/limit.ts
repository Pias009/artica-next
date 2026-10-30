import "server-only";
import { database, dbReady } from "../leads/db";

/**
 * How often one address may ask Kai: 20 messages in 10 minutes, 200 a day. Counted in the database when there is
 * one (shared by every server instance), else in this instance's memory. Keeps the AI bill bounded and bots out.
 */
const WINDOWS = [
  { ms: 10 * 60_000, max: 20 },
  { ms: 24 * 3_600_000, max: 200 },
];
const memory = new Map<string, number[]>();

export async function allow(key: string): Promise<boolean> {
  const now = Date.now();
  if (dbReady()) {
    try {
      const hits = database().collection<{ key: string; at: Date }>("assistant_hits");
      const counts = await Promise.all(WINDOWS.map((w) => hits.countDocuments({ key, at: { $gt: new Date(now - w.ms) } })));
      if (counts.some((n, i) => n >= WINDOWS[i].max)) return false;
      await hits.insertOne({ key, at: new Date(now) });
      return true;
    } catch (e) {
      console.error("[assistant] rate limit store unavailable, using memory", e);
    }
  }
  const list = (memory.get(key) ?? []).filter((t) => now - t < WINDOWS[1].ms);
  if (WINDOWS.some((w) => list.filter((t) => now - t < w.ms).length >= w.max)) return false;
  list.push(now);
  memory.set(key, list);
  if (memory.size > 5000) memory.delete(memory.keys().next().value!);
  return true;
}
