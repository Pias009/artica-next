/*
 * The Business Planner with the site's real data: lead times, per-market transit, the buyer's climate, the catalog
 * and the order terms. One `runPlan` turns a buyer's answers into the whole plan (timing, styles, landed cost,
 * margin, cash) plus the desk's notes, so the /business-plan page, Kai and the inquiry note all say the same thing.
 * The arithmetic itself lives in core.ts (pure and unit-tested).
 */

import { EXPORT_DOCS, LEAD_DAYS, load, marketOf, REVIEW_DAYS, SHELF_DAYS, type Market } from "../buyer-desk";
import { country, inSentence } from "../countries";
import { categoryOf, MOQ_CASES, PACK, PRIVATE_LABEL_MIN, products, STEP_CASES, TIERS, type Product, type ProductLine } from "../products";
import { SEASON_DATA, SEASONS, type SeasonId } from "../season";
import { seasonPicks } from "../season-products";
import { addDays, buyNow, cashflow, daysBetween, freightCost, landedCost, outcomes, priceForMargin, seasonWindows, timeWindows, type Freight, type Lead, type Timed, type Window } from "./core";

export * from "./core";

/* ---- Who the buyer is ---- */

export type Level = "new" | "growing" | "pro";
export type Role = "core" | "seasonal" | "test";

export const LEVELS: Record<Level, { name: string; who: string; styles: number; split: Record<Role, number>; margin: number; promise: string }> = {
  new: {
    name: "Starting out",
    who: "First shop, market stall or online store, or your first import from China.",
    styles: 3,
    split: { core: 0.8, seasonal: 0.2, test: 0 },
    margin: 0.55,
    promise: "Plain steps, a small proven first order, and samples before you commit.",
  },
  growing: {
    name: "Shop running",
    who: "A shop or online store that already sells shoes and wants better margins and timing.",
    styles: 6,
    split: { core: 0.6, seasonal: 0.3, test: 0.1 },
    margin: 0.55,
    promise: "A core-plus-seasonal mix, early reorders and freight that pays its way.",
  },
  pro: {
    name: "Distributor or brand",
    who: "Distributors, chains and private-label brands buying by the container.",
    styles: 8,
    split: { core: 0.5, seasonal: 0.3, test: 0.2 },
    margin: 0.4,
    promise: "Numbers first: a full assortment, container-optimised, private label from 600 pairs.",
  },
};

export const ROLE_LABEL: Record<Role, string> = { core: "Proven core", seasonal: "Seasonal", test: "Test" };

/* ---- Timing for a country ---- */

type Climate = keyof typeof SEASON_DATA.months;
/** When we don't ship there yet: a typical sea transit from Guangzhou, labelled as an estimate. */
export const DEFAULT_TRANSIT = 35;
/** Stock should be in the shop at least two weeks before the season starts. */
export const SAFETY_DAYS = 14;

/** The slow end of a market's transit ("30–36 days" → 36): planning on the fast end is how seasons get missed. */
const slowTransit = (m?: Market) => {
  const n = m?.transit.match(/\d+/g)?.map(Number) ?? [];
  return n.length ? Math.max(...n) : DEFAULT_TRANSIT;
};

export function leadFor(m?: Market): Lead {
  return { bulk: LEAD_DAYS.bulk, transit: slowTransit(m), prep: SHELF_DAYS, samples: LEAD_DAYS.samples, review: REVIEW_DAYS, safety: SAFETY_DAYS };
}

export const seasonName = (id: string) => (id in SEASONS ? SEASONS[id as SeasonId].name : id);
/** A window's stable key, for picking a target season in forms and links. */
export const windowKey = (w: Window) => `${w.season}-${w.start.getFullYear()}-${w.start.getMonth() + 1}`;

