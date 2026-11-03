/*
 * The planning desk without the AI model: reads a planning question for what it needs (country, stage, budget,
 * quantity, prices, a season), runs the planner skills and writes a short answer around their cards. Most planning
 * questions are answered here, at zero tokens; the model handles follow-ups, other languages and "why" questions.
 */

import { countryIn } from "../countries";
import { conductReply, OFF_TOPIC_REPLY } from "./conduct";
import { localReply, type LocalReply } from "./local";
import { estimateLanding, planSeason, seasonWord, suggestOrder, type PlanProfile } from "./plan-skills";
import { offTopic } from "./skills";
import type { Level } from "../planner";
import type { ProductLine } from "../products";
import type { SeasonId } from "../season";

type Ctx = { season?: SeasonId; country?: string; requested?: { id: string; inquiries: number }[]; profile: PlanProfile };

const has = (t: string, re: RegExp) => re.test(t);
const num = (s: string) => Number(s.replace(/,/g, ""));
const scale = (n: number, unit?: string) => (/k/i.test(unit ?? "") ? n * 1000 : /m/i.test(unit ?? "") ? n * 1_000_000 : n);

/** The figures a buyer types: "$15k budget", "600 pairs", "$12 a pair", "sell at $40", "duty 17%". */
export function figures(text: string) {
  const t = text.toLowerCase();
  const fob = t.match(/\$?\s?(\d+(?:\.\d+)?)\s?(?:usd|dollars?|\$)?\s?(?:a|per|\/|each)\s?pair/)?.[1];
  const price = t.match(/(?:sell(?:ing)?(?: (?:them|it|price))?(?: at| for)?|retail(?: price)?(?: at| of| is)?|price(?: is| of)?)\s?\$?\s?(\d+(?:\.\d+)?)/)?.[1];
  const pairs = t.match(/(\d[\d,]*)\s?(?:pairs|prs)\b/)?.[1];
  const duty = t.match(/(\d+(?:\.\d+)?)\s?%\s?(?:import )?dut(?:y|ies)|dut(?:y|ies)\D{0,12}(\d+(?:\.\d+)?)\s?%/);
  const budget =
    t.match(/budget\D{0,14}\$?\s?(\d[\d,.]*)\s?(k|m)?\b/) ??
    t.match(/\$\s?(\d[\d,.]*)\s?(k|m)?\b(?!\s?(?:a|per|\/|each)\s?pair)/) ??
    t.match(/(\d[\d,.]*)\s?(k|m)?\s?(?:usd|dollars)\b(?!\s?(?:a|per|\/|each)\s?pair)/);
  const b = budget ? scale(num(budget[1]), budget[2]) : undefined;
  return {
    fob: fob ? num(fob) : undefined,
    price: price && price !== fob ? num(price) : undefined,
    pairs: pairs ? num(pairs) : undefined,
    dutyPct: duty ? num(duty[1] ?? duty[2]) : undefined,
    // a "$14" that is the per-pair price isn't a budget
    budget: b && b >= 500 && b !== (fob ? num(fob) : -1) ? b : undefined,
  };
}

export function levelIn(t: string): Level | undefined {
  if (has(t, /\b(distribut\w*|wholesaler|chain|private[- ]label|own brand|my brand|container|importer)\b/)) return "pro";
  if (has(t, /\b((my|our|run an?|have an?|own an?) (shop|store|boutique)|online store|e-?commerce|already (sell|have)|running|existing)\b/)) return "growing";
  if (has(t, /\b(new|beginner|start(ing)?( out)?|first (time|order|import)|never (imported|ordered)|noob|newbie)\b/)) return "new";
  return undefined;
}

const linesIn = (t: string): ProductLine[] | undefined => {
  const l = (["women", "men", "kids"] as const).filter((x) => has(t, x === "kids" ? /\b(kids?|children|youth)\b/ : x === "women" ? /\b(women|ladies|womens)\b/ : /\b(men|mens|gents)\b/));
  return l.length ? [...l] : undefined;
};

const TIMING = /\b(when|order by|deadline|too late|in time|catch|lead ?time|how long|arrive|arrival|deliver\w*|reach|season|calendar|timeline)\b/;
const COST = /\b(landed|cost|costs|margin|profit|duty|duties|freight|break[- ]?even|cash ?flow|cash|roi|return)\b/;
const PLAN = /\b(plan|start|begin|first order|what (should|to|do) (i )?(buy|order|stock)|budget|assortment|recommend|suggest|which styles|how (much|many) (should|to)|help me)\b/;

