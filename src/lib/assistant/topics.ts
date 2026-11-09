/*
 * What a buyer's message to Kai is about, as one of a few topics, so the admin panel (AI agent) can show what buyers
 * ask without keeping what they typed: only the topic is counted (assistant/questions.ts), never the text.
 * Pure, with no "@/" imports, so `node --test` loads it as is.
 */

export const TOPICS = {
  styles: "Styles and the catalogue",
  moq: "MOQ and order size",
  price: "Prices and quotes",
  samples: "Samples",
  shipping: "Shipping and delivery",
  payment: "Payment and terms",
  timing: "Timing and seasons",
  sizes: "Sizes and fit",
  label: "Private label",
  quality: "Quality and trust",
  plan: "Budget, margin and cash",
  contact: "Talking to a person",
  other: "Something else",
} as const;
export type TopicId = keyof typeof TOPICS;

// checked in order: the first that matches wins, so the narrow topics come before the broad ones
const RULES: [TopicId, RegExp][] = [
  ["label", /\b(private[- ]?label|oem|odm|own brand|my brand|logo|custom (box|packaging))\b/],
  ["samples", /\bsamples?\b/],
  ["price", /\b(price|prices|pricing|cost per pair|quote|quotation|how much|cheap|discount|fob|exw)\b/],
  ["moq", /\b(moq|minimum|min order|how many pairs|cases?|carton|small order|order size)\b/],
  ["payment", /\b(pay|payment|deposit|t\/t|l\/c|letter of credit|paypal|invoice|terms of trade|balance)\b/],
  ["shipping", /\b(ship|shipping|deliver|delivery|freight|container|transit|customs|duty|duties|incoterm|port|arrive)\b/],
  ["plan", /\b(budget|margin|markup|profit|cash ?flow|landed cost|sell[- ]?through|business plan|break[- ]?even)\b/],
  ["timing", /\b(when|season|spring|summer|autumn|fall|winter|rainy|deadline|lead time|order by|calendar|how long)\b/],
  ["sizes", /\b(size|sizes|sizing|fit|width|eu \d|us \d|uk \d)\b/],
  ["quality", /\b(quality|certif\w*|test(ed|ing)?|factory|audit|verify|legit|scam|reviews?|warranty|defect)\b/],
  ["contact", /\b(human|person|someone|call me|phone|whatsapp|email you|contact|talk to|sales ?(rep|team))\b/],
  ["styles", /\b(styles?|boots?|sneakers?|sandals?|slippers?|shoes?|kids|men|women|waterproof|catalog(ue)?|colou?rs?|new arrivals?|best ?sellers?)\b/],
];

/** The topic of one message. The planning desk's open questions count as planning, not "something else". */
export function topicOf(text: string, desk: "trade" | "plan" = "trade"): TopicId {
  const t = ` ${text.toLowerCase()} `;
  return RULES.find(([, re]) => re.test(t))?.[0] ?? (desk === "plan" ? "plan" : "other");
}

/** How a message was answered: Kai's built-in rules, the AI model, or not at all (too many messages, desk closed). */
export const SOURCES = { rules: "Built-in rules", model: "AI model", limited: "Too many messages", closed: "Desk switched off" } as const;
export type SourceId = keyof typeof SOURCES;
