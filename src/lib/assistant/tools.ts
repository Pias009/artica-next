import "server-only";
import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { estimateLanding, planSeason, suggestOrder, type PlanProfile } from "./plan-skills";
import { aboutCompany, draftInquiry, findProducts, offTopic, planOrder, policies, POLICY_TOPICS, productDetails, seasonAdvice, shippingInfo, topSellers, type Card } from "./skills";
import { SEASON_IDS, type SeasonId } from "../season";

/**
 * Kai's tools: the skills (skills.ts) with input schemas the model fills in. All read-only; draftInquiry only checks
 * a draft, the buyer sends it. `requested` is the most-asked-for styles, read from the database by the route.
 */
/*
 * What the model reads back from a tool is kept short: the buyer sees full product cards, the model only needs names
 * and the facts it may repeat. Every earlier tool result is sent again on each turn, so this is most of the input
 * tokens in a long chat.
 */
const brief = (c: Card) => `${c.name} (${c.url}): ${c.type}, ${c.color}, ${c.line}${c.badge ? `, ${c.badge}` : ""}${c.seasons.length ? `, suits ${c.seasons.join("/")}` : ""}${c.availability ? `. ${c.availability}` : ""}`;
const text = (value: string) => ({ type: "text" as const, value });
const cards = (label: string, list: Card[]) => `${label} (shown to the buyer as cards): ${list.length ? list.map(brief).join("; ") : "none"}`;

