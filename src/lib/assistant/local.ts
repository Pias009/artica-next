import { conductReply, OFF_TOPIC_REPLY } from "./conduct";
import { ASSISTANT, STARTERS } from "./persona";
import { card, countryIn, draftInquiry, findProducts, offTopic, planOrder, policies, seasonAdvice, shippingInfo, topSellers, type PolicyTopic } from "./skills";
import { marketOf, MARKETS } from "../buyer-desk";
import { SEASON_DATA, seasonOf } from "../season";
import { MOQ_CASES, MOQ_PAIRS, PACK, products, type ProductLine } from "../products";
import type { SeasonId } from "../season";

/*
 * Kai without an AI model: used when no AI_GATEWAY_API_KEY is set (local dev, a fresh deployment). It reads the
 * buyer's message for what they want, runs the same skills the model would, and writes a short answer. It can't
 * hold a conversation or speak other languages, but it never invents anything and its cards look the same.
 */

export type LocalReply = { text: string; tools: { name: string; input: object; output: unknown }[] };

const has = (t: string, re: RegExp) => re.test(t);
const lineIn = (t: string): ProductLine | undefined =>
  has(t, /\b(kid|kids|child|children|youth|boys?|girls?|school)\b/) ? "kids" : has(t, /\b(women|woman|ladies|female|womens|her)\b/) ? "women" : has(t, /\b(men|man|mens|male|gents?)\b/) ? "men" : undefined;

/** Words that mean the buyer is asking for shoes, not about a season or terms. */
const SHOE_WORDS = /\b(boots?|booties|sneakers?|trainers?|kicks|sandals?|slides?|flip ?flops?|loafers?|moccasins?|heels?|pumps?|stilettos?|wedges?|platforms?|flats?|ballerinas?|clogs?|mules?|slippers?|espadrilles?|oxfords?|brogues?|shoes?|footwear|chelsea|hikers?|derby|derbies|mary janes?|waterproof|insulated|leather|suede|patent|soles?|insoles?|laces?)\b/;

const TOPICS: [RegExp, PolicyTopic][] = [
  [/\b(privacy|personal data|gdpr|my data|cookies?)\b/, "privacy"],
  [/\b(pay|payment|deposit|balance|letter of credit|l\/c|net ?30|invoice)\b/, "payment"],
  [/\b(samples?|prototype)\b/, "samples"],
  [/\b(quality|inspect|inspection|defects?|aql|qc)\b/, "quality"],
  [/\b(verify|licen[cs]e|scam|trust|legit|genuine|real company)\b/, "verify"],
  // becoming a stockist, distributor or partner: how buying from us works
  [/\b(distribut\w*|partner(ship)?s?|stockists?|resell(er|ers|ing)?|dealers?|wholesale account|open an account|work (with|together)|long[- ]term|exclusiv\w*)\b/, "ordering"],
  [/\b(contact|email|phone|call|whatsapp|human|person|someone|agent)\b/, "contact"],
  [/\b(how (do|can) i (order|buy|inquire|start)|place an order|ordering|process|steps|inquir(y|e)|how to (order|buy))\b/, "ordering"],
];

