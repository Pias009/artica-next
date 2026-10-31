import "server-only";
import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
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
const brief = (c: Card) => `${c.name} (${c.url}): ${c.type}, ${c.color}, ${c.line}${c.badge ? `, ${c.badge}` : ""}${c.seasons.length ? `, suits ${c.seasons.join("/")}` : ""}`;
const text = (value: string) => ({ type: "text" as const, value });
const cards = (label: string, list: Card[]) => `${label} (shown to the buyer as cards): ${list.length ? list.map(brief).join("; ") : "none"}`;

export function makeTools(ctx: { season?: SeasonId; requested: () => Promise<{ id: string; inquiries: number }[]> }) {
  const line = z.enum(["men", "women", "kids"]).optional().describe("Product line, if the buyer named one");
  return {
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
            ? `${brief(output)}. ${output.description} Materials: ${output.materials.join("; ")}. Sizes ${output.sizeRange}. ${output.casePack}. MOQ ${output.moq}.${output.rating ? ` Rated ${output.rating}.` : ""} ${cards("Goes with", output.goesWith)}`
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
export type KaiMessage = UIMessage<never, never, InferUITools<KaiTools>>;