/** Every selling window in the next 14 months for a country, with its order-by date and verdict. */
export function timingFor(code: string, today: Date, firstOrder: boolean) {
  const c = country(code);
  const climate: Climate = (SEASON_DATA.countries[c?.code ?? ""] as Climate | undefined) ?? "north";
  const market = c ? marketOf(c.name) : undefined;
  const lead = leadFor(market);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // the Nov 20 – Dec 31 gifting rush, where the site's own season calendar has one
  const holiday: Window[] = SEASON_DATA.holiday.includes(climate)
    ? [0, 1].map((y) => ({ season: "holiday", start: new Date(day.getFullYear() + y, 10, 20), end: new Date(day.getFullYear() + y, 11, 31) }))
    : [];
  const windows = timeWindows(seasonWindows(SEASON_DATA.months[climate], day, 14, holiday), day, lead, firstOrder);
  return {
    country: c,
    climate,
    market,
    lead,
    transitEstimate: !market,
    leadDays: lead.bulk + lead.transit + lead.prep + (firstOrder ? lead.samples + lead.review : 0),
    windows,
    now: buyNow(windows),
  };
}

/* ---- What to buy ---- */

export type PlanLine = { id: string; cases: number };
export type Pick = PlanLine & { role: Role; product: Product; pairs: number; category: string };

const pool = (lines: ProductLine[]) => products.filter((p) => !lines.length || lines.includes(p.line));

/** The season's best styles for the buyer's customers, proven sellers (Top reorder, Trending) first. */
export function stylesFor(season: string, lines: ProductLine[], n: number) {
  const id = (season === "holiday" ? "winter" : season) as SeasonId;
  const ranked = seasonPicks(id in SEASONS ? id : "winter", 40, pool(lines));
  const proven = ranked.filter((p) => p.badge === "Top reorder" || p.badge === "Trending");
  return [...proven, ...ranked.filter((p) => !proven.includes(p))].slice(0, n);
}

/** Share of the budget held back for freight, insurance and fees when the planner suggests quantities. */
export const ALLOWANCE = 0.08;

/**
 * A budget turned into styles × cases: the level's number of styles (fewer if the budget can't reach the minimum
 * on each), split core / seasonal / test by the level's shares, in whole steps of 5 cases above the 25-case minimum.
 */
export function suggestLines({ level, season, lines, budget, fob, dutyPct = 0 }: { level: Level; season: string; lines: ProductLine[]; budget: number; fob: number; dutyPct?: number }): PlanLine[] {
  const L = LEVELS[level];
  // the budget is all the cash: keep about 8% for freight, insurance and fees, plus the duty
  const casePrice = Math.max(0.01, fob) * PACK * (1 + ALLOWANCE + dutyPct / 100);
  const total = Math.floor(Math.max(0, budget) / casePrice);
  const fit = Math.max(1, Math.min(L.styles, Math.floor(total / MOQ_CASES)));
  const picks = stylesFor(season, lines, fit);
  const roles = rolesFor(level, picks.length);
  const want = picks.map((p, i) => {
    const same = roles.filter((r) => r === roles[i]).length;
    return { id: p.id, role: roles[i], cases: Math.max(MOQ_CASES, Math.floor((L.split[roles[i]] * total) / same / STEP_CASES) * STEP_CASES) };
  });
  // anything left over goes to the proven styles, 5 cases at a time; too much comes off the biggest
  let left = Math.max(total, picks.length * MOQ_CASES) - want.reduce((n, w) => n + w.cases, 0);
  for (let i = 0; left >= STEP_CASES && want.length; i = (i + 1) % want.length) {
    if (want[i].role === "core" || !want.some((w) => w.role === "core")) {
      want[i].cases += STEP_CASES;
      left -= STEP_CASES;
    }
  }
  while (left < 0) {
    const big = want.reduce((a, b) => (b.cases >= a.cases ? b : a));
    if (big.cases <= MOQ_CASES) break;
    big.cases -= STEP_CASES;
    left += STEP_CASES;
  }
  return want.map(({ id, cases }) => ({ id, cases }));
}