export function localReply(message: string, ctx: { season?: SeasonId; country?: string; requested?: { id: string; inquiries: number }[] }): LocalReply {
  const t = message.toLowerCase();
  const tools: LocalReply["tools"] = [];
  const run = <T,>(name: string, input: object, fn: () => T) => {
    const output = fn();
    tools.push({ name, input, output });
    return output;
  };
  // questions about Kai and the company, and anything rude, risky or off-topic, before any sales logic
  const conduct = conductReply(message, SHOE_WORDS);
  if (conduct) {
    if (conduct.redirect) run("offTopic", {}, () => offTopic({ season: ctx.season }));
    return { text: conduct.text, tools };
  }

  const line = lineIn(t);
  const named = countryIn(message);

  if (!t.trim() || has(t, /^(hi|hello|hey|salam|hola|bonjour|good (morning|afternoon|evening))\b/)) {
    return {
      text: `Hello, I'm ${ASSISTANT.name}, the Chime Long trade assistant. I can suggest styles for your market and season, show what's selling, and walk you through MOQ, samples, payment, shipping and sending an inquiry. For example: "${STARTERS[0]}"`,
      tools,
    };
  }

  // "send an inquiry for 30 cases of Tove and Ash": a draft the buyer checks and sends from the chat
  const styles = products.filter((p) => new RegExp(`\\b${p.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
  if (styles.length && has(t, /\b(inquir\w*|quote|pricing|price|order|send|add|buy|samples?)\b/)) {
    const q = t.match(/(\d[\d,]*)\s*(cases?|cartons?|pairs?)/);
    const n = q ? Number(q[1].replace(/,/g, "")) : 0;
    const cases = q ? (/pair/.test(q[2]) ? Math.ceil(n / PACK) : n) : MOQ_CASES;
    const intent = has(t, /\bsamples?\b/) ? "sample" : "quote";
    const input = { styles: styles.slice(0, 10).map((p) => ({ style: p.slug, cases })), intent, country: named?.name ?? ctx.country } as const;
    const d = run("draftInquiry", input, () => draftInquiry({ ...input, styles: [...input.styles] }));
    return {
      text: `Here's your inquiry draft: ${d.lines.map((l) => l.name).join(", ")}${cases > MOQ_CASES ? `, ${cases} cases each` : ` at our minimum of ${MOQ_CASES} cases each`}. Adjust the quantities, then send it to the trade desk or add it to your list.`,
      tools,
    };
  }

  // quantities: "1200 pairs", "60 cases", "a 40ft container"
  const qty = t.match(/(\d[\d,.]*)\s*(pairs?|cases?|cartons?)/);
  if (qty || has(t, /\b(container|pallet|cbm|volume|how many)\b/)) {
    const n = qty ? Number(qty[1].replace(/[,.]/g, "")) : MOQ_PAIRS;
    const isCases = qty ? /case|carton/.test(qty[2]) : false;
    const r = run("planOrder", isCases ? { cases: n } : { pairs: n }, () => planOrder(isCases ? { cases: n } : { pairs: n }));
    return {
      text: `${r.pairs.toLocaleString("en-US")} pairs is ${r.cases} cases on about ${r.pallets} pallets (${r.volumeCbm} m³, ${r.weightKg.toLocaleString("en-US")} kg). ${r.shipping}. ${r.moqOk ? "That meets our MOQ" : `That's under our MOQ of ${MOQ_PAIRS} pairs per style`}; tier pricing starts at 1,000 pairs per style. Want me to suggest styles to fill it?`,
      tools,
    };
  }

  if (has(t, /\b(ship|shipping|deliver|delivery|freight|customs|duty|duties|ddp|fob|exw|import|transit|port)\b/) && (named || ctx.country)) {
    const where = named?.name ?? ctx.country!;
    const r = run("shippingInfo", { country: where }, () => shippingInfo({ country: where }));
    return {
      text: r.market
        ? `To ${r.country} we ship via ${r.port}, about ${r.transit} at sea, on ${r.terms!.join(", ")} terms. Import needs: ${r.importRules!.slice(0, 2).join("; ")}. Full details are on the [shipping page](/ship-to).`
        : `${r.country} isn't one of our regular markets yet, but we ship worldwide and the trade desk will quote it. [Send an inquiry](/inquiry) with your port and quantity.`,
      tools,
    };
  }

  // "any news on new arrivals?": the styles marked New
  if (has(t, /\b(new arrivals?|new (styles?|products?|collection|range|in)|what'?s new|latest|newest|just (in|arrived)|recently added)\b/)) {
    const fresh = products.filter((p) => p.badge === "New");
    const list = (fresh.length ? fresh : products.slice(-6)).slice(0, 6).map(card);
    run("findProducts", { query: "new arrivals" }, () => ({ count: list.length, closest: false, styles: list }));
    return { text: `${fresh.length ? "Our newest styles" : "Recently added to the range"}: each ships from ${MOQ_CASES} cases per colour. Want one added to an inquiry, or picks for your market?`, tools };
  }

  // shipping with no country named: where we ship, and ask theirs
  if (has(t, /\b(ship|shipping|deliver|delivery|freight|export|countries|markets?)\b/) && !has(t, /\b(pay|payment|deposit)\b/)) {
    return {
      text: `We ship worldwide on DDP, FOB or EXW terms. Our regular markets: ${MARKETS.map((m) => `${m.name} (${m.transit} by sea)`).join("; ")}. Tell me your country and I'll give you the port, trade terms and import rules, or see the [shipping page](/ship-to).`,
      tools,
    };
  }

  const topic = TOPICS.find(([re]) => has(t, re))?.[1];
  if (topic) {
    const r = run("policies", { topic }, () => policies({ topic }));
    const first = r.answers[0]?.a;
    const body =
      topic === "ordering" || topic === "privacy" || topic === "contact" || topic === "quality" || topic === "verify"
        ? r.notes.map((n) => (/^\d\./.test(n) ? n : `- ${n}`)).join("\n")
        : [first, ...r.notes].filter(Boolean).join(" ");
    const tail = topic === "ordering" ? "\n\nShall I suggest styles for your market to start your list?" : topic === "privacy" ? "" : "\n\nAnything else I can check for you?";
    return { text: `${body}${tail}`, tools };
  }

  if (has(t, /\b(best|top|selling|sells?|popular|trending|hot|bestsellers?|recommend)\b/)) {
    if (named) {
      const r = run("seasonAdvice", { country: named.name }, () => seasonAdvice({ country: named.name }));
      return { text: `It's ${r.season.toLowerCase()} in ${r.country} this month. ${r.whatSells} These lead our ${r.edit.toLowerCase()} for you:`, tools };
    }
    const r = run("topSellers", { line }, () => topSellers({ line, season: ctx.season, requested: ctx.requested }));
    return {
      text: `${r.mostRequested.length ? "These are asked for most in inquiries, " : ""}${r.marked.length ? "the trade desk marks these as Top reorder and Trending" : "these lead the season"}${ctx.season ? ", with the season's best fits after them" : ""}. Tell me your country and I'll match them to your season.`,
      tools,
    };
  }

  // "waterproof boots for Canada": the styles they named, ordered for that country's season
  if (named && has(t, SHOE_WORDS)) {
    const season = seasonOf(named.code, new Date(), SEASON_DATA);
    const query = message.replace(new RegExp(named.name, "i"), "");
    const r = run("findProducts", { query, line, season }, () => findProducts({ query, line, season }));
    if (r.styles.length)
      return {
        text: `${r.closest ? "Nothing matches all of that exactly; these come closest" : "These match"}, in order of what suits ${named.name} this season. Each ships from ${MOQ_CASES} cases per colour. Want shipping details to ${named.name}, or an inquiry drafted?`,
        tools,
      };
    tools.length = 0;
  }

  if (named || has(t, /\b(season|winter|summer|spring|autumn|fall|monsoon|rainy|holiday|this month|right now)\b/)) {
    const where = named?.name ?? ctx.country;
    const r = run("seasonAdvice", { country: where }, () => seasonAdvice({ country: where }));
    // the shelf season that serves their market, if we know it
    const market = where ? marketOf(where)?.name : undefined;
    const plan = market ? r.orderCalendar.filter((p) => p.markets.includes(market)).sort((a, b) => a.daysLeft - b.daysLeft)[0] : undefined;
    return {
      text: `${where ? `It's ${r.season.toLowerCase()} in ${r.country} now.` : `On the northern calendar it's ${r.season.toLowerCase()}.`} ${r.whatSells}${plan ? ` For ${plan.name.toLowerCase()} stock on shelf by ${plan.onShelf}, confirm the bulk order by ${plan.orderBy}.` : ""} Picks for you:`,
      tools,
    };
  }

  const r = run("findProducts", { query: message.slice(0, 200), line }, () => findProducts({ query: message, line, season: ctx.season }));
  if (r.styles.length) {
    return {
      text: `${r.closest ? "Nothing matches all of that exactly; these come closest" : `Here ${r.styles.length > 1 ? `are ${r.styles.length} styles` : "is a style"} that match${r.count > r.styles.length ? ` (of ${r.count})` : ""}`}. Each ships from ${MOQ_CASES} cases (${MOQ_PAIRS} pairs) per colour. Want one added to an inquiry, or details on any of them?`,
      tools,
    };
  }
  tools.length = 0;
  run("offTopic", {}, () => offTopic({ season: ctx.season }));
  // a shoe we don't make reads differently from a question that isn't about shoes at all
  return { text: has(t, SHOE_WORDS) ? "Sorry, I couldn't find that in our range. Here's where I can help:" : OFF_TOPIC_REPLY, tools };
}
