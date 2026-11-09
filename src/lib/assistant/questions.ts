import "server-only";
import { database, dbReady } from "../leads/db";
import { TOPICS, SOURCES, type SourceId, type TopicId } from "./topics";

/*
 * What buyers ask Kai, counted per day: how many chats started, each desk's messages by topic (topics.ts), and how
 * each message was answered. Only counts are kept, never what was typed, no address and no visitor id, so the
 * privacy page's "we don't keep chat conversations" stays true. Days older than 90 are deleted (TTL on `at`).
 */

type Day = {
  _id: string;
  at: Date;
  chats?: number;
  trade?: Partial<Record<TopicId, number>>;
  plan?: Partial<Record<TopicId, number>>;
  source?: Partial<Record<SourceId, number>>;
};
const days = () => database().collection<Day>("assistant_topics");
let indexed = false;

/** Counts one message. Never throws and never holds up the reply: callers run it after the response. */
export async function countQuestion(m: { desk: "trade" | "plan"; topic: TopicId; source: SourceId; first: boolean }) {
  if (!dbReady()) return;
  try {
    if (!indexed) {
      indexed = true;
      await days().createIndex({ at: 1 }, { expireAfterSeconds: 90 * 86_400 }).catch(() => {});
    }
    const day = new Date().toISOString().slice(0, 10);
    await days().updateOne(
      { _id: day },
      { $setOnInsert: { at: new Date(`${day}T00:00:00Z`) }, $inc: { [`${m.desk}.${m.topic}`]: 1, [`source.${m.source}`]: 1, ...(m.first && { chats: 1 }) } },
      { upsert: true },
    );
  } catch (e) {
    console.error("[assistant] couldn't count the question", e);
  }
}

export type AskStats = {
  days: number;
  chats: number;
  messages: number;
  /** Most asked first, both desks together, with each desk's share. */
  topics: { id: TopicId; label: string; n: number; trade: number; plan: number }[];
  sources: { id: SourceId; label: string; n: number }[];
};

/** The last `n` days (today included), added up. */
export async function askStats(n = 7): Promise<AskStats> {
  const since = new Date(Date.now() - (n - 1) * 86_400_000).toISOString().slice(0, 10);
  const rows = dbReady() ? await days().find({ _id: { $gte: since } }).toArray() : [];
  const sum = (pick: (d: Day) => Partial<Record<string, number>> | undefined, k: string) => rows.reduce((a, d) => a + (pick(d)?.[k] ?? 0), 0);
  const topics = (Object.keys(TOPICS) as TopicId[])
    .map((id) => {
      const trade = sum((d) => d.trade, id);
      const plan = sum((d) => d.plan, id);
      return { id, label: TOPICS[id], n: trade + plan, trade, plan };
    })
    .filter((t) => t.n)
    .sort((a, b) => b.n - a.n);
  const sources = (Object.keys(SOURCES) as SourceId[]).map((id) => ({ id, label: SOURCES[id], n: sum((d) => d.source, id) })).filter((s) => s.n);
  return { days: n, chats: rows.reduce((a, d) => a + (d.chats ?? 0), 0), messages: topics.reduce((a, t) => a + t.n, 0), topics, sources };
}