/** Which styles are the proven core, which seasonal and which a test, in pick order: the level's shares of n, rounded so they add up. */
function rolesFor(level: Level, n: number): Role[] {
  const split = Object.entries(LEVELS[level].split).filter(([, v]) => v > 0) as [Role, number][];
  const count = split.map(([r, v]) => ({ r, n: Math.floor(n * v), rest: n * v - Math.floor(n * v) }));
  for (const c of [...count].sort((a, b) => b.rest - a.rest).slice(0, n - count.reduce((t, c) => t + c.n, 0))) c.n++;
  // always at least one proven style
  if (!count[0].n && n) {
    count[0].n = 1;
    count.find((c, i) => i && c.n)!.n--;
  }
  return count.flatMap((c) => Array<Role>(c.n).fill(c.r));
}

/* ---- The whole plan ---- */

/** Clearly-labelled example figures until the buyer enters their own. The site shows no prices. */
export const EXAMPLE = {
  fob: 14,
  freight: { lclPerCbm: 95, container: { "20gp": 2600, "40gp": 3900, "40hc": 4100 } } as Freight,
  insurancePct: 0.5,
  fees: 350,
  markdownPct: 50,
  sellThrough: 0.8,
  depositPct: 30,
};

export type PlanInput = {
  level: Level;
  /** ISO country code. */
  country: string;
  firstOrder: boolean;
  lines: ProductLine[];
  /** windowKey of the season to buy for; empty means the first one still catchable. */
  target: string;
  budget: number;
  fob: number;
  styles: PlanLine[];
  freight: Freight;
  insurancePct: number;
  dutyPct: number;
  vatPct: number;
  fees: number;
  /** The buyer's own selling price per pair; 0 means "use the target margin". */
  price: number;
  targetMargin: number;
  markdownPct: number;
  sellThrough: number;
  depositPct: number;
};

export function defaultPlan(level: Level = "new", code = "US"): PlanInput {
  return {
    level,
    country: code,
    firstOrder: level !== "pro",
    lines: [],
    target: "",
    budget: level === "new" ? 15000 : level === "growing" ? 40000 : 120000,
    fob: EXAMPLE.fob,
    styles: [],
    freight: EXAMPLE.freight,
    insurancePct: EXAMPLE.insurancePct,
    dutyPct: 0,
    vatPct: 0,
    fees: EXAMPLE.fees,
    price: 0,
    targetMargin: LEVELS[level].margin,
    markdownPct: EXAMPLE.markdownPct,
    sellThrough: EXAMPLE.sellThrough,
    depositPct: EXAMPLE.depositPct,
  };
}

const byIdMap = new Map(products.map((p) => [p.id, p]));

function computePlan(input: PlanInput, today: Date) {
  const timing = timingFor(input.country, today, input.firstOrder);
  const target = timing.windows.find((w) => windowKey(w) === input.target) ?? timing.now ?? timing.windows[0];
  const lines = input.styles.length ? input.styles : suggestLines({ level: input.level, season: target.season, lines: input.lines, budget: input.budget, fob: input.fob, dutyPct: input.dutyPct });
  const roles = rolesFor(input.level, lines.length);
  const picks: Pick[] = lines.flatMap((l, i) => {
    const product = byIdMap.get(l.id);
    return product ? [{ ...l, role: roles[i], product, pairs: l.cases * PACK, category: categoryOf(product) }] : [];
  });
  const cases = picks.reduce((n, p) => n + p.cases, 0);
  const pairs = cases * PACK;
  const shipment = load(cases);
  const freight = freightCost({ cbm: shipment.cbm, lcl: shipment.lcl, containerId: shipment.container.id, count: shipment.count }, input.freight);
  // the US charges duty on the goods' value; the EU, UK and most others on goods + freight + insurance
  const dutyOn = timing.country?.code === "US" ? "fob" : "cif";
  const cost = landedCost({ pairs, fob: input.fob, freight, insurancePct: input.insurancePct, dutyPct: input.dutyPct, dutyOn, vatPct: input.vatPct, fees: input.fees });
  const price = input.price > 0 ? input.price : Math.ceil(priceForMargin(cost.perPair, input.targetMargin)) - 0.01;
  const sellThrough = [0.6, 0.8, 1];
  const margin = outcomes({ pairs, landed: cost.perPair, price, markdownPct: input.markdownPct, sellThrough });
  const chosen = outcomes({ pairs, landed: cost.perPair, price, markdownPct: input.markdownPct, sellThrough: [input.sellThrough] }).scenarios[0];
  const orderDate = target.orderBy > today ? target.orderBy : new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const cash = cashflow({
    orderDate,
    lead: timing.lead,
    firstOrder: input.firstOrder,
    depositPct: input.depositPct,
    goods: cost.goods,
    freight: cost.freight,
    insurance: cost.insurance,
    duty: cost.duty + cost.vat,
    fees: cost.fees,
    sellFrom: target.start,
    sellTo: target.end,
    fullPriceRevenue: pairs * input.sellThrough * price,
    markdownRevenue: pairs * (1 - input.sellThrough) * price * (1 - input.markdownPct / 100),
  });
  return { input, today, timing, target, orderDate, picks, cases, pairs, shipment, cost, price, margin, chosen, cash };
}
type Core = ReturnType<typeof computePlan>;

