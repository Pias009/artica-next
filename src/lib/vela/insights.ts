import "server-only";
import { panelData, type PanelData } from "../admin/panel";
import { dbReady, inquiries } from "../leads/db";
import { visits } from "../analytics/visits";
import { country } from "../countries";
import { MOQ_PAIRS, type Product } from "../products";
import { SEASON_IDS } from "../season";
import { healthSummary, THRESHOLDS, type HealthSummary, type Vital } from "./health";
import { TEAMS, type TeamId } from "./teams";

/*
 * Live figures and findings for each of Vela's teams. One batch of read-only queries (the panel's own data, plus a
 * few team-specific ones), cached for 30 seconds and shared by the HQ view and the chat, so both always agree.
 * Every part fails soft: a team whose data can't be read says "limited" instead of breaking the rest.
 */

export type Tone = "good" | "warn" | "bad" | "muted";
export type TeamMetric = { label: string; value: string; tone?: Tone };
export type TeamInsight = {
  status: "ok" | "attention" | "limited";
  headline: string;
  metrics: TeamMetric[];
  findings: string[];
};

export type VelaInsights = {
  generatedAt: string;
  overview: {
    inquiries30: number;
    visits7: number;
    waiting: number;
    overdue: number;
    medianReplyHours: number | null;
    winRate90: string | null;
    jsErrors7: number;
  };
  teams: Record<TeamId, TeamInsight>;
  notConnected: string[];
};

const DAY = 86_400_000;
const CACHE_MS = 30_000;
let cache: { at: number; data: VelaInsights } | null = null;
let inflight: Promise<VelaInsights> | null = null;

const n = (v: number) => v.toLocaleString("en-US");
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");
const plural = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;
const countryName = (c: string | null | undefined) => (c ? (country(c)?.name ?? c) : "Unknown");
const list = (xs: string[], max = 3) => (xs.length > max ? `${xs.slice(0, max).join(", ")} and ${xs.length - max} more` : xs.join(", "));