export function makeTools(ctx: { season?: SeasonId; requested: () => Promise<{ id: string; inquiries: number }[]>; profile?: PlanProfile }) {
  const line = z.enum(["men", "women", "kids"]).optional().describe("Product line, if the buyer named one");
  const profile = ctx.profile ?? {};
  const where = z.string().max(60).optional().describe("Country name or ISO code; leave out to use the buyer's");
  return {
    planSeason: tool({
      description:
        "Season timing for the buyer's country: every selling season in the next year with its order-by date and whether stock ordered today arrives on time, tight or too late (production 45 days + sea transit + customs; first orders add samples). Also the season to buy for now and styles for it. Use for any 'when should I order', 'is it too late for…' question.",
      inputSchema: z.object({
        country: where,
        firstOrder: z.boolean().optional().describe("True for a first order (samples first); leave out if unknown"),
        season: z.string().max(20).optional().describe("A season they asked about: spring, summer, autumn, winter, holiday, rainy"),
      }),
      execute: (input) => planSeason(input, profile),
      toModelOutput: ({ output: o }) =>
        text(
          `${o.country}, ${o.firstOrder ? "first order" : "reorder"}: ${o.leadDays} days order to shelf (transit ${o.transit}); ordered today, stock is on the shelf ${o.arrivesIfOrderedToday}. Seasons: ${o.seasons.map((s) => `${s.season} ${s.sells}: ${s.verdict === "on-time" ? `ON TIME, ordering now is early enough (last order date ${s.orderBy})` : s.verdict === "tight" ? `TIGHT, arrives after it starts (order date ${s.orderBy} passed)` : `TOO LATE, arrives after most of the selling`}`).join("; ")}. Buy now for: ${o.buyNow ? `${o.buyNow.season}, order by ${o.buyNow.orderBy} (${o.buyNow.daysLeft} days)` : "nothing catchable"}.${o.asked ? ` Asked about: ${o.asked}.` : ""} Shown as a timeline card. ${cards("Styles for it", o.styles)}. Full plan: ${o.link}`,
        ),
    }),
    suggestOrder: tool({
      description:
        "A complete first plan for a budget, presented by the trade desk's buying, logistics, finance and marketing notes: which styles and how many cases, the season and order-by date, landed cost per pair, selling price, margin, break-even, peak cash. Prices are the buyer's or labelled examples. Shown as a plan card.",
      inputSchema: z.object({
        country: where,
        level: z.enum(["new", "growing", "pro"]).optional().describe("new: starting out; growing: shop or online store running; pro: distributor, chain or own brand"),
        budget: z.number().positive().max(10_000_000).optional().describe("Total budget in USD"),
        fob: z.number().positive().max(500).optional().describe("Price per pair they were quoted, USD; leave out to use the labelled example"),
        dutyPct: z.number().min(0).max(100).optional().describe("Their import duty rate, if they gave it"),
        price: z.number().positive().max(5000).optional().describe("Their selling price per pair, if they gave it"),
        lines: z.array(z.enum(["men", "women", "kids"])).max(3).optional(),
        season: z.string().max(20).optional(),
        firstOrder: z.boolean().optional(),
      }),
      execute: (input) => suggestOrder(input, profile),
      toModelOutput: ({ output: o }) =>
        text(
          `${o.level}, ${o.country}: ${o.season} (${o.verdict}), order by ${o.orderBy}. Styles: ${o.styles.map((s) => `${s.name} ${s.cases} cases (${s.role})`).join(", ")}; ${o.pairs} pairs, ${o.shipping}. FOB ${o.figures.fob}; landed ${o.figures.landedPerPair}/pair; duty ${o.figures.duty}; price ${o.figures.price}; margin ${o.figures.margin}; break-even ${o.figures.breakEven}; profit at 80% sell-through ${o.figures.profitAt80}; peak cash ${o.figures.peakCash} vs budget ${o.figures.budget}.${o.checks.length ? ` Watch: ${o.checks.join(" ")}` : ""} The desk's notes are shown in the card; don't repeat them all. Full plan: ${o.link}`,
        ),
    }),
    estimateLanding: tool({
      description: "Landed cost per pair and margin for a quantity: goods, freight (estimate), insurance, duty (their rate), fees, then price, break-even and profit at 60/80/100% sell-through.",
      inputSchema: z.object({
        pairs: z.number().int().positive().max(1_000_000),
        fob: z.number().positive().max(500).optional().describe("Price per pair, USD; leave out for the labelled example"),
        dutyPct: z.number().min(0).max(100).optional(),
        price: z.number().positive().max(5000).optional().describe("Their selling price per pair"),
        targetMargin: z.number().min(0).max(0.95).optional().describe("0–0.95, e.g. 0.55"),
        country: where,
      }),
      execute: (input) => estimateLanding(input, profile),
      toModelOutput: ({ output: o }) =>
        text(
          `${o.pairs} pairs to ${o.country} at ${o.fob}: ${Object.entries(o.breakdown).map(([k, v]) => `${k} ${v}`).join("; ")}. Landed ${o.landedPerPair}/pair, ${o.total} in all. Price ${o.price}, margin ${o.margin}, break-even ${o.breakEven}. ${o.scenarios.map((s) => `${s.sellThrough} sold: ${s.profit}`).join(", ")}. ${o.vatNote} Shown as a cost card.`,
        ),
    }),
    findProducts: tool({
      description: "Search the catalog for styles that match what the buyer describes (kind of shoe, use, material, colour, feature). Shows them as product cards.",
      inputSchema: z.object({
        query: z.string().max(200).optional().describe('What they want, in a few words, e.g. "waterproof chelsea", "kids sneakers", "party heels"'),
        line,
        season: z.enum(SEASON_IDS).optional().describe("Order results for this season"),
        waterproof: z.boolean().optional(),
        insulated: z.boolean().optional(),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: (input) => findProducts(input),
      toModelOutput: ({ output }) => text(cards(`${output.closest ? "Closest matches, nothing exact" : "Matches"}, ${output.count} in all`, output.styles)),
    }),
    productDetails: tool({
      description: "Full details of one style by name or slug: description, materials, sizes, case pack, MOQ, and styles that go with it.",
      inputSchema: z.object({ style: z.string().max(80) }),
      execute: (input) => productDetails(input),
      toModelOutput: ({ output }) =>
        text(
          output.found
            ? `${brief(output)}. ${output.description} Materials: ${output.materials.join("; ")}. Sizes ${output.sizeRange}. ${output.casePack}. MOQ ${output.moq}. ${output.availability}${output.rating ? ` Rated ${output.rating}.` : ""} ${cards("Goes with", output.goesWith)}`
            : cards("Not found; suggestions", output.suggestions),
        ),
    }),
    seasonAdvice: tool({
      description: "What sells in a country now (or in a given month): its season, the best styles for it, and the order-by dates to have stock on the shelf in time.",
      inputSchema: z.object({
        country: z.string().max(60).optional().describe("Country name or ISO code; leave out to use the visitor's"),
        month: z.number().int().min(1).max(12).optional().describe("1–12, if they ask about a future month"),
      }),
      execute: (input) => seasonAdvice(input),
      toModelOutput: ({ output: o }) =>
        text(
          `${o.country}, ${o.month}: ${o.season} (${o.edit}). ${o.whatSells} ${cards("Picks", o.picks)}. Order calendar: ${o.orderCalendar.map((p) => `${p.name} (${p.markets}): order by ${p.orderBy}, on shelf ${p.onShelf}`).join("; ")}. ${o.leadTimes}`,
        ),
    }),
    topSellers: tool({
      description: "The styles to put forward now: trade-desk favourites (Top reorder, Trending), the season's leaders and the most-requested styles. Says what each list is based on.",
      inputSchema: z.object({ line }),
      execute: async ({ line }) => topSellers({ line, season: ctx.season, requested: await ctx.requested() }),
      toModelOutput: ({ output: o }) =>
        text(
          `Based on: ${o.basis.join("; ")}. ${o.mostRequested.length ? `Most requested: ${o.mostRequested.map((c) => `${c.name} (${c.inquiries} inquiries)`).join(", ")}. ` : ""}${cards("Trade-desk favourites", o.marked)}. ${cards("Season leaders", o.inSeason)}`,
        ),
    }),
    shippingInfo: tool({
      description: "Shipping to a country: port, transit time, trade terms (DDP/FOB/EXW), import rules and documents.",
      inputSchema: z.object({ country: z.string().max(60) }),
      execute: (input) => shippingInfo(input),
    }),
    planOrder: tool({
      description: "Turns a quantity into cases, pallets, volume, weight and container, and checks it against MOQ and price tiers.",
      inputSchema: z.object({
        pairs: z.number().int().positive().max(1_000_000).optional(),
        cases: z.number().int().positive().max(100_000).optional(),
        styles: z.number().int().positive().max(200).optional().describe("How many styles the quantity is spread over"),
      }),
      execute: (input) => planOrder(input),
    }),
    policies: tool({
      description: "The company's own answers on ordering steps, samples, payment, shipping, quality, verifying the company, privacy and contact details.",
      inputSchema: z.object({ topic: z.enum(POLICY_TOPICS) }),
      execute: (input) => policies(input),
    }),
    aboutCompany: tool({
      description: "Who you (Kai) are and who you work for: the company, where it's based, what it makes and sells, to whom, its range, markets, minimum order, how to verify it and how to reach a person. Use it for any question about identity, origin or what is sold.",
      inputSchema: z.object({}),
      execute: () => aboutCompany(),
    }),
    offTopic: tool({
      description:
        "Use when the buyer asks about something unrelated to wholesale footwear, buying, products, materials, sizes, seasons, inquiries, shipping, payment, terms or the company (e.g. jokes, weather, politics, coding, homework, other products). Shows them buttons to get back on track. Write only one short, polite sentence declining; the buttons do the rest.",
      inputSchema: z.object({}),
      execute: () => offTopic({ season: ctx.season }),
      toModelOutput: () => text("Buttons back to buying are shown under your reply. Write one short, polite sentence only."),
    }),
    draftInquiry: tool({
      description: "Prepare an inquiry for the buyer to review and send: styles with cases each (minimum 25). It does not send anything.",
      inputSchema: z.object({
        styles: z.array(z.object({ style: z.string().max(80), cases: z.number().int().positive().max(10_000).optional() })).min(0).max(30),
        intent: z.enum(["quote", "sample", "visit", "private_label", "shipping"]).optional(),
        note: z.string().max(1000).optional().describe("A short summary of what they want, written for the trade desk"),
        country: z.string().max(60).optional().describe("Where it ships"),
      }),
      execute: (input) => draftInquiry(input),
      toModelOutput: ({ output: d }) =>
        text(
          `Draft shown to the buyer to review and send themselves: ${d.lines.map((l) => `${l.name} ${l.cases} cases`).join(", ") || "no styles (full line sheet)"}; ${d.pairs} pairs.${d.unknown.length ? ` Not in the range: ${d.unknown.join(", ")}.` : ""} Nothing has been sent.`,
        ),
    }),
  };
}

export type KaiTools = ReturnType<typeof makeTools>;
export type KaiMode = "trade" | "plan";
/** The tools the model may call in each mode: fewer tools, fewer tokens, and no planning answers in trade help. */
export const MODE_TOOLS: Record<KaiMode, (keyof KaiTools)[]> = {
  trade: ["findProducts", "productDetails", "seasonAdvice", "topSellers", "shippingInfo", "planOrder", "policies", "aboutCompany", "offTopic", "draftInquiry"],
  plan: ["planSeason", "suggestOrder", "estimateLanding", "findProducts", "productDetails", "shippingInfo", "policies", "aboutCompany", "offTopic", "draftInquiry"],
};
export type KaiMessage = UIMessage<never, never, InferUITools<KaiTools>>;