export function planReply(message: string, ctx: Ctx): LocalReply {
  const t = message.toLowerCase();
  const tools: LocalReply["tools"] = [];
  const run = <T,>(name: string, input: object, fn: () => T) => {
    const output = fn();
    tools.push({ name, input, output });
    return output;
  };

  const conduct = conductReply(message, /\b(shoes?|boots?|sneakers?|sandals?|footwear|stock|order|season|pairs?)\b/);
  if (conduct) {
    if (conduct.redirect) run("offTopic", {}, () => offTopic({ season: ctx.season }));
    return { text: conduct.text, tools };
  }

  const named = countryIn(message);
  const profile: PlanProfile = { ...ctx.profile, ...(named && { country: named.code }), ...(levelIn(t) && { level: levelIn(t) }), ...(linesIn(t) && { lines: linesIn(t) }) };
  if (!profile.country && ctx.country) profile.country = ctx.country;
  const f = figures(message);
  const season = seasonWord(t);
  const first = has(t, /\b(first (time|order|import)|never (imported|ordered))\b/) ? true : has(t, /\b(reorder|re-order|again|repeat)\b/) ? false : undefined;

  if (!t.trim() || has(t, /^(hi|hello|hey|salam|hola|bonjour|good (morning|afternoon|evening))\b/)) {
    return {
      text: "Hello, this is the planning desk. Tell me where you sell, where you are in business (starting out, shop running, or distributor) and your budget, and I'll work out which season you can still catch, what to order and what it costs landed.",
      tools,
    };
  }

  const wantsCost = has(t, COST);
  const wantsTiming = has(t, TIMING) || (!!season && !f.budget && !f.pairs);
  const wantsPlan = has(t, PLAN) || !!f.budget;

  if (wantsCost && f.pairs && !wantsPlan) {
    const o = run("estimateLanding", { pairs: f.pairs, fob: f.fob, dutyPct: f.dutyPct, price: f.price }, () => estimateLanding({ pairs: f.pairs!, fob: f.fob, dutyPct: f.dutyPct, price: f.price, country: profile.country }, profile));
    return {
      text: `${o.pairs.toLocaleString("en-US")} pairs to ${o.country} at ${o.fob} land at about ${o.landedPerPair} a pair, ${o.total} in all${f.dutyPct === undefined ? ", before duty (tell me your rate and I'll add it)" : ""}. Selling at ${o.price} you break even once ${o.breakEven} of the pairs sell. The breakdown is below; freight and fees are estimates until the desk quotes.`,
      tools,
    };
  }

  if (wantsPlan || (wantsCost && !wantsTiming)) {
    const input = { country: profile.country, level: profile.level, budget: f.budget, fob: f.fob, dutyPct: f.dutyPct, price: f.price, lines: profile.lines, season, firstOrder: first };
    const o = run("suggestOrder", input, () => suggestOrder(input, profile));
    const asked = season && !o.season.toLowerCase().startsWith(season) ? `${season[0].toUpperCase()}${season.slice(1)} can't be reached in time from here, so this plan is for ${o.season}. ` : "";
    return {
      text: `${asked}Here's a first plan for ${o.country}: ${o.styles.length} styles, ${o.pairs.toLocaleString("en-US")} pairs for ${o.season}, to order by ${o.orderBy}${o.daysToOrderBy === 0 ? " (today)" : o.daysToOrderBy > 0 && o.daysToOrderBy <= 30 ? ` (${o.daysToOrderBy} days from now)` : ""}. At ${f.fob ? `your ${o.figures.fob}` : `an example ${o.figures.fob.split(" (")[0]}`} a pair it lands at about ${o.figures.landedPerPair}; selling at ${o.figures.price.split(" (")[0]} you break even at ${o.figures.breakEven} sold, and the most cash it ties up is ${o.figures.peakCash}. Notes from each part of the desk are below.${f.fob ? "" : " Your own quote from the desk will replace the example price."}${profile.level ? "" : " Tell me if you already run a shop or distribute, and I'll adjust the mix."}`,
      tools,
    };
  }

  if (wantsTiming) {
    const o = run("planSeason", { country: profile.country, firstOrder: first, season }, () => planSeason({ country: profile.country, firstOrder: first, season }, profile));
    const asked = season ? o.seasons.find((s) => s.season.toLowerCase().startsWith(season)) : undefined;
    const now = o.buyNow;
    const lead = `From order to your shelf in ${o.country} takes about ${o.leadDays} days${o.firstOrder ? " for a first order with samples" : ""}.`;
    const ask = asked
      ? asked.verdict === "late"
        ? ` ${asked.season} stock ordered today arrives too late to sell at full price.`
        : asked.verdict === "tight"
          ? ` ${asked.season} is tight: ordered today it arrives after the season starts.`
          : ` ${asked.season} is on time if you order by ${asked.orderBy}.`
      : "";
    const next = now ? ` The season to buy for now is ${now.season.toLowerCase()}: order by ${now.orderBy}${now.daysLeft === 0 ? ", today" : now.daysLeft <= 30 ? `, ${now.daysLeft} days from now` : ""}.` : "";
    return { text: `${lead}${ask}${asked?.verdict === "on-time" && asked.season === now?.season ? "" : next} Each season's dates are below.`, tools };
  }

  // a product or terms question asked at the planning desk: the trade answers still apply
  const trade = localReply(message, ctx);
  if (trade.confident !== false && !trade.tools.some((x) => x.name === "offTopic")) return trade;
  if (trade.text === OFF_TOPIC_REPLY) return trade;
  return {
    text: "I can plan the timing, the order and the numbers. Tell me where you sell and your budget, or ask something like \"Is it too late to order for summer?\"",
    tools: [],
    confident: false,
  };
}

/** Like localFirst: the planning answers that never need the model. Null: ask the model. */
export function planFirst(message: string, turns: number, ctx: Ctx): LocalReply | null {
  const m = message.trim();
  const followUp = turns > 1 && m.length < 80 && /\b(it|that|this|those|why|how about|what about|instead|also|more|less|double|half|change|only)\b/i.test(m);
  if (m.length > 200 || /[^\u0000-ɏḀ-ỿ\s\d\p{P}\p{S}]/u.test(m) || followUp || /\bwhy\b/i.test(m)) return null;
  const r = planReply(m, ctx);
  return r.confident === false ? null : r;
}