async function safe<T>(what: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[vela] ${what}`, e);
    return fallback;
  }
}

export async function getVelaInsights(): Promise<VelaInsights> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  inflight ??= compute()
    .then((data) => ((cache = { at: Date.now(), data }), data))
    .finally(() => (inflight = null));
  return inflight;
}

/* ---- the queries the panel doesn't already make ---- */

type Extra = Awaited<ReturnType<typeof extraFacts>>;

async function extraFacts() {
  const now = Date.now();
  const d30 = new Date(now - 30 * DAY);
  const d90 = new Date(now - 90 * DAY);
  const d365 = new Date(now - 365 * DAY);
  const live = { status: { $ne: "spam" as const } };
  const [inq, vis] = await Promise.all([
    safe("inquiry facts", null, () =>
      inquiries()
        .aggregate<{
          last30: { n: number }[];
          byCountry30: { _id: string; n: number }[];
          countriesBefore: { _id: string }[];
          decided90: { _id: "won" | "lost"; n: number }[];
          pairs30: { n: number; avg: number; under: number }[];
          repeat: { _id: string; n: number; company: string }[];
          staleQuotes: { ref: string; company: string; statusAt: Date }[];
          staleQuotesN: { n: number }[];
          staleReplied: { n: number }[];
          seasons90: { _id: string | null; n: number }[];
          intents30: { _id: string; n: number }[];
        }>([
          { $match: { ...live, createdAt: { $gte: d365 } } },
          {
            $facet: {
              last30: [{ $match: { createdAt: { $gte: d30 } } }, { $count: "n" }],
              byCountry30: [{ $match: { createdAt: { $gte: d30 } } }, { $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1 } }],
              countriesBefore: [{ $match: { createdAt: { $lt: d30 } } }, { $group: { _id: "$country" } }],
              decided90: [{ $match: { createdAt: { $gte: d90 }, status: { $in: ["won", "lost"] } } }, { $group: { _id: "$status", n: { $sum: 1 } } }],
              pairs30: [
                { $match: { createdAt: { $gte: d30 }, pairs: { $gt: 0 } } },
                { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: "$pairs" }, under: { $sum: { $cond: [{ $lt: ["$pairs", MOQ_PAIRS] }, 1, 0] } } } },
              ],
              repeat: [
                { $group: { _id: { $toLower: "$email" }, n: { $sum: 1 }, company: { $last: "$company" } } },
                { $match: { n: { $gte: 2 } } },
                { $sort: { n: -1 } },
              ],
              staleQuotes: [
                { $match: { status: "quoted", statusAt: { $lt: new Date(now - 7 * DAY) } } },
                { $sort: { statusAt: 1 } },
                { $limit: 5 },
                { $project: { _id: 0, ref: 1, company: 1, statusAt: 1 } },
              ],
              staleQuotesN: [{ $match: { status: "quoted", statusAt: { $lt: new Date(now - 7 * DAY) } } }, { $count: "n" }],
              staleReplied: [{ $match: { status: "replied", statusAt: { $lt: new Date(now - 5 * DAY) } } }, { $count: "n" }],
              seasons90: [{ $match: { createdAt: { $gte: d90 } } }, { $group: { _id: "$season", n: { $sum: 1 } } }, { $sort: { n: -1 } }],
              intents30: [{ $match: { createdAt: { $gte: d30 } } }, { $group: { _id: "$intent", n: { $sum: 1 } } }, { $sort: { n: -1 } }],
            },
          },
        ])
        .next(),
    ),
    safe("visit facts", null, () =>
      visits()
        .aggregate<{
          bySource: { _id: string; visits: number; started: number; contacts: number }[];
          byCountry: { _id: string | null; n: number }[];
          signups: { n: number }[];
          adds: { _id: string; now: number; before: number }[];
        }>([
          { $match: { at: { $gte: d30 } } },
          {
            $facet: {
              bySource: [
                { $sort: { at: 1 } },
                {
                  $group: {
                    _id: "$sid",
                    source: { $first: "$source" },
                    started: { $max: { $cond: [{ $eq: ["$kind", "inquiry"] }, 1, 0] } },
                    contacts: { $max: { $cond: [{ $eq: ["$kind", "contact"] }, 1, 0] } },
                  },
                },
                { $group: { _id: "$source", visits: { $sum: 1 }, started: { $sum: "$started" }, contacts: { $sum: "$contacts" } } },
                { $sort: { visits: -1 } },
              ],
              byCountry: [{ $group: { _id: "$sid", c: { $first: "$country" } } }, { $group: { _id: "$c", n: { $sum: 1 } } }, { $sort: { n: -1 } }],
              signups: [{ $match: { kind: "contact", via: "signup" } }, { $count: "n" }],
              adds: [
                { $match: { kind: "add", at: { $gte: new Date(now - 14 * DAY) } } },
                {
                  $group: {
                    _id: "$pid",
                    now: { $sum: { $cond: [{ $gte: ["$at", new Date(now - 7 * DAY)] }, 1, 0] } },
                    before: { $sum: { $cond: [{ $lt: ["$at", new Date(now - 7 * DAY)] }, 1, 0] } },
                  },
                },
              ],
            },
          },
        ])
        .next(),
    ),
  ]);
  return { inq, vis };
}

/* ---- each team, from the facts ---- */

type Facts = { d: PanelData; x: Extra; h: HealthSummary | null };
const limited = (headline: string, findings: string[] = []): TeamInsight => ({ status: "limited", headline, metrics: [], findings });

function marketing({ x }: Facts): TeamInsight {
  const rows = x.vis?.bySource ?? [];
  if (!rows.length) return limited("No visits logged in the last 30 days", ["The visitor log fills as buyers browse the site."]);
  const total = rows.reduce((a, r) => a + r.visits, 0);
  const started = rows.reduce((a, r) => a + r.started, 0);
  const signups = x.vis?.signups[0]?.n ?? 0;
  const top = rows[0];
  const leads = (r: (typeof rows)[number]) => r.started + r.contacts;
  const best = rows.filter((r) => r.visits >= 10 && leads(r) > 0).sort((a, b) => leads(b) / b.visits - leads(a) / a.visits)[0];
  const silent = rows.filter((r) => r.visits >= 20 && leads(r) === 0);
  const findings = rows
    .slice(0, 4)
    .map((r) => `${r._id}: ${plural(r.visits, "visit")} (${pct(r.visits, total)}), ${n(r.started)} opened the inquiry form, ${n(r.contacts)} left their email.`);
  if (best) findings.push(`Best channel for leads: ${best._id}, ${pct(leads(best), best.visits)} of its visits opened the form or left an email.`);
  if (silent.length) findings.push(`Traffic but no leads: ${list(silent.map((s) => `${s._id} (${n(s.visits)} visits)`))}. Check what those visitors land on.`);
  findings.push(signups ? `${plural(signups, "line-sheet signup")} in 30 days.` : "No line-sheet signups in 30 days: promote the line sheet on the channels above.");
  return {
    status: silent.length ? "attention" : "ok",
    headline: `${top._id} brings ${pct(top.visits, total)} of visits${best && best._id !== top._id ? `; ${best._id} converts best` : ""}`,
    metrics: [
      { label: "Visits (30 d)", value: n(total) },
      { label: "Top channel", value: top._id },
      { label: "Forms opened", value: n(started), tone: started ? "good" : "warn" },
      { label: "Line-sheet signups", value: n(signups), tone: signups ? "good" : "muted" },
    ],
    findings,
  };
}

function conversion({ d }: Facts): TeamInsight {
  const v = d.visitors;
  if (!v || !v.sessions) return limited("No visits logged in the last 7 days");
  const [visited, catalog, style, form, sent] = v.funnel.map((f) => f.n);
  const findings = [
    `Last 7 days: ${n(visited)} visits → ${n(catalog)} browsed the catalog (${pct(catalog, visited)}) → ${n(style)} opened a style (${pct(style, visited)}) → ${n(form)} opened the inquiry form → ${n(sent)} sent an inquiry.`,
    `${v.onePage}% of visits saw only one page.`,
  ];
  if (form) findings.push(`${pct(sent, form)} of opened inquiry forms were sent.`);
  if (v.exits.length) findings.push(`Visits end most often on ${list(v.exits.slice(0, 3).map((e) => `${e.page} (${e.exits})`))}.`);
  const weakForm = form >= 5 && sent / form < 0.3;
  const noForms = visited >= 50 && form === 0;
  if (weakForm) findings.push("Fewer than 3 in 10 opened forms are sent: shorten the form or make the MOQ and sample terms clearer next to it.");
  if (noForms) findings.push("Nobody opened the inquiry form this week: make the inquiry button more visible on style pages.");
  return {
    status: weakForm || noForms ? "attention" : "ok",
    headline: `${pct(sent, visited)} of visits sent an inquiry this week`,
    metrics: [
      { label: "Visits (7 d)", value: n(visited) },
      { label: "Opened a style", value: pct(style, visited) },
      { label: "Form → sent", value: pct(sent, form), tone: weakForm ? "bad" : form ? "good" : "muted" },
      { label: "One-page visits", value: `${v.onePage}%`, tone: v.onePage > 60 ? "warn" : undefined },
    ],
    findings,
  };
}

function markets({ d, x }: Facts): TeamInsight {
  const top90 = d.overview?.markets ?? [];
  const inq30 = new Map<string, number>();
  for (const c of x.inq?.byCountry30 ?? []) inq30.set(countryName(c._id), (inq30.get(countryName(c._id)) ?? 0) + c.n);
  const before = new Set((x.inq?.countriesBefore ?? []).map((c) => countryName(c._id)));
  const visits30 = (x.vis?.byCountry ?? []).filter((c) => c._id).map((c) => ({ name: countryName(c._id), n: c.n }));
  if (!top90.length && !visits30.length) return limited("No inquiries or visits yet to map markets");
  const browsing = visits30.filter((c) => c.n >= 15 && !inq30.get(c.name));
  const fresh = [...inq30.keys()].filter((c) => !before.has(c) && c !== "Unknown");
  const findings: string[] = [];
  if (top90.length) findings.push(`Most inquiries in 90 days: ${list(top90.map((m) => `${m.name} ${m.share}%`), 5)}.`);
  if (visits30.length) findings.push(`Most visits in 30 days: ${list(visits30.slice(0, 5).map((c) => `${c.name} (${n(c.n)})`), 5)}.`);
  if (browsing.length) findings.push(`Visiting but not inquiring: ${list(browsing.map((c) => `${c.name} (${n(c.n)} visits)`))}. Check terms and shipping for those markets.`);
  if (fresh.length) findings.push(`New market${fresh.length > 1 ? "s" : ""} this month: ${list(fresh)}. Reply fast to win a first order.`);
  return {
    status: browsing.length ? "attention" : "ok",
    headline: top90[0] ? `${top90[0].name} leads with ${top90[0].share}% of inquiries` : `${visits30[0]?.name} sends the most visits`,
    metrics: [
      { label: "Countries inquiring (30 d)", value: n([...inq30.keys()].length) },
      { label: "Top market", value: top90[0]?.name ?? "—" },
      { label: "New markets", value: n(fresh.length), tone: fresh.length ? "good" : "muted" },
      { label: "Browsing only", value: n(browsing.length), tone: browsing.length ? "warn" : "good" },
    ],
    findings,
  };
}

function trending({ d, x }: Facts): TeamInsight {
  const name = new Map(d.products.map((p) => [p.id, p.name]));
  const stats = Object.entries(d.styleStats);
  const rising = stats.filter(([, s]) => s.flags.includes("rising")).map(([id, s]) => ({ id, s }));
  const falling = stats.filter(([, s]) => s.flags.includes("falling")).map(([id, s]) => ({ id, s }));
  const adds = (x.vis?.adds ?? []).filter((a) => name.has(a._id));
  const addsUp = adds.filter((a) => a.now >= 3 && a.now >= a.before * 2).sort((a, b) => b.now - a.now);
  if (!stats.length && !adds.length) return limited("Not enough interest yet to see trends");
  const findings: string[] = [];
  if (rising.length) findings.push(`Rising: ${list(rising.map(({ id, s }) => `${name.get(id)} (${s.inquiries} inquiries vs ${s.before} the month before)`))}.`);
  if (addsUp.length) findings.push(`Added to inquiry lists more this week: ${list(addsUp.map((a) => `${name.get(a._id)} (${a.now} vs ${a.before})`))}.`);
  if (falling.length) findings.push(`Cooling: ${list(falling.map(({ id, s }) => `${name.get(id)} (${s.inquiries} vs ${s.before})`))}. Review their photos and words, or feature something else.`);
  if (!findings.length) findings.push("No style is clearly rising or falling this month.");
  if (rising.length || addsUp.length) findings.push("Give the risers the Trending badge and a featured spot while interest lasts.");
  const lead = rising[0] ? name.get(rising[0].id) : addsUp[0] ? name.get(addsUp[0]._id) : null;
  return {
    status: rising.length || falling.length ? "attention" : "ok",
    headline: lead ? `${lead} is heating up` : falling.length ? `${plural(falling.length, "style")} cooling down` : "Interest is steady across styles",
    metrics: [
      { label: "Rising", value: n(rising.length), tone: rising.length ? "good" : "muted" },
      { label: "Cooling", value: n(falling.length), tone: falling.length ? "warn" : "muted" },
      { label: "List adds (7 d)", value: n(adds.reduce((a, b) => a + b.now, 0)) },
    ],
    findings,
  };
}

const isLive = (d: PanelData, id: string) => d.content.products[id]?.live !== false;

function catalogue({ d }: Facts): TeamInsight {
  const live = d.products.filter((p) => isLive(d, p.id));
  const asked = [...live].filter((p) => p.inquiries > 0).sort((a, b) => b.inquiries - a.inquiries);
  const never = live.filter((p) => !p.inquiries);
  const looked = live.filter((p) => d.styleStats[p.id]?.flags.includes("looked-not-asked"));
  const hidden = d.products.length - live.length;
  const total = asked.reduce((a, p) => a + p.inquiries, 0);
  if (!d.ready) return limited("No database: inquiries per style can't be read");
  const findings: string[] = [];
  if (asked.length) findings.push(`Most asked for (90 d): ${list(asked.slice(0, 5).map((p) => `${p.name} (${p.inquiries})`), 5)}.`);
  else findings.push("No style has been named in an inquiry in 90 days yet.");
  if (never.length && total) findings.push(`${plural(never.length, "live style")} with no inquiry in 90 days: ${list(never.map((p) => p.name))}.`);
  if (looked.length) findings.push(`Viewed but never asked about: ${list(looked.map((p) => `${p.name} (${d.styleStats[p.id].views} views)`))}. Their pages need better photos, words or terms.`);
  findings.push(`${plural(live.length, "live style")}, ${n(hidden)} hidden, ${n(d.products.filter((p) => p.added).length)} added in the panel.`);
  const deadShare = live.length ? never.length / live.length : 0;
  return {
    status: looked.length || (total >= 10 && deadShare >= 0.5) ? "attention" : total ? "ok" : "limited",
    headline: asked[0] ? `${asked[0].name} is the most asked-for style` : "Waiting for the first style inquiries",
    metrics: [
      { label: "Live styles", value: n(live.length) },
      { label: "Asked for (90 d)", value: n(asked.length), tone: "good" },
      { label: "Never asked", value: n(never.length), tone: total && deadShare >= 0.5 ? "warn" : "muted" },
      { label: "Viewed, not asked", value: n(looked.length), tone: looked.length ? "warn" : "muted" },
    ],
    findings,
  };
}

function showcase({ d }: Facts): TeamInsight {
  const featured = (p: PanelData["products"][number]) => d.content.products[p.id]?.featured ?? (p.base as Product).featured ?? false;
  const live = d.products.filter((p) => isLive(d, p.id));
  const feat = live.filter(featured);
  const cold = feat.filter((p) => !p.inquiries && (d.styleStats[p.id]?.views ?? 0) >= 10);
  const hot = live.filter((p) => !featured(p) && (p.inquiries >= 2 || d.styleStats[p.id]?.flags.includes("rising"))).sort((a, b) => b.inquiries - a.inquiries);
  const { hot: hotList, arrivals } = d.content.merch;
  const findings = [
    feat.length ? `Featured now: ${list(feat.map((p) => p.name), 5)}.` : "No style is featured: the site lists styles in the built-in order.",
  ];
  if (hot.length) findings.push(`In demand but not featured: ${list(hot.map((p) => `${p.name} (${p.inquiries} inquiries)`))}. Feature them in Products.`);
  if (cold.length) findings.push(`Featured but nobody asks: ${list(cold.map((p) => p.name))}. Swap them for styles in demand.`);
  findings.push(
    `Home page: ${hotList.length ? `${plural(hotList.length, "style")} in Hot products` : "Hot products uses the built-in pick"}, ${arrivals.length ? `${plural(arrivals.length, "style")} in New arrivals` : "New arrivals uses the built-in pick"}.`,
  );
  return {
    status: hot.length || cold.length ? "attention" : "ok",
    headline: hot.length ? `${plural(hot.length, "style")} in demand but not featured` : cold.length ? `${plural(cold.length, "featured style")} get no inquiries` : "Featured styles match demand",
    metrics: [
      { label: "Featured", value: n(feat.length) },
      { label: "Hot, not featured", value: n(hot.length), tone: hot.length ? "warn" : "good" },
      { label: "Featured, cold", value: n(cold.length), tone: cold.length ? "warn" : "good" },
    ],
    findings,
  };
}

function seasons({ d, x }: Facts): TeamInsight {
  const s = d.content.seasons;
  const copy = d.content.seasonCopy;
  const withCopy = SEASON_IDS.filter((id) => copy[id]?.hero || copy[id]?.campaign);
  const off = SEASON_IDS.filter((id) => s.campaigns[id]?.live === false);
  const pinned = Object.fromEntries(SEASON_IDS.map((id) => [id, Object.values(d.content.products).filter((p) => p.seasons?.includes(id)).length]));
  const asked = (x.inq?.seasons90 ?? []).filter((r) => r._id);
  const askedNoCopy = asked.filter((r) => !withCopy.includes(r._id as (typeof SEASON_IDS)[number]));
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
  const findings = [
    s.auto ? "Each visitor sees the season in their own country." : `Everyone sees the ${s.fallback} season (automatic seasons are off).`,
    withCopy.length ? `Seasons with their own hero or campaign words: ${list(withCopy.map(cap), 6)}.` : "No season has its own hero or campaign words yet: every season uses the built-in text.",
  ];
  if (asked.length) findings.push(`Inquiries by season (90 d): ${list(asked.map((r) => `${cap(r._id!)} ${r.n}`), 6)}.`);
  if (askedNoCopy.length) findings.push(`Buyers inquire during ${list(askedNoCopy.map((r) => cap(r._id!)))} but it still has the built-in words: write its campaign in Seasons.`);
  if (off.length) findings.push(`Campaign banner switched off for ${list(off.map(cap))}.`);
  const pinnedAny = SEASON_IDS.filter((id) => pinned[id]);
  if (pinnedAny.length) findings.push(`Styles pinned: ${list(pinnedAny.map((id) => `${cap(id)} ${pinned[id]}`), 6)}.`);
  return {
    status: askedNoCopy.length ? "attention" : "ok",
    headline: askedNoCopy.length ? `${cap(askedNoCopy[0]._id!)} brings inquiries but has no campaign of its own` : `${withCopy.length} of ${SEASON_IDS.length} seasons have their own campaign`,
    metrics: [
      { label: "Mode", value: s.auto ? "By country" : `Fixed: ${s.fallback}` },
      { label: "Own campaign", value: `${withCopy.length}/${SEASON_IDS.length}`, tone: withCopy.length >= 3 ? "good" : "warn" },
      { label: "Banners off", value: n(off.length), tone: off.length ? "warn" : "muted" },
    ],
    findings,
  };
}

function web({ d }: Facts): TeamInsight {
  const v = d.visitors;
  if (!v || !v.sessions) return limited("No visits logged in the last 7 days");
  const empty = v.searches.filter((s) => !s.found);
  const unpublished = Object.values(d.content.pages).filter((p) => p.published === false).length;
  const findings = [
    `${plural(v.sessions, "visit")} this week, ${v.pagesPerVisit.toFixed(1)} pages each; ${v.onePage}% saw one page.`,
    `Top pages: ${list(v.topPages.slice(0, 4).map((p) => `${p.page} (${n(p.n)})`), 4)}.`,
    `Devices: ${v.devices.map((x) => `${x.name} ${x.share}%`).join(", ")}.`,
  ];
  if (v.searches.length) findings.push(`Most searched: ${list(v.searches.slice(0, 4).map((s) => `“${s.q}” (${s.n})`), 4)}.`);
  if (empty.length) findings.push(`Searches that found nothing: ${list(empty.map((s) => `“${s.q}” (${s.n})`))}. Add those words to style tags or descriptions.`);
  if (unpublished) findings.push(`${plural(unpublished, "page")} unpublished.`);
  return {
    status: empty.length ? "attention" : "ok",
    headline: empty.length ? `${plural(empty.length, "search", "searches")} find nothing` : `${plural(v.sessions, "visit")} this week, ${v.pagesPerVisit.toFixed(1)} pages each`,
    metrics: [
      { label: "Visits (7 d)", value: n(v.sessions) },
      { label: "Pages / visit", value: v.pagesPerVisit.toFixed(1) },
      { label: "Live now", value: n(v.live), tone: v.live ? "good" : "muted" },
      { label: "Empty searches", value: n(empty.length), tone: empty.length ? "warn" : "good" },
    ],
    findings,
  };
}

function desk({ d, x }: Facts): TeamInsight {
  const s = d.inquiryStats;
  if (!s) return limited("No database: the inquiry pipeline can't be read");
  const won = x.inq?.decided90.find((r) => r._id === "won")?.n ?? 0;
  const lost = x.inq?.decided90.find((r) => r._id === "lost")?.n ?? 0;
  const p = x.inq?.pairs30[0];
  const intents = x.inq?.intents30 ?? [];
  const slow = s.medianReplyHours != null && s.medianReplyHours > 24;
  const findings = [
    `Pipeline: ${s.byStatus.new} new, ${s.byStatus.replied} replied, ${s.byStatus.quoted} quoted, ${s.byStatus.won} won, ${s.byStatus.lost} lost.`,
    s.overdue ? `${plural(s.overdue, "inquiry", "inquiries")} past 20 hours without a reply: answer these first.` : "Nothing is overdue.",
    s.medianReplyHours != null ? `Median first reply (30 d): ${s.medianReplyHours.toFixed(1)} h${slow ? ", slower than the 24 h promised on the site" : ""}.` : "No replies recorded in the last 30 days.",
  ];
  if (won + lost) findings.push(`Win rate (90 d): ${pct(won, won + lost)} (${won} won, ${lost} lost).`);
  if (p?.n) findings.push(`Average inquiry: ${n(Math.round(p.avg))} pairs; ${plural(p.under, "inquiry", "inquiries")} below the ${n(MOQ_PAIRS)}-pair MOQ in 30 days.`);
  if (intents.length) findings.push(`Buyers asked for: ${list(intents.map((i) => `${i._id.replace("_", " ")} ${i.n}`), 5)}.`);
  return {
    status: s.overdue || slow ? "attention" : "ok",
    headline: s.overdue ? `${plural(s.overdue, "inquiry", "inquiries")} overdue for a reply` : s.byStatus.new ? `${plural(s.byStatus.new, "new inquiry", "new inquiries")} waiting` : "Every inquiry has an answer",
    metrics: [
      { label: "Waiting", value: n(s.byStatus.new), tone: s.byStatus.new ? "warn" : "good" },
      { label: "Overdue", value: n(s.overdue), tone: s.overdue ? "bad" : "good" },
      { label: "Median reply", value: s.medianReplyHours != null ? `${s.medianReplyHours.toFixed(1)} h` : "—", tone: slow ? "bad" : undefined },
      { label: "Win rate (90 d)", value: won + lost ? pct(won, won + lost) : "—" },
    ],
    findings,
  };
}

function care({ d, x }: Facts): TeamInsight {
  if (!d.inquiryStats || !x.inq) return limited("No database: follow-ups can't be read");
  const repeat = x.inq.repeat;
  const stale = x.inq.staleQuotesN[0]?.n ?? 0;
  const quiet = x.inq.staleReplied[0]?.n ?? 0;
  const stuck = d.inquiryStats.emailsStuck;
  const days = (at: Date) => Math.round((Date.now() - new Date(at).getTime()) / DAY);
  const findings: string[] = [];
  if (stale) findings.push(`${plural(stale, "quote")} with no answer for over 7 days: ${list(x.inq.staleQuotes.map((q) => `${q.company} (${q.ref}, ${days(q.statusAt)} d)`))}. Send a follow-up.`);
  if (quiet) findings.push(`${plural(quiet, "replied inquiry", "replied inquiries")} quiet for 5+ days without a quote.`);
  if (stuck) findings.push(`${plural(stuck, "inquiry", "inquiries")} with emails that keep failing: open them in Inquiries and resend.`);
  findings.push(repeat.length ? `${plural(repeat.length, "buyer")} came back with 2+ inquiries this year: ${list(repeat.map((r) => `${r.company} (${r.n})`))}.` : "No repeat buyers yet this year.");
  if (!stale && !quiet && !stuck) findings.unshift("Every quote and reply is moving.");
  return {
    status: stale || stuck ? "attention" : "ok",
    headline: stale ? `${plural(stale, "quote")} need a follow-up` : stuck ? `${plural(stuck, "inquiry", "inquiries")} with failing emails` : `${plural(repeat.length, "repeat buyer")} this year`,
    metrics: [
      { label: "Quotes to chase", value: n(stale), tone: stale ? "warn" : "good" },
      { label: "Quiet replies", value: n(quiet), tone: quiet ? "warn" : "good" },
      { label: "Emails failing", value: n(stuck), tone: stuck ? "bad" : "good" },
      { label: "Repeat buyers", value: n(repeat.length), tone: repeat.length ? "good" : "muted" },
    ],
    findings,
  };
}

const VITAL_LABEL: Record<Vital, string> = { lcp: "LCP", inp: "INP", cls: "CLS", fcp: "FCP", ttfb: "TTFB" };
const showVital = (v: Vital, x: number) => (v === "cls" ? x.toFixed(2) : x >= 1000 ? `${(x / 1000).toFixed(1)} s` : `${Math.round(x)} ms`);
const vitalTone = (v: Vital, x: number): Tone => (x <= THRESHOLDS[v][0] ? "good" : x <= THRESHOLDS[v][1] ? "warn" : "bad");

function engineering({ d, h }: Facts): TeamInsight {
  const usage = d.agent.today ?? { calls: 0, tokens: 0 };
  const platform = [
    d.ready ? "Database connected." : "No database connected (MONGODB_URI).",
    d.ai.ready ? `AI model: ${d.ai.provider === "gemini" ? "Google Gemini" : "AI Gateway"}, ${n(usage.calls)} of ${n(d.limits.rpd)} calls and ${(usage.tokens / 1e6).toFixed(2)} M of ${(d.limits.tpd / 1e6).toFixed(1)} M tokens used today.` : "No AI key set: Kai and Vela answer from built-in rules.",
  ];
  const stuck = d.inquiryStats?.emailsStuck ?? 0;
  if (stuck) platform.push(`${plural(stuck, "inquiry", "inquiries")} with failing emails.`);
  if (!h || !h.samples) {
    return {
      status: h?.errors ? "attention" : "limited",
      headline: h?.errors ? `${plural(h.errors, "JavaScript error")} this week` : "Waiting for the first speed readings",
      metrics: [{ label: "JS errors (7 d)", value: n(h?.errors ?? 0), tone: h?.errors ? "bad" : "muted" }],
      findings: ["Real-visitor speed readings start arriving as buyers browse the updated site (half of visits report).", ...platform],
    };
  }
  const vitals = (["lcp", "inp", "cls", "ttfb"] as const).filter((v) => h.p75[v] != null);
  const bad = vitals.filter((v) => vitalTone(v, h.p75[v]!) !== "good");
  const findings = [`Speed for real visitors (75th percentile, 7 d, ${n(h.samples)} readings): ${vitals.map((v) => `${VITAL_LABEL[v]} ${showVital(v, h.p75[v]!)}`).join(", ")}.`];
  if (bad.length) findings.push(`Needs work: ${bad.map((v) => VITAL_LABEL[v]).join(", ")} (above Google's "good" line).`);
  if (h.slowPages.length) findings.push(`Slowest pages (LCP): ${list(h.slowPages.slice(0, 3).map((p) => `${p.path} ${showVital("lcp", p.lcp)}`))}.`);
  if (h.errors) findings.push(`${plural(h.errors, "JavaScript error")} from ${plural(h.errorVisits, "visit")}: ${list(h.topErrors.slice(0, 3).map((e) => `“${e.message.slice(0, 80)}” ×${e.n} on ${e.path}`))}.`);
  else findings.push("No JavaScript errors reported this week.");
  findings.push(...platform);
  return {
    status: h.errors || bad.length || stuck ? "attention" : "ok",
    headline: h.errors ? `${plural(h.errors, "JavaScript error")} this week` : bad.length ? `${bad.map((v) => VITAL_LABEL[v]).join(" and ")} slower than good` : "Fast and error-free for real visitors",
    metrics: [
      ...vitals.slice(0, 3).map((v) => ({ label: `${VITAL_LABEL[v]} (p75)`, value: showVital(v, h.p75[v]!), tone: vitalTone(v, h.p75[v]!) })),
      { label: "JS errors (7 d)", value: n(h.errors), tone: h.errors ? ("bad" as const) : ("good" as const) },
    ],
    findings,
  };
}

const BUILDERS: Record<TeamId, (f: Facts) => TeamInsight> = { marketing, conversion, markets, trending, catalogue, showcase, seasons, web, desk, care, engineering };

async function compute(): Promise<VelaInsights> {
  const [d, x, h] = await Promise.all([panelData(), dbReady() ? extraFacts() : Promise.resolve({ inq: null, vis: null }), safe("health", null, healthSummary)]);
  const f: Facts = { d, x, h };
  const teams = Object.fromEntries(
    TEAMS.map((t) => {
      if (!d.ready) return [t.id, limited("No database connected", ["Set MONGODB_URI so the team can read the site's data."])];
      try {
        return [t.id, BUILDERS[t.id](f)];
      } catch (e) {
        console.error(`[vela] team ${t.id}`, e);
        return [t.id, limited("This team's figures couldn't be read just now")];
      }
    }),
  ) as Record<TeamId, TeamInsight>;
  const won = x.inq?.decided90.find((r) => r._id === "won")?.n ?? 0;
  const lost = x.inq?.decided90.find((r) => r._id === "lost")?.n ?? 0;
  const notConnected: string[] = [];
  if (!d.ready) notConnected.push("Database (MONGODB_URI): no inquiries, visits or speed readings");
  if (d.ready && !h?.samples) notConnected.push("Real-visitor speed: no readings yet (they arrive as visitors browse)");
  if (!d.ai.ready) notConnected.push("AI model key: Vela answers from the teams' findings only");
  return {
    generatedAt: new Date().toISOString(),
    overview: {
      inquiries30: x.inq?.last30[0]?.n ?? 0,
      visits7: d.visitors?.sessions ?? 0,
      waiting: d.inquiryStats?.byStatus.new ?? 0,
      overdue: d.inquiryStats?.overdue ?? 0,
      medianReplyHours: d.inquiryStats?.medianReplyHours ?? null,
      winRate90: won + lost ? pct(won, won + lost) : null,
      jsErrors7: h?.errors ?? 0,
    },
    teams,
    notConnected,
  };
}

/** The insights in the shape the model reads: switched-off teams left out. */
export function insightsForPrompt(i: VelaInsights, paused: TeamId[] = []) {
  return {
    generatedAt: i.generatedAt,
    overview: i.overview,
    teams: Object.fromEntries(TEAMS.filter((t) => !paused.includes(t.id)).map((t) => [t.name, i.teams[t.id]])),
    notConnected: i.notConnected,
  };
}