export function runPlan(input: PlanInput, today: Date) {
  const plan = computePlan(input, today);
  return { ...plan, notes: deskNotes(plan), checks: checks(plan) };
}
export type Plan = ReturnType<typeof runPlan>;

/* ---- What the desk would tell the buyer ---- */

/** "a, b and c" (capitalised first word when it starts a sentence). */
const list = (xs: string[], cap = false) => {
  const s = xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : (xs[0] ?? "");
  return cap ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};
const usd = (n: number, d = 0) => `${n < -0.005 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
export const fmt = { usd, pct, date: (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) };

/** The next tier the order is short of, per style: private label at 600 pairs, tier pricing at 1,000. */
function nextTier(pairs: number) {
  return TIERS.find((t) => t.pairs > pairs);
}

/** Freight per pair now, and after topping up to the next full load, when that's close and cheaper. */
function topUp(p: Core) {
  const { shipment, cases } = p;
  const rate = (c: number) => {
    const s = load(c);
    return freightCost({ cbm: s.cbm, lcl: s.lcl, containerId: s.container.id, count: s.count }, p.input.freight) / (c * PACK);
  };
  const full = shipment.lcl ? null : Math.round(shipment.count * shipment.container.cases);
  if (!shipment.lcl && full && full > cases && shipment.fill >= 0.7) return { add: full - cases, now: rate(cases), then: rate(full), what: `fill your ${shipment.container.name}` };
  return null;
}

export type DeskNote = { desk: "Buying" | "Timing & logistics" | "Finance" | "Marketing" | "Next steps"; who: string; points: string[] };

function deskNotes(p: Core): DeskNote[] {
  const { timing, target, picks, cost, price, margin, chosen, cash, input } = p;
  const level = LEVELS[input.level];
  const late = timing.windows.filter((w) => w.verdict === "late" && w.end > p.today && w.start <= addDays(p.today, 60));
  const name = (w: Timed) => seasonName(w.season).toLowerCase();
  const where = timing.country ? inSentence(timing.country.name) : "your market";
  const thin = picks.filter((x) => x.pairs < TIERS[1].pairs).length;

  const buying: string[] = [
    `For ${name(target)} in ${where} we'd put ${picks.length} ${picks.length === 1 ? "style" : "styles"} on the order: ${picks.map((x) => x.product.name).join(", ")}.`,
    input.level === "new"
      ? `Keep it to one colour per style for the first order. Each colour is its own ${MOQ_CASES * PACK}-pair minimum, and fewer colours means fewer leftovers.`
      : `About ${pct(level.split.core)} of the budget is in proven sellers, ${pct(level.split.seasonal)} in seasonal styles${level.split.test ? ` and ${pct(level.split.test)} in a test style you can drop or reorder` : ""}.`,
  ];
  if (input.level === "pro" && picks.some((x) => x.pairs >= PRIVATE_LABEL_MIN)) buying.push(`Styles at ${PRIVATE_LABEL_MIN}+ pairs can carry your own brand. Allow an extra week for logo approval.`);
  else if (thin && input.level !== "new") buying.push(`${thin} of the styles sit at the minimum. If one is a likely winner, moving it to ${TIERS[1].pairs} pairs opens private label.`);

  const timingPts: string[] = [];
  if (late.length) timingPts.push(`${list(late.map((w) => seasonName(w.season).toLowerCase()), true)} stock ordered today lands too late to sell at full price: about ${timing.leadDays} days from order to shelf.`);
  timingPts.push(
    target.verdict === "on-time"
      ? `Order by ${fmt.date(target.orderBy)} and the stock is in your shop around ${fmt.date(addDays(target.start, -SAFETY_DAYS))}, two weeks before ${name(target)} starts.`
      : target.verdict === "tight"
        ? `It's tight: ordered now it arrives around ${fmt.date(target.arrival)}, after ${name(target)} has begun, leaving about ${target.daysOfSelling} selling days.`
        : `Ordered now this stock arrives around ${fmt.date(target.arrival)}, when ${name(target)} is mostly over. Plan for the next one instead.`,
  );
  timingPts.push(
    `${timing.lead.bulk} days production, ${timing.lead.transit} days at sea${timing.transitEstimate ? " (our estimate for your country; the desk confirms it)" : ` (${timing.market?.name})`}, ${timing.lead.prep} days customs and unpacking${input.firstOrder ? `, plus ${timing.lead.samples + timing.lead.review} days for samples and your review` : ""}.`,
  );
  if (input.firstOrder) timingPts.push(`First import: we suggest DDP, so the price includes duty and delivery to your door. Papers: ${EXPORT_DOCS.join(", ").toLowerCase()}.`);
  const top = topUp(p);
  timingPts.push(
    p.shipment.lcl
      ? `${p.cases} cases (${p.shipment.cbm.toFixed(1)} m³) go in a shared container (LCL). From 100 cases a container of your own usually costs less per pair.`
      : `${p.cases} cases fill ${pct(p.shipment.fill)} of ${p.shipment.count > 1 ? `${p.shipment.count} × ` : "a "}${p.shipment.container.name}.${top ? ` ${top.add} more cases ${top.what} and bring freight from ${usd(top.now, 2)} to ${usd(top.then, 2)} a pair.` : ""}`,
  );
  if (timing.market?.rules.length) timingPts.push(`For ${timing.market.name}: ${timing.market.rules.slice(0, 2).join("; ")}. Your customs broker confirms the rest.`);

  const finance: string[] = [
    `Landed, each pair costs about ${usd(cost.perPair, 2)}${input.dutyPct ? "" : " before duty (add your rate above)"}. Selling at ${usd(price, 2)} leaves a ${pct(margin.unitMargin)} margin.`,
    `You break even once ${pct(margin.breakEven)} of the pairs sell at full price. At ${pct(input.sellThrough)} sell-through, with the rest at ${input.markdownPct}% off, the order makes about ${usd(chosen.profit)}.`,
    `Cash: ${usd(cost.goods * (input.depositPct / 100) + cost.fees)} when you order (the ${input.depositPct}% deposit and fees), ${usd(cost.goods * (1 - input.depositPct / 100) + cost.freight + cost.insurance)} when it ships, before any sales come in. The most you have tied up at once is about ${usd(cash.peak)}.`,
  ];
  if (cash.peak > input.budget * 1.05) finance.push(`That's more than the ${usd(input.budget)} budget you entered. Trim a style or keep a reserve for the balance payment.`);
  if (cash.payback) finance.push(`On these numbers the order has paid for itself by ${cash.payback.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.`);

  const hero = picks.find((x) => x.product.badge === "Top reorder" || x.product.badge === "Trending") ?? picks[0];
  const marketing: string[] = [
    `Start teasing the new styles on ${fmt.date(addDays(cash.sellFrom, -14))}, two weeks before launch, open on ${fmt.date(cash.sellFrom)}, and push again mid-season around ${fmt.date(addDays(cash.sellFrom, daysBetween(cash.sellFrom, target.end) / 2))}.`,
    hero
      ? `Lead with ${hero.product.name} in your window and ads${hero.product.badge ? `: it's one of our ${hero.product.badge === "Top reorder" ? "most reordered" : "trending"} styles` : ""}. One strong story sells better than many small ones.`
      : "Lead with one hero style in your window and ads: one strong story sells better than many small ones.",
    `Set the markdown date now: ${fmt.date(addDays(target.end, -21))}, three weeks before the season ends, clears what's left without eating into the full-price weeks.`,
  ];

  const next: string[] = [];
  if (input.firstOrder) next.push(`Order samples first: ${timing.lead.samples} days to you. The order-by date above already allows for them.`);
  next.push(`Reorder rule of thumb: if a style sells 40% in its first 3–4 weeks, reorder then. A reorder takes about ${timing.lead.bulk + timing.lead.transit + timing.lead.prep} days to reach you.`);
  next.push(`Send the plan to the trade desk and they'll come back within 24 hours with your prices, the shipping quote and the dates confirmed.`);

  const who = timing.country ? inSentence(timing.country.name) : "you";
  return [
    { desk: "Buying", who: "Merchandising", points: buying },
    { desk: "Timing & logistics", who: `Shipping to ${who}`, points: timingPts },
    { desk: "Finance", who: "Cost, margin and cash", points: finance },
    { desk: "Marketing", who: "Launch and selling", points: marketing },
    { desk: "Next steps", who: "Before you order", points: next },
  ];
}

