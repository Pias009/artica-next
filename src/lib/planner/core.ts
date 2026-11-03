/*
 * The Business Planner's arithmetic: when a season can still be caught, what an order really costs landed, what it
 * makes at different sell-throughs, and how much cash it ties up and for how long. Pure functions with no imports,
 * so the page, Kai and the tests all run the same numbers (data comes in from planner/index.ts).
 */

export const DAY = 86_400_000;
/** Calendar days, so a date never slips to 11 pm the day before across a clock change. */
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.round(n));
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

/* ---- Timing ---- */

export type Lead = {
  /** Production after the order is confirmed. */
  bulk: number;
  /** Sea transit to the buyer's market (the slow end of its range). */
  transit: number;
  /** Customs, unpacking and ticketing at the buyer's end. */
  prep: number;
  /** First orders only: samples, then the buyer's review. */
  samples: number;
  review: number;
  /** Stock should land at least this long before the season starts. */
  safety: number;
};

export type Verdict = "on-time" | "tight" | "late";
export type Window = { season: string; start: Date; end: Date };
export type Timed = Window & { orderBy: Date; arrival: Date; verdict: Verdict; daysToOrderBy: number; daysOfSelling: number };

/**
 * The selling seasons in the buyer's climate over the next `horizon` months, from a month-by-month table (January
 * first). Consecutive months of one season make one window; the current season is included even if it began earlier.
 */
export function seasonWindows(months: readonly string[], today: Date, horizon = 15, extra: Window[] = []): Window[] {
  const out: Window[] = [];
  const y = today.getFullYear();
  const m0 = today.getMonth();
  // start a little back so the season under way is found from its first month
  for (let i = -4; i < horizon; i++) {
    const first = new Date(y, m0 + i, 1);
    const season = months[first.getMonth()];
    const last = out[out.length - 1];
    if (last && last.season === season && last.end.getTime() + DAY >= first.getTime()) last.end = new Date(y, m0 + i + 1, 0);
    else out.push({ season, start: first, end: new Date(y, m0 + i + 1, 0) });
  }
  return [...out, ...extra]
    .filter((w) => w.end >= today && w.start <= addDays(today, horizon * 30))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Order lead time from confirming to the shelf, in days. */
export const leadDays = (l: Lead, firstOrder: boolean) => l.bulk + l.transit + l.prep + (firstOrder ? l.samples + l.review : 0);

/**
 * For each window: the last day to order so stock lands `safety` days before it starts, when stock ordered today
 * would arrive, and the verdict. On time: lands before the season. Tight: lands in its first third. Late: after that,
 * when most of the selling is over; buying for it means carrying the stock to next year or marking it down.
 */
export function timeWindows(windows: Window[], today: Date, lead: Lead, firstOrder: boolean): Timed[] {
  const total = leadDays(lead, firstOrder);
  const arrival = addDays(today, total);
  return windows.map((w) => {
    const orderBy = addDays(w.start, -(total + lead.safety));
    const third = addDays(w.start, daysBetween(w.start, w.end) / 3);
    const verdict: Verdict = arrival <= addDays(w.start, -lead.safety) ? "on-time" : arrival <= third ? "tight" : "late";
    return { ...w, orderBy, arrival, verdict, daysToOrderBy: daysBetween(today, orderBy), daysOfSelling: Math.max(0, daysBetween(arrival > w.start ? arrival : w.start, w.end)) };
  });
}

/** The season to buy for now: the first one stock can still reach in time. */
export const buyNow = (timed: Timed[]) => timed.find((t) => t.verdict === "on-time") ?? timed.find((t) => t.verdict === "tight");

/* ---- Freight ---- */

export type Freight = {
  /** Shared container: price per cubic metre. */
  lclPerCbm: number;
  /** A whole container, by size. */
  container: Record<string, number>;
};

/** Freight for a load: by volume under the LCL threshold, else per container. */
export function freightCost(load: { cbm: number; lcl: boolean; containerId: string; count: number }, rates: Freight) {
  return load.lcl ? Math.max(1, load.cbm) * rates.lclPerCbm : load.count * (rates.container[load.containerId] ?? 0);
}

/* ---- Landed cost ---- */

export type CostInput = {
  pairs: number;
  /** Price per pair on the quote, ex-factory or FOB. */
  fob: number;
  freight: number;
  insurancePct: number;
  dutyPct: number;
  /** Duty charged on goods + freight + insurance (EU, UK and most markets) or on goods alone (US). */
  dutyOn: "cif" | "fob";
  /** Import VAT / GST: shown, but recoverable for a registered business, so left out of the landed cost. */
  vatPct: number;
  /** Inspection, bank transfer, broker and the like, in total. */
  fees: number;
};

export function landedCost(c: CostInput) {
  const goods = c.pairs * c.fob;
  const insurance = (goods + c.freight) * (c.insurancePct / 100);
  const customsValue = c.dutyOn === "cif" ? goods + c.freight + insurance : goods;
  const duty = customsValue * (c.dutyPct / 100);
  const vat = (goods + c.freight + insurance + duty) * (c.vatPct / 100);
  const total = goods + c.freight + insurance + duty + c.fees;
  const parts = { goods, freight: c.freight, insurance, duty, fees: c.fees };
  return { ...parts, vat, total, perPair: c.pairs ? total / c.pairs : 0, share: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, total ? v / total : 0])) as Record<keyof typeof parts, number> };
}

