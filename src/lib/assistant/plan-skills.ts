/*
 * Kai's planning desk: the business planner (src/lib/planner) as skills. The same numbers as /business-plan, worked
 * out in code (zero tokens); the model only explains them. Every figure that depends on the buyer's own prices is
 * labelled as theirs or as an example, never as our price.
 */

import { country, inSentence } from "../countries";
import { defaultPlan, EXAMPLE, fmt, LEVELS, runPlan, seasonName, stylesFor, timingFor, windowKey, type Level, type PlanInput } from "../planner";
import type { ProductLine } from "../products";
import { card, type Card } from "./skills";

/** What the visitor told the planner page (kept in their browser, sent with each planning message). */
export type PlanProfile = { country?: string; level?: Level; firstOrder?: boolean; budget?: number; lines?: ProductLine[] };

const SEASON_WORD = /\b(spring|summer|autumn|fall|winter|holiday|christmas|rainy|monsoon)\b/i;

/** A season name the buyer typed, as the planner's id. */
export const seasonWord = (t?: string) => {
  const w = t?.match(SEASON_WORD)?.[1].toLowerCase();
  return w === "fall" ? "autumn" : w === "christmas" ? "holiday" : w === "monsoon" ? "rainy" : w;
};

const codeOf = (where: string | undefined, profile: PlanProfile) => country(where)?.code ?? country(profile.country)?.code ?? "US";

/** Every selling window for the buyer's country with its order-by date and verdict, and the styles for the one to buy now. */
export function planSeason({ country: where, firstOrder, season }: { country?: string; firstOrder?: boolean; season?: string }, profile: PlanProfile = {}) {
  const today = new Date();
  const first = firstOrder ?? profile.firstOrder ?? true;
  const t = timingFor(codeOf(where, profile), today, first);
  const asked = season ? t.windows.find((w) => w.season === seasonWord(season)) : undefined;
  const focus = asked ?? t.now ?? t.windows[0];
  return {
    country: t.country ? inSentence(t.country.name) : "your market",
    firstOrder: first,
    leadDays: t.leadDays,
    arrivesIfOrderedToday: fmt.date(t.windows[0]?.arrival ?? today),
    transit: `${t.lead.transit} days${t.transitEstimate ? " (estimate)" : ` to ${t.market?.name}`}`,
    seasons: t.windows.map((w) => ({
      season: seasonName(w.season),
      key: windowKey(w),
      sells: `${fmt.date(w.start)} – ${fmt.date(w.end)}`,
      orderBy: fmt.date(w.orderBy),
      daysToOrderBy: w.daysToOrderBy,
      verdict: w.verdict,
    })),
    asked: asked ? seasonName(asked.season) : season ? `${season} (no such season there)` : null,
    buyNow: t.now ? { season: seasonName(t.now.season), orderBy: fmt.date(t.now.orderBy), daysLeft: t.now.daysToOrderBy } : null,
    styles: stylesFor(focus.season, profile.lines ?? [], 4).map(card),
    link: planLink({ country: t.country?.code, firstOrder: first }),
  };
}

/** The whole plan for a budget: styles × cases, landed cost, margin, cash, and the desk's notes. */
export function suggestOrder(
  input: { country?: string; level?: Level; budget?: number; fob?: number; dutyPct?: number; price?: number; lines?: ProductLine[]; season?: string; firstOrder?: boolean },
  profile: PlanProfile = {},
) {
  const level = input.level ?? profile.level ?? "new";
  const base = defaultPlan(level, codeOf(input.country, profile));
  const today = new Date();
  const plan: PlanInput = {
    ...base,
    firstOrder: input.firstOrder ?? profile.firstOrder ?? base.firstOrder,
    budget: input.budget ?? profile.budget ?? base.budget,
    fob: input.fob ?? base.fob,
    dutyPct: input.dutyPct ?? 0,
    price: input.price ?? 0,
    lines: input.lines ?? profile.lines ?? [],
  };
  if (input.season) {
    const w = timingFor(plan.country, today, plan.firstOrder).windows.find((x) => x.season === seasonWord(input.season));
    if (w) plan.target = windowKey(w);
  }
  const p = runPlan(plan, today);
  return {
    level: LEVELS[level].name,
    country: p.timing.country ? inSentence(p.timing.country.name) : "your market",
    season: `${seasonName(p.target.season)} ${p.target.start.getFullYear()}`,
    verdict: p.target.verdict,
    orderBy: fmt.date(p.target.orderBy),
    daysToOrderBy: p.target.daysToOrderBy,
    styles: p.picks.map((x) => ({ ...card(x.product), cases: x.cases, role: x.role })),
    pairs: p.pairs,
    shipping: p.shipment.lcl ? "shared container (LCL)" : `${p.shipment.count} × ${p.shipment.container.name}`,
    figures: {
      fob: `${fmt.usd(plan.fob, 2)}${input.fob ? "" : " (example price; the desk quotes yours)"}`,
      landedPerPair: fmt.usd(p.cost.perPair, 2),
      duty: plan.dutyPct ? `${plan.dutyPct}%` : "not included (buyer's rate needed)",
      price: `${fmt.usd(p.price, 2)}${input.price ? "" : ` (at a ${fmt.pct(plan.targetMargin)} margin)`}`,
      margin: fmt.pct(p.margin.unitMargin),
      breakEven: fmt.pct(p.margin.breakEven),
      profitAt80: fmt.usd(p.margin.scenarios[1].profit),
      peakCash: fmt.usd(p.cash.peak),
      budget: fmt.usd(plan.budget),
    },
    notes: p.notes,
    checks: p.checks,
    link: planLink({ country: plan.country, level, budget: plan.budget, firstOrder: plan.firstOrder }),
  };
}