/** Short warnings for the summary rail: only the ones that apply. */
function checks(p: Core): string[] {
  const out: string[] = [];
  if (p.target.verdict === "late") out.push(`Too late for ${seasonName(p.target.season).toLowerCase()} if ordered now.`);
  if (p.target.verdict === "tight") out.push("Tight: arrives after the season starts.");
  if (!p.input.dutyPct) out.push("No duty rate entered yet.");
  if (p.cash.peak > p.input.budget * 1.05) out.push("Cash needed is above your budget.");
  if (p.margin.breakEven > 0.75) out.push("High break-even: check your price.");
  const tier = p.picks.length ? nextTier(Math.min(...p.picks.map((x) => x.pairs))) : undefined;
  if (tier && p.input.level === "pro" && tier.pairs <= PRIVATE_LABEL_MIN) out.push(`Some styles are below ${tier.pairs} pairs (${tier.label.toLowerCase()}).`);
  return out;
}

/** The plan as plain text: the inquiry note the trade desk receives, and the printed summary's core. */
export function planSummary(p: Plan) {
  const t = p.target;
  return [
    `Business plan: ${LEVELS[p.input.level].name}, selling in ${p.timing.country?.name ?? p.input.country}${p.input.firstOrder ? ", first import" : ""}.`,
    `Season: ${seasonName(t.season)} ${t.start.getFullYear()} (${fmt.date(t.start)} – ${fmt.date(t.end)}). Order by ${fmt.date(t.orderBy)}.`,
    `Styles: ${p.picks.map((x) => `${x.product.name} ${x.cases} cases`).join(", ")}. Total ${p.pairs.toLocaleString("en-US")} pairs, ${p.shipment.lcl ? "LCL" : `${p.shipment.count} × ${p.shipment.container.name}`}.`,
    `Planning figures (buyer's): ${usd(p.input.fob, 2)}/pair FOB, duty ${p.input.dutyPct}%, landed ≈ ${usd(p.cost.perPair, 2)}/pair, selling ${usd(p.price, 2)}, margin ${pct(p.margin.unitMargin)}, peak cash ≈ ${usd(p.cash.peak)}.`,
    "Please confirm prices, freight and dates.",
  ].join("\n");
}

/** Days until a date, for "in 12 days" labels. */
export const daysTo = (today: Date, d: Date) => daysBetween(new Date(today.getFullYear(), today.getMonth(), today.getDate()), d);
