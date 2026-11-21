import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { database, dbReady } from "./db";

/*
 * A small limiter for the public server actions (app/actions.ts), so a bot can't flood the desk with inquiries or use
 * the site to email strangers. Fixed windows counted per action and visitor: with a database in MongoDB
 * (`rate_limits`, one tiny document per action, visitor and window, deleted by a TTL index once its window is over),
 * without one in this server's memory. The visitor is a hash of their address (or of the email the receipt goes to);
 * the address itself is never stored. It never gets in a buyer's way because of its own trouble: if the database is
 * slow or down, the request is allowed.
 */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

type Rule = { max: number; windowMs: number };

/** Tries per visitor address. A buyer sends one or two; past these it's a script. */
const LIMITS = {
  sendInquiry: [
    { max: 5, windowMs: 10 * MIN },
    { max: 20, windowMs: DAY },
  ],
  submitInquiry: [{ max: 8, windowMs: 10 * MIN }],
  requestContact: [{ max: 6, windowMs: 10 * MIN }],
  subscribe: [{ max: 6, windowMs: 10 * MIN }],
  addRequestInfo: [{ max: 10, windowMs: 10 * MIN }],
  // the buyer's answer on their quote page (respondToQuote in app/quote-actions.ts); a token guards it already
  respondToQuote: [{ max: 10, windowMs: 10 * MIN }],
} satisfies Record<string, Rule[]>;

export type LimitedAction = keyof typeof LIMITS;

/** Receipts one email address can be sent by sendInquiry in a day, whoever asks for them. */
const RECEIPTS: Rule[] = [{ max: 3, windowMs: DAY }];

/** Longest the limiter waits on the database before letting the request through. */
const TIMEOUT = 1500;

type LimitDoc = { _id: string; n: number; expiresAt: Date };
const limits = () => database().collection<LimitDoc>("rate_limits");

const hash = (v: string) => createHash("sha256").update(v).digest("hex").slice(0, 16);

let warned = false;
function warnOnce(e: unknown) {
  if (warned) return;
  warned = true;
  console.error("[ratelimit] limiter failed; letting requests through", e);
}

let indexed: Promise<unknown> | null = null;
/** The TTL index that clears finished windows, made once per server. */
function ensureLimitIndexes() {
  return (indexed ??= limits()
    .createIndex({ expiresAt: 1 }, { name: "expiresAt", expireAfterSeconds: 0 })
    .catch((e) => {
      indexed = null;
      console.error("[ratelimit] indexes", e);
    }));
}

// without a database: counts in this server's memory, which is per instance and lost on restart, but still slows a flood
const memory = new Map<string, { n: number; expiresAt: number }>();
function memoryHit(id: string, expiresAt: number) {
  const now = Date.now();
  if (memory.size > 5000) for (const [k, v] of memory) if (v.expiresAt <= now) memory.delete(k);
  // still too many live entries (a flood of distinct addresses): start over rather than grow without end
  if (memory.size > 20_000) memory.clear();
  const cur = memory.get(id);
  const n = cur && cur.expiresAt > now ? cur.n + 1 : 1;
  memory.set(id, { n, expiresAt: cur && cur.expiresAt > now ? cur.expiresAt : expiresAt });
  return n;
}

/** Counts one try for `who` under `scope` in each rule's current window; true when any window is over its limit. */
async function over(scope: string, who: string, rules: Rule[]): Promise<boolean> {
  try {
    const now = Date.now();
    const windows = rules.map((r) => {
      const w = Math.floor(now / r.windowMs);
      return { max: r.max, id: `${scope}:${who}:${r.windowMs / 1000}s:${w}`, expiresAt: (w + 1) * r.windowMs };
    });
    if (!dbReady()) return windows.some((w) => memoryHit(w.id, w.expiresAt) > w.max);

    const counted = Promise.all([
      ensureLimitIndexes(),
      ...windows.map((w) =>
        limits().findOneAndUpdate(
          { _id: w.id },
          { $inc: { n: 1 }, $setOnInsert: { expiresAt: new Date(w.expiresAt) } },
          { upsert: true, returnDocument: "after", projection: { n: 1 } },
        ),
      ),
    ]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT} ms`)), TIMEOUT)));
    const [, ...docs] = await Promise.race([counted, timeout]).finally(() => clearTimeout(timer));
    return docs.some((d, i) => (d?.n ?? 0) > windows[i].max);
  } catch (e) {
    warnOnce(e);
    return false;
  }
}

/** The visitor's address as the proxy saw it: the first x-forwarded-for entry (the client), else x-real-ip. */
async function visitor() {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

/** True when this visitor has tried `action` too often lately (and counts this try). Never throws. */
export async function rateLimited(action: LimitedAction): Promise<boolean> {
  return over(action, hash(await visitor()), LIMITS[action]);
}

/** True when this email address has already been sent today's share of receipts (and counts this one). Never throws. */
export async function receiptLimited(email: string): Promise<boolean> {
  return over("receipt", hash(email.trim().toLowerCase()), RECEIPTS);
}
