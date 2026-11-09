import "server-only";
import { database, dbReady } from "../leads/db";

/*
 * Real-visitor speed (Core Web Vitals) and JavaScript errors from the public site, for Vela's Engineering team.
 * components/SiteHealth.tsx sends them to /api/health. One small document per reading: the metric, its value, the
 * page path and when, plus the anonymous visit id of the visitor log (never an address, nothing kept on the device).
 * Deleted after 30 days (TTL index).
 */

export const VITALS = ["lcp", "inp", "cls", "fcp", "ttfb"] as const;
export type Vital = (typeof VITALS)[number];
export type HealthDoc = {
  name: Vital | "js_error";
  value: number;
  path: string;
  at: Date;
  sid: string;
  rating?: "good" | "needs-improvement" | "poor";
  message?: string;
  source?: string;
};

export const health = () => database().collection<HealthDoc>("site_health");

let indexed: Promise<unknown> | null = null;
export function ensureHealthIndexes() {
  if (!dbReady()) return Promise.resolve();
  return (indexed ??= health()
    .createIndexes([
      { key: { at: 1 }, name: "expire", expireAfterSeconds: 30 * 24 * 60 * 60 },
      { key: { name: 1, at: -1 }, name: "name_at" },
    ])
    .catch((e) => {
      indexed = null;
      console.error("[health] indexes", e);
    }));
}

/** Google's "good" and "poor" lines for each vital (ms; CLS is a score). */
export const THRESHOLDS: Record<Vital, [good: number, poor: number]> = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
};

export type HealthSummary = {
  samples: number;
  /** 75th percentile per vital over 7 days (the figure Google judges a site by), null with no readings. */
  p75: Record<Vital, number | null>;
  /** Share of LCP readings rated poor. */
  poorLcpShare: number | null;
  slowPages: { path: string; lcp: number; n: number }[];
  errors: number;
  errorVisits: number;
  topErrors: { message: string; n: number; path: string }[];
};

const DAY = 86_400_000;

/** The last 7 days of speed and errors, in one aggregation. */
export async function healthSummary(): Promise<HealthSummary | null> {
  if (!dbReady()) return null;
  const since = new Date(Date.now() - 7 * DAY);
  const f = await health()
    .aggregate<{
      p75: { _id: Vital; p: number[]; n: number; poor: number }[];
      slow: { _id: string; p: number[]; n: number }[];
      errors: { n: number; visits: string[] }[];
      top: { _id: string; n: number; path: string }[];
    }>([
      { $match: { at: { $gte: since } } },
      {
        $facet: {
          p75: [
            { $match: { name: { $in: [...VITALS] } } },
            {
              $group: {
                _id: "$name",
                p: { $percentile: { input: "$value", p: [0.75], method: "approximate" } },
                n: { $sum: 1 },
                poor: { $sum: { $cond: [{ $eq: ["$rating", "poor"] }, 1, 0] } },
              },
            },
          ],
          slow: [
            { $match: { name: "lcp" } },
            { $group: { _id: "$path", p: { $percentile: { input: "$value", p: [0.75], method: "approximate" } }, n: { $sum: 1 } } },
            { $match: { n: { $gte: 3 } } },
            { $sort: { p: -1 } },
            { $limit: 5 },
          ],
          errors: [{ $match: { name: "js_error" } }, { $group: { _id: null, n: { $sum: 1 }, visits: { $addToSet: "$sid" } } }],
          top: [
            { $match: { name: "js_error" } },
            { $group: { _id: "$message", n: { $sum: 1 }, path: { $last: "$path" } } },
            { $sort: { n: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ])
    .next();
  if (!f) return null;
  const p75 = Object.fromEntries(VITALS.map((v) => [v, f.p75.find((x) => x._id === v)?.p[0] ?? null])) as Record<Vital, number | null>;
  const lcp = f.p75.find((x) => x._id === "lcp");
  return {
    samples: f.p75.reduce((a, x) => a + x.n, 0),
    p75,
    poorLcpShare: lcp?.n ? lcp.poor / lcp.n : null,
    slowPages: f.slow.map((s) => ({ path: s._id, lcp: s.p[0], n: s.n })),
    errors: f.errors[0]?.n ?? 0,
    errorVisits: f.errors[0]?.visits.length ?? 0,
    topErrors: f.top.map((t) => ({ message: t._id ?? "Unknown error", n: t.n, path: t.path })),
  };
}
