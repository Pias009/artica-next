import "server-only";
import { cache } from "react";
import { dashboard } from "./inquiries";
import { auditLog } from "./auth";
import { ensureVisitIndexes, visits } from "../analytics/visits";
import { country } from "../countries";
import { readContent } from "../content/store";
import { aiReady, provider } from "../assistant/model";
import { askStats, type AskStats } from "../assistant/questions";
import { HOME_SECTIONS } from "../home-sections";
import { database, dbReady, inquiries, type Status } from "../leads/db";
import type { Intent } from "../leads/mail";
import { builtInProducts, type Product } from "../products";
import { SITE_PAGES } from "../site-pages";

/*
 * Everything the admin dashboard shows, read in one go for the signed-in admin (app/admin/(dashboard)/page.tsx):
 * the site edits, the catalogue as built, real inquiries and their stats, the visitor log and Kai's activity. Each part
 * fails soft: a part that can't be read comes back empty and the view says so, instead of the panel failing.
 */

const DAY = 86_400_000;
const flag = (code?: string | null) => (code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");

/** Rough centres, to pin markets on the dashboard's world map. */
const COORDS: Record<string, [lon: number, lat: number]> = {
  US: [-98, 39],
  CA: [-106, 56],
  MX: [-102, 23],
  BR: [-51, -10],
  CL: [-71, -33],
  AR: [-64, -34],
  GB: [-2, 54],
  IE: [-8, 53],
  DE: [10, 51],
  FR: [2, 46],
  NL: [5, 52],
  BE: [4, 50],
  IT: [12, 42],
  ES: [-4, 40],
  PT: [-8, 39],
  PL: [19, 52],
  SE: [15, 62],
  NO: [9, 61],
  DK: [10, 56],
  FI: [26, 64],
  AT: [14, 47],
  CH: [8, 47],
  CZ: [15, 50],
  RU: [60, 56],
  TR: [35, 39],
  AE: [54, 24],
  SA: [45, 24],
  IN: [78, 22],
  BD: [90, 24],
  PK: [70, 30],
  CN: [104, 35],
  JP: [138, 36],
  KR: [128, 36],
  SG: [104, 1],
  MY: [102, 4],
  TH: [101, 15],
  VN: [106, 16],
  PH: [122, 12],
  ID: [117, -2],
  AU: [134, -25],
  NZ: [172, -41],
  ZA: [24, -29],
  NG: [8, 9],
  KE: [38, 0],
  EG: [30, 27],
  IL: [35, 31],
};
const at = ([lon, lat]: [number, number]) => ({
  x: ((lon + 180) / 360) * 100,
  y: ((90 - lat) / 180) * 100,
});
export const HOME_PIN = at([113.3, 23.1]);

async function safe<T>(what: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[admin] ${what}`, e);
    return fallback;
  }
}

/* ---- products ---- */

async function productRows() {
  const asked = dbReady()
    ? await safe("product interest", [] as { _id: string; n: number }[], () =>
        inquiries()
          .aggregate<{ _id: string; n: number }>([
            {
              $match: {
                createdAt: { $gte: new Date(Date.now() - 90 * DAY) },
                status: { $ne: "spam" },
              },
            },
            { $unwind: "$lines" },
            { $group: { _id: "$lines.productId", n: { $sum: 1 } } },
          ])
          .toArray(),
      )
    : [];
  const count = new Map(asked.map((a) => [a._id, a.n]));
  const built = builtInProducts();
  // straight from the database: the site's copy of the catalogue leaves out new styles that are still hidden
  const { added } = await readContent();
  return [...built, ...added].map((p: Product, i) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    image: p.outer.src,
    /** The whole style before any edit; the Products view lays `content.products` over it. */
    base: p,
    added: i >= built.length,
    inquiries: count.get(p.id) ?? 0,
  }));
}
export type PanelProduct = Awaited<ReturnType<typeof productRows>>[number];

/* ---- how each style performs ---- */

export type StyleFlag = "rising" | "falling" | "looked-not-asked" | "no-views";
export type StyleStats = {
  /** Visits that opened its page, last 30 days. */
  views: number;
  /** Visits that put it on the inquiry list, last 30 days. */
  adds: number;
  /** Inquiries naming it: last 30 days, the 30 before, and won in the last 90. */
  inquiries: number;
  before: number;
  won: number;
  flags: StyleFlag[];
};

/**
 * Per style: page views and list adds (visitor log), inquiries this month against last month, orders won. The flags
 * point at what to act on: rising or falling interest, a page people look at but don't ask about, a live style nobody
 * opens. Needs a few weeks of traffic to say much; until then most figures are 0.
 */
async function productStats(rows: { id: string; base: { slug: string } }[]): Promise<Record<string, StyleStats>> {
  if (!dbReady()) return {};
  const now = Date.now();
  const d30 = new Date(now - 30 * DAY);
  const bySlug = new Map(rows.map((r) => [`/products/${r.base.slug}`, r.id]));
  const [views, adds, inq] = await Promise.all([
    safe("style views", [] as { _id: string; n: number }[], () =>
      visits()
        .aggregate<{ _id: string; n: number }>([
          { $match: { kind: "view", at: { $gte: d30 }, path: { $regex: "^/products/" } } },
          { $group: { _id: { p: "$path", s: "$sid" } } },
          { $group: { _id: "$_id.p", n: { $sum: 1 } } },
        ])
        .toArray(),
    ),
    safe("style adds", [] as { _id: string; n: number }[], () =>
      visits()
        .aggregate<{ _id: string; n: number }>([
          { $match: { kind: "add", at: { $gte: d30 } } },
          { $group: { _id: { p: "$pid", s: "$sid" } } },
          { $group: { _id: "$_id.p", n: { $sum: 1 } } },
        ])
        .toArray(),
    ),
    safe("style inquiries", [] as { _id: string; now: number; before: number; won: number }[], () =>
      inquiries()
        .aggregate<{ _id: string; now: number; before: number; won: number }>([
          { $match: { createdAt: { $gte: new Date(now - 90 * DAY) }, status: { $ne: "spam" } } },
          { $unwind: "$lines" },
          {
            $group: {
              _id: "$lines.productId",
              now: { $sum: { $cond: [{ $gte: ["$createdAt", d30] }, 1, 0] } },
              before: { $sum: { $cond: [{ $and: [{ $lt: ["$createdAt", d30] }, { $gte: ["$createdAt", new Date(now - 60 * DAY)] }] }, 1, 0] } },
              won: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
            },
          },
        ])
        .toArray(),
    ),
  ]);
  const v = new Map<string, number>();
  for (const x of views) {
    const id = bySlug.get(x._id);
    if (id) v.set(id, (v.get(id) ?? 0) + x.n);
  }
  const a = new Map(adds.map((x) => [x._id, x.n]));
  const q = new Map(inq.map((x) => [x._id, x]));
  // "nobody opened it" means something only once the catalogue gets real traffic: 150 product-page visits a month
  const anyTraffic = views.reduce((t, x) => t + x.n, 0) >= 150;
  return Object.fromEntries(
    rows.map((r) => {
      const st = { views: v.get(r.id) ?? 0, adds: a.get(r.id) ?? 0, inquiries: q.get(r.id)?.now ?? 0, before: q.get(r.id)?.before ?? 0, won: q.get(r.id)?.won ?? 0 };
      const flags: StyleFlag[] = [];
      if (st.inquiries >= 2 && st.inquiries >= st.before * 1.5 + 1) flags.push("rising");
      if (st.before >= 3 && st.inquiries <= st.before / 2) flags.push("falling");
      if (st.views >= 15 && st.adds + st.inquiries === 0) flags.push("looked-not-asked");
      if (anyTraffic && st.views === 0) flags.push("no-views");
      return [r.id, { ...st, flags }];
    }),
  );
}

/* ---- inquiries ---- */

async function inquiryData() {
  if (!dbReady()) return { rows: [], stats: null };
  const [rows, stats] = await Promise.all([
    safe("inquiries", [], () =>
      inquiries()
        .find(
          { status: { $ne: "spam" } },
          {
            projection: {
              ref: 1,
              company: 1,
              email: 1,
              country: 1,
              buyerType: 1,
              intent: 1,
              pairs: 1,
              status: 1,
              createdAt: 1,
              note: 1,
              lines: 1,
              ipCountry: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .limit(150)
        .toArray(),
    ),
    safe("inquiry stats", null, () => dashboard()),
  ]);
  return {
    rows: rows.map((r) => ({
      ref: r.ref,
      company: r.company,
      email: r.email,
      country: r.country,
      flag: flag(country(r.country)?.code ?? r.ipCountry),
      buyerType: r.buyerType,
      intent: r.intent as Intent,
      pairs: r.pairs,
      status: r.status as Exclude<Status, "spam">,
      createdAt: r.createdAt.toISOString(),
      note: (r.note ?? "").slice(0, 600),
      styles: r.lines.map((l) => l.name),
    })),
    stats,
  };
}
export type PanelInquiry = Awaited<ReturnType<typeof inquiryData>>["rows"][number];

/* ---- dashboard figures ---- */

async function overviewData() {
  if (!dbReady()) return null;
  const now = new Date();
  const since6 = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return safe("overview", null, async () => {
    const since12 = new Date(now.getTime() - 12 * 7 * DAY);
    const weekNo = (field: string) => ({
      $floor: { $divide: [{ $subtract: [field, since12] }, 7 * DAY] },
    });
    const [week, months, markets, views, leadWeeks, visitWeeks] = await Promise.all([
      inquiries()
        .aggregate<{ _id: number; n: number }>([
          {
            $match: {
              createdAt: { $gte: new Date(now.getTime() - 7 * DAY) },
              status: { $ne: "spam" },
            },
          },
          {
            $group: {
              _id: {
                $isoDayOfWeek: {
                  date: "$createdAt",
                  timezone: "Asia/Shanghai",
                },
              },
              n: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      inquiries()
        .aggregate<{
          _id: { y: number; m: number };
          leads: number;
          replied: number;
        }>([
          {
            $match: { createdAt: { $gte: since6 }, status: { $ne: "spam" } },
          },
          {
            $group: {
              _id: {
                y: { $year: "$createdAt" },
                m: { $month: "$createdAt" },
              },
              leads: { $sum: 1 },
              replied: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$firstReplyAt", null] },
                        {
                          $lte: [{ $subtract: ["$firstReplyAt", "$createdAt"] }, DAY],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
      inquiries()
        .aggregate<{ _id: string; n: number }>([
          {
            $match: {
              createdAt: { $gte: new Date(now.getTime() - 90 * DAY) },
              status: { $ne: "spam" },
            },
          },
          { $group: { _id: "$country", n: { $sum: 1 } } },
          { $sort: { n: -1 } },
          { $limit: 6 },
        ])
        .toArray(),
      visits().countDocuments({
        kind: "view",
        at: { $gte: new Date(now.getTime() - 7 * DAY) },
      }),
      inquiries()
        .aggregate<{ _id: number; n: number }>([
          {
            $match: { createdAt: { $gte: since12 }, status: { $ne: "spam" } },
          },
          { $group: { _id: weekNo("$createdAt"), n: { $sum: 1 } } },
        ])
        .toArray(),
      visits()
        .aggregate<{ _id: number; n: number }>([
          { $match: { at: { $gte: since12 } } },
          { $group: { _id: { w: weekNo("$at"), sid: "$sid" } } },
          { $group: { _id: "$_id.w", n: { $sum: 1 } } },
        ])
        .toArray()
        .catch(() => []),
    ]);
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const total = markets.reduce((a, m) => a + m.n, 0) || 1;
    return {
      week: DAYS.map((day, i) => ({
        day,
        n: week.find((w) => w._id === i + 1)?.n ?? 0,
      })),
      months: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const m = months.find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1);
        return {
          m: d.toLocaleDateString("en-US", { month: "short" }),
          leads: m?.leads ?? 0,
          replied: m?.replied ?? 0,
        };
      }),
      markets: markets.map((m) => {
        const c = country(m._id);
        const xy = c && COORDS[c.code] ? at(COORDS[c.code]) : null;
        return {
          name: c?.name ?? m._id,
          share: Math.round((m.n / total) * 100),
          n: m.n,
          ...(xy ?? { x: -10, y: -10 }),
          pinned: !!xy,
        };
      }),
      viewsWeek: views,
      /** The last 12 weeks, oldest first: visits (browser sessions) and inquiries. */
      weeks: Array.from({ length: 12 }, (_, i) => ({
        label: `W${i + 1}`,
        visits: visitWeeks.find((w) => w._id === i)?.n ?? 0,
        leads: leadWeeks.find((w) => w._id === i)?.n ?? 0,
      })),
    };
  });
}

/* ---- visitors ---- */

const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;

/*
 * Each visit gets a name made from its anonymous id, so two visitors are never confused in the panel: the same visit
 * always has the same name and colour, and nothing in it says who they are. A visitor who gave their email (an
 * inquiry, the line-sheet signup) is shown by it instead.
 */
const ADJECTIVES = ["Amber", "Brisk", "Cedar", "Coral", "Dusky", "Ember", "Fable", "Frost", "Golden", "Hazel", "Indigo", "Jade", "Lunar", "Maple", "Misty", "Navy", "Olive", "Pebble", "Quiet", "Rusty", "Sage", "Scarlet", "Silver", "Stormy", "Sunny", "Teal", "Velvet", "Willow"];
const ANIMALS = ["Badger", "Crane", "Deer", "Falcon", "Finch", "Fox", "Hare", "Heron", "Ibis", "Jay", "Lark", "Lynx", "Marten", "Moose", "Otter", "Owl", "Panda", "Puffin", "Raven", "Robin", "Seal", "Sparrow", "Stoat", "Swan", "Tern", "Wolf", "Wren", "Yak"];
const nickname = (sid: string) => {
  const n = parseInt(sid.slice(0, 8), 16) || 0;
  return { name: `${ADJECTIVES[n % ADJECTIVES.length]} ${ANIMALS[Math.floor(n / ADJECTIVES.length) % ANIMALS.length]}`, tag: sid.slice(-4).toUpperCase(), hue: parseInt(sid.slice(8, 12), 16) % 360 || 0 };
};
/** What a step in a footprint was, in the panel's words. */
const STEP_KIND = { view: "Opened", search: "Searched", add: "Added to list", inquiry: "Opened the inquiry form", contact: "Gave their email" } as const;

async function visitorData() {
  if (!dbReady()) return null;
  return safe("visitors", null, async () => {
    await ensureVisitIndexes();
    const now = Date.now();
    const week = new Date(now - 7 * DAY);
    type Session = {
      _id: string;
      first: Date;
      last: Date;
      country: string | null;
      device: string;
      source: string;
      steps: { path: string; at: Date; kind: keyof typeof STEP_KIND; q?: string; pid?: string; email?: string; via?: "inquiry" | "signup"; ref?: string; company?: string }[];
    };
    const [recent, facets] = await Promise.all([
      visits()
        .aggregate<Session>([
          { $match: { at: { $gte: new Date(now - DAY) } } },
          { $sort: { at: 1 } },
          {
            $group: {
              _id: "$sid",
              first: { $first: "$at" },
              last: { $last: "$at" },
              country: { $first: "$country" },
              device: { $first: "$device" },
              source: { $first: "$source" },
              steps: {
                $push: { path: "$path", at: "$at", kind: "$kind", q: "$q", pid: "$pid", email: "$email", via: "$via", ref: "$ref", company: "$company" },
              },
            },
          },
          { $sort: { last: -1 } },
          { $limit: 60 },
        ])
        .toArray(),
      visits()
        .aggregate<{
          sessions: { n: number }[];
          catalog: { n: number }[];
          product: { n: number }[];
          started: { n: number }[];
          sources: { _id: string; n: number }[];
          devices: { _id: string; n: number }[];
          hours: { _id: number; n: number }[];
          exits: { _id: string; n: number }[];
          pageViews: { _id: string; n: number }[];
          searches: { _id: string; n: number; found: number }[];
          single: { n: number }[];
        }>([
          { $match: { at: { $gte: week } } },
          {
            $facet: {
              sessions: [{ $group: { _id: "$sid" } }, { $count: "n" }],
              catalog: [{ $match: { kind: "view", path: "/catalog" } }, { $group: { _id: "$sid" } }, { $count: "n" }],
              product: [{ $match: { kind: "view", path: { $regex: "^/products/" } } }, { $group: { _id: "$sid" } }, { $count: "n" }],
              started: [{ $match: { kind: "inquiry" } }, { $group: { _id: "$sid" } }, { $count: "n" }],
              sources: [
                { $sort: { at: 1 } },
                { $group: { _id: "$sid", s: { $first: "$source" } } },
                { $group: { _id: "$s", n: { $sum: 1 } } },
                { $sort: { n: -1 } },
              ],
              devices: [{ $group: { _id: "$sid", d: { $first: "$device" } } }, { $group: { _id: "$d", n: { $sum: 1 } } }],
              hours: [
                { $match: { kind: "view" } },
                {
                  $group: {
                    _id: { $hour: { date: "$at", timezone: "Asia/Shanghai" } },
                    n: { $sum: 1 },
                  },
                },
              ],
              exits: [
                { $match: { kind: "view" } },
                { $sort: { at: 1 } },
                { $group: { _id: "$sid", p: { $last: "$path" } } },
                { $group: { _id: "$p", n: { $sum: 1 } } },
                { $sort: { n: -1 } },
                { $limit: 6 },
              ],
              pageViews: [{ $match: { kind: "view" } }, { $group: { _id: "$path", n: { $sum: 1 } } }],
              single: [{ $match: { kind: "view" } }, { $group: { _id: "$sid", n: { $sum: 1 } } }, { $match: { n: 1 } }, { $count: "n" }],
              searches: [
                { $match: { kind: "search" } },
                { $sort: { at: 1 } },
                {
                  $group: {
                    _id: "$q",
                    n: { $sum: 1 },
                    found: { $last: "$found" },
                  },
                },
                { $sort: { n: -1 } },
                { $limit: 8 },
              ],
            },
          },
        ])
        .next(),
    ]);
    const sent = await inquiries().countDocuments({
      createdAt: { $gte: week },
      status: { $ne: "spam" },
    });
    const f = facets!;
    const sessions = f.sessions[0]?.n ?? 0;
    const share = (list: { _id: string; n: number }[]) => {
      const t = list.reduce((a, x) => a + x.n, 0) || 1;
      return list.map((x) => ({
        name: x._id ?? "Unknown",
        share: Math.round((x.n / t) * 100),
      }));
    };
    const views = new Map(f.pageViews.map((p) => [p._id, p.n]));
    const viewCount = f.pageViews.reduce((a, p) => a + p.n, 0);
    return {
      sessions,
      pagesPerVisit: sessions ? viewCount / sessions : 0,
      onePage: sessions ? Math.round(((f.single[0]?.n ?? 0) / sessions) * 100) : 0,
      topPages: [...f.pageViews]
        .sort((a, b) => b.n - a.n)
        .slice(0, 6)
        .map((p) => ({ page: p._id, n: p.n })),
      live: recent.filter((s) => now - s.last.getTime() < 5 * 60_000).length,
      people: recent.map((s) => {
        const c = country(s.country);
        const steps = s.steps.filter((x) => x.kind === "view");
        const contact = [...s.steps].reverse().find((x) => x.kind === "contact" && x.email);
        const nick = nickname(s._id);
        const name = (id?: string) => (id && builtInProducts().find((p) => p.id === id)?.name) || id;
        return {
          id: s._id,
          name: nick.name,
          tag: nick.tag,
          hue: nick.hue,
          email: contact?.email ?? null,
          gmail: !!contact?.email && /@(gmail|googlemail)\.com$/i.test(contact.email),
          company: contact?.company ?? null,
          via: contact?.via ?? null,
          ref: contact?.ref ?? null,
          pages: steps.length,
          minutes: Math.max(1, Math.round((s.last.getTime() - s.first.getTime()) / 60_000)),
          firstSeen: s.first.toISOString(),
          /** Everything the visit did, in order: pages, searches, styles added, the form, the email given. */
          footprint: s.steps.map((x) => ({
            kind: x.kind,
            label: STEP_KIND[x.kind] ?? "Opened",
            page: x.path,
            detail: x.kind === "search" ? `“${x.q}”` : x.kind === "add" ? name(x.pid) : x.kind === "contact" ? `${x.email}${x.via === "signup" ? " · line-sheet signup" : x.ref ? ` · inquiry ${x.ref}` : ""}` : undefined,
            at: x.at.toISOString(),
            after: clock(x.at.getTime() - s.first.getTime()),
          })),
          flag: flag(c?.code),
          country: c?.name ?? "Unknown",
          device: s.device as "Desktop" | "Mobile" | "Tablet",
          source: s.source,
          searched: s.steps.find((x) => x.q)?.q,
          live: now - s.last.getTime() < 5 * 60_000,
          left: steps[steps.length - 1]?.path,
          trail: steps.map((x) => ({
            page: x.path,
            at: clock(x.at.getTime() - s.first.getTime()),
          })),
          lastSeen: s.last.toISOString(),
        };
      }),
      funnel: [
        { step: "Visited", page: "Any page", n: sessions },
        {
          step: "Browsed the catalog",
          page: "/catalog",
          n: f.catalog[0]?.n ?? 0,
        },
        {
          step: "Opened a style",
          page: "/products/…",
          n: f.product[0]?.n ?? 0,
        },
        {
          step: "Opened the inquiry form",
          page: "Inquiry form",
          n: f.started[0]?.n ?? 0,
        },
        { step: "Sent an inquiry", page: "Inquiries", n: sent },
      ],
      exits: f.exits.map((e) => ({
        page: e._id,
        exits: e.n,
        rate: Math.round((e.n / (views.get(e._id) || e.n)) * 100),
      })),
      sources: share(f.sources),
      devices: share(f.devices),
      hours: Array.from({ length: 24 }, (_, h) => f.hours.find((x) => x._id === h)?.n ?? 0),
      searches: f.searches.map((s) => ({
        q: s._id,
        n: s.n,
        found: s.found ?? 0,
      })),
      pageViews: Object.fromEntries(views),
    };
  });
}
export type PanelVisitors = NonNullable<Awaited<ReturnType<typeof visitorData>>>;

/* ---- Kai ---- */

const ACTIONS: Record<string, string> = {
  reply_drafted: "Drafted a reply",
  vela_team: "Vela team switched",
  content_saved: "Site edits saved",
  status: "Inquiry moved",
  retry_emails: "Emails resent",
  sign_in: "Signed in",
  sign_in_skipped: "Opened the panel (dev)",
};

async function agentData() {
  const noAsks: AskStats = { days: 7, chats: 0, messages: 0, topics: [], sources: [] };
  if (!dbReady()) return { log: [], today: null, week: [] as { day: string; calls: number; tokens: number }[], asks: noAsks };
  const day = new Date().toISOString().slice(0, 10);
  const week = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10));
  const [log, today, used, asks] = await Promise.all([
    safe("audit", [], () =>
      auditLog()
        .find({ action: { $in: Object.keys(ACTIONS) } })
        .sort({ at: -1 })
        .limit(14)
        .toArray(),
    ),
    safe("usage", null, () => database().collection<{ _id: string; calls: number; tokens: number }>("assistant_usage").findOne({ _id: day })),
    safe("usage week", [], () =>
      database()
        .collection<{ _id: string; calls: number; tokens: number }>("assistant_usage")
        .find({ _id: { $gte: week[0] } })
        .toArray(),
    ),
    safe("kai topics", noAsks, () => askStats(7)),
  ]);
  return {
    log: log.map((e) => ({
      at: e.at.toISOString(),
      text: `${ACTIONS[e.action]}${e.ref ? ` · ${e.ref}` : ""}${e.detail && e.action !== "reply_drafted" ? ` · ${e.detail}` : ""}`,
      who: e.email,
      kind: e.action,
    })),
    today: today ? { calls: today.calls, tokens: today.tokens } : { calls: 0, tokens: 0 },
    /** Model calls and tokens per day, the last 7 days (oldest first, days with none included). */
    week: week.map((d) => {
      const u = used.find((x) => x._id === d);
      return { day: d, calls: u?.calls ?? 0, tokens: u?.tokens ?? 0 };
    }),
    /** What buyers asked Kai, the last 7 days: topics and how they were answered (counts only). */
    asks,
  };
}

async function readPanel() {
  const [content, products, inq, overview, visitors, agent] = await Promise.all([
    readContent(),
    productRows(),
    inquiryData(),
    overviewData(),
    visitorData(),
    agentData(),
  ]);
  const styleStats = await productStats(products);
  return {
    ready: dbReady(),
    content,
    products,
    styleStats,
    pages: SITE_PAGES.filter((p) => !p.path.includes("?")).map((p) => ({
      path: p.path,
      name: p.name,
      summary: p.summary,
      group: p.section,
      views: visitors?.pageViews[p.path] ?? 0,
    })),
    homeSections: HOME_SECTIONS.map((s) => ({ ...s })),
    inquiries: inq.rows,
    inquiryStats: inq.stats,
    overview,
    visitors,
    agent,
    ai: { ready: aiReady(), provider: provider() },
    limits: {
      rpm: Number(process.env.ASSISTANT_RPM) || 10,
      rpd: Number(process.env.ASSISTANT_RPD) || 1000,
      tpd: Number(process.env.ASSISTANT_TPD) || 2_000_000,
    },
    homePin: HOME_PIN,
  };
}
/** The whole dashboard, for the signed-in admin. Read once per request: the layout, a page and Vela's teams share it. */
export const panelData = cache(readPanel);
export type PanelData = Awaited<ReturnType<typeof readPanel>>;