/* ---- Price and margin ---- */

/** The selling price that leaves `margin` (0–1) of it as gross margin. */
export const priceForMargin = (landed: number, margin: number) => (margin >= 1 ? landed : landed / (1 - margin));

/**
 * What the order makes when `sellThrough` of it sells at full price and the rest at `markdownPct` off. Break-even is
 * the share that must sell at full price, with nothing from the rest, to cover the landed cost.
 */
export function outcomes({ pairs, landed, price, markdownPct, sellThrough }: { pairs: number; landed: number; price: number; markdownPct: number; sellThrough: number[] }) {
  const cost = pairs * landed;
  const scenarios = sellThrough.map((s) => {
    const revenue = pairs * s * price + pairs * (1 - s) * price * (1 - markdownPct / 100);
    const profit = revenue - cost;
    return { sellThrough: s, revenue, profit, margin: revenue ? profit / revenue : 0, roi: cost ? profit / cost : 0 };
  });
  return { cost, unitMargin: price ? (price - landed) / price : 0, markup: landed ? price / landed : 0, breakEven: price && pairs ? Math.min(1, cost / (pairs * price)) : 1, scenarios };
}

/* ---- Cash ---- */

export type CashMonth = { month: Date; out: number; in: number; balance: number };

/**
 * Month by month: the deposit when the order is placed, the balance with freight and insurance when it ships, duty
 * when it lands, then sales spread over the selling days (markdowns in the last month). Returns the months, the most
 * cash tied up at once, and the month the order has paid for itself (if within the season).
 */
export function cashflow(p: {
  orderDate: Date;
  lead: Lead;
  firstOrder: boolean;
  depositPct: number;
  goods: number;
  freight: number;
  insurance: number;
  duty: number;
  fees: number;
  sellFrom: Date;
  sellTo: Date;
  fullPriceRevenue: number;
  markdownRevenue: number;
}) {
  const samples = p.firstOrder ? p.lead.samples + p.lead.review : 0;
  const ships = addDays(p.orderDate, samples + p.lead.bulk);
  const lands = addDays(ships, p.lead.transit);
  const from = new Date(Math.max(p.sellFrom.getTime(), addDays(lands, p.lead.prep).getTime()));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const months = new Map<string, CashMonth>();
  const at = (d: Date) => {
    const k = key(d);
    if (!months.has(k)) months.set(k, { month: new Date(d.getFullYear(), d.getMonth(), 1), out: 0, in: 0, balance: 0 });
    return months.get(k)!;
  };
  at(p.orderDate).out += p.goods * (p.depositPct / 100) + p.fees;
  at(ships).out += p.goods * (1 - p.depositPct / 100) + p.freight + p.insurance;
  at(lands).out += p.duty;
  // sales: even per selling day; markdowns in the season's last month
  const days = Math.max(1, daysBetween(from, p.sellTo));
  for (let d = 0; d < days; d++) at(addDays(from, d)).in += p.fullPriceRevenue / days;
  at(p.sellTo).in += p.markdownRevenue;

  // every month from the order to the end of the season, quiet ones included, so the chart reads as a timeline
  const sorted = [...months.values()].sort((a, b) => a.month.getTime() - b.month.getTime());
  const list: CashMonth[] = [];
  for (let d = sorted[0].month; d <= sorted[sorted.length - 1].month; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) list.push(at(d));
  let running = 0;
  for (const m of list) m.balance = running += m.in - m.out;
  const peak = Math.max(0, -Math.min(0, ...list.map((m) => m.balance)));
  const payback = list.find((m, i) => m.balance >= 0 && i > 0 && list[i - 1].balance < 0)?.month ?? null;
  return { months: list, peak, payback, ships, lands, sellFrom: from };
}