/** Landed cost and margin for a quantity at the buyer's price, without choosing styles. */
export function estimateLanding(input: { pairs: number; fob?: number; dutyPct?: number; price?: number; country?: string; targetMargin?: number }, profile: PlanProfile = {}) {
  const code = codeOf(input.country, profile);
  const pairs = Math.max(12, Math.round(input.pairs / 12) * 12);
  // one stand-in style of the right size, so the planner prices the right load
  const style = stylesFor("winter", [], 1)[0];
  const plan: PlanInput = {
    ...defaultPlan(profile.level ?? "growing", code),
    firstOrder: profile.firstOrder ?? false,
    fob: input.fob ?? EXAMPLE.fob,
    dutyPct: input.dutyPct ?? 0,
    price: input.price ?? 0,
    targetMargin: input.targetMargin ?? 0.55,
    styles: [{ id: style.id, cases: pairs / 12 }],
  };
  const p = runPlan(plan, new Date());
  const part = (n: number) => `${fmt.usd(n)} (${fmt.usd(n / p.pairs, 2)}/pair)`;
  return {
    country: p.timing.country ? inSentence(p.timing.country.name) : "your market",
    pairs: p.pairs,
    fob: `${fmt.usd(plan.fob, 2)}${input.fob ? "" : " (example price; the desk quotes yours)"}`,
    breakdown: {
      goods: part(p.cost.goods),
      freight: `${part(p.cost.freight)}, ${p.shipment.lcl ? `LCL ${p.shipment.cbm.toFixed(1)} m³` : `${p.shipment.count} × ${p.shipment.container.name}`}, estimate`,
      insurance: part(p.cost.insurance),
      duty: plan.dutyPct ? part(p.cost.duty) : "not included: enter your duty rate",
      fees: `${part(p.cost.fees)}, estimate`,
    },
    landedPerPair: fmt.usd(p.cost.perPair, 2),
    total: fmt.usd(p.cost.total),
    price: fmt.usd(p.price, 2),
    margin: fmt.pct(p.margin.unitMargin),
    breakEven: fmt.pct(p.margin.breakEven),
    scenarios: p.margin.scenarios.map((s) => ({ sellThrough: fmt.pct(s.sellThrough), profit: fmt.usd(s.profit), roi: fmt.pct(s.roi) })),
    vatNote: "Import VAT/GST is left out: a registered business reclaims it.",
    link: planLink({ country: code, budget: Math.round(p.cost.total / 1000) * 1000 }),
  };
}

/** A link that opens /business-plan with these answers filled in. */
export function planLink(q: { country?: string; level?: Level; budget?: number; firstOrder?: boolean }) {
  const s = new URLSearchParams();
  if (q.country) s.set("country", q.country);
  if (q.level) s.set("level", q.level);
  if (q.budget) s.set("budget", String(Math.round(q.budget)));
  if (q.firstOrder !== undefined) s.set("first", q.firstOrder ? "1" : "0");
  const qs = s.toString();
  return `/business-plan${qs ? `?${qs}` : ""}`;
}

export type PlanSeason = ReturnType<typeof planSeason>;
export type PlanOrder = ReturnType<typeof suggestOrder>;
export type PlanLanding = ReturnType<typeof estimateLanding>;
export type { Card };
