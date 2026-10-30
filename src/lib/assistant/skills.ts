import { CONTAINERS, EXPORT_DOCS, fmtDate, load, marketOf, MARKETS, nextPlan, QUALITY_STEPS, SEASONS as SHELF_SEASONS, sizeRange, VERIFY_STEPS } from "../buyer-desk";
import { COMPANY, whatsappLink } from "../company";
import { FAQ } from "../faq";
import { seasonsFor } from "../product-copy";
import { byId, CASE_PACK, categoryOf, collapse, LEAD, LINE_LABEL, MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN, products, related, STEP_CASES, TIERS, type Product, type ProductLine } from "../products";
import { isSeason, SEASON_DATA, seasonOf, SEASONS, type SeasonId } from "../season";
import { bySeason, inSeason, seasonPicks } from "../season-products";

/*
 * What the assistant knows and can do, as plain functions over the site's own data (products, seasons, markets,
 * FAQ, terms). The AI model calls them as tools (tools.ts); the offline engine (local.ts) calls them directly. Every
 * fact the assistant states should come from here, so it never invents a style, a date or a term.
 */

/* ---- Product cards: what the chat shows for a style ---- */

export type Card = {
  id: string;
  slug: string;
  name: string;
  type: string;
  line: ProductLine;
  category: string;
  color: string;
  sizes: string;
  spec: string;
  badge?: string;
  image: { src: string; w: number; h: number };
  url: string;
  /** Seasons the style suits, in words ("winter", "autumn"). */
  seasons: string[];
};

export const card = (p: Product): Card => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  type: p.type,
  line: p.line,
  category: categoryOf(p),
  color: p.color.name,
  sizes: p.sizes,
  spec: p.spec,
  ...(p.badge && { badge: p.badge }),
  image: p.outer,
  url: `/products/${p.slug}`,
  seasons: seasonsFor(p),
});

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w.length > 1);
const haystack = (p: Product) => [p.name, p.type, categoryOf(p), p.color.name, p.spec, p.line, LINE_LABEL[p.line], ...p.tags, p.desc].join(" ").toLowerCase();
/** Words a buyer uses that the catalog spells differently. */
const SYNONYMS: Record<string, string[]> = {
  boot: ["boot", "boots"],
  winter: ["insulated", "snow", "shearling", "fur", "warm"],
  rain: ["waterproof", "rain", "chelsea"],
  waterproof: ["waterproof"],
  warm: ["insulated", "shearling", "fur", "warm"],
  summer: ["sandal", "slide", "flat", "sneaker"],
  sandals: ["sandal", "slide"],
  heels: ["pump", "heel"],
  ladies: ["women"],
  womens: ["women"],
  mens: ["men"],
  children: ["kids"],
  child: ["kids"],
  school: ["kids", "sneaker"],
  party: ["patent", "pump", "mary jane"],
  office: ["loafer", "derby", "pump"],
};

/** Words that say nothing about the shoe. */
const STOP = new Set(
  "a an and any are can do does for from have i in is it me my need of on or our please show some that the their them these this to want we what which with you your about looking find get give tell".split(" "),
);
/** Line words, dropped from the search once the line itself is filtered on. */
const LINE_WORDS = new Set(["men", "mens", "man", "women", "womens", "woman", "ladies", "kid", "kids", "children", "child"]);

/* ---- Skills ---- */

export type FindInput = { query?: string; line?: ProductLine; season?: SeasonId; waterproof?: boolean; insulated?: boolean; limit?: number };

/** Styles matching what the buyer describes, best first, one per kind of shoe before repeats. */
export function findProducts({ query = "", line, season, waterproof, insulated, limit = 6 }: FindInput) {
  // each meaningful word is one group of spellings; a style must match most groups, not just any one word
  const groups = words(query)
    .filter((w) => !STOP.has(w) && !(line && LINE_WORDS.has(w)))
    .map((w) => SYNONYMS[w] ?? [w.replace(/s$/, "")]);
  const ranked = products
    .filter((p) => (!line || p.line === line) && (!waterproof || p.tags.includes("waterproof")) && (!insulated || p.tags.includes("insulated")))
    .map((p, i) => {
      const h = haystack(p);
      const hw = words(h);
      // a word matches the start of a catalog word ("boot" → "boots", never "cat" → "delicate"); phrases match whole
      const hits = groups.filter((g) => g.some((t) => (t.includes(" ") ? h.includes(t) : hw.some((w) => w.startsWith(t))))).length;
      return { p, i, hits };
    })
    .sort((a, b) => b.hits - a.hits || a.i - b.i);
  // most of the words must match; if nothing does, the closest styles (any word) are offered as such
  const need = Math.max(1, Math.ceil(groups.length * 0.67));
  const exact = ranked.filter((x) => !groups.length || x.hits >= need);
  const close = !exact.length && groups.length > 1;
  const scored = (close ? ranked.filter((x) => x.hits > 0) : exact).map((x) => x.p);
  const ordered = season ? bySeason(scored, season).filter((p) => !groups.length || inSeason(p, season) || scored.indexOf(p) < 3) : scored;
  const varied = collapse(ordered);
  const list = [...varied, ...ordered.filter((p) => !varied.includes(p))].slice(0, Math.min(limit, 8));
  return { count: scored.length, closest: close, styles: list.map(card) };
}

const findOne = (nameOrSlug: string) => {
  const k = nameOrSlug.trim().toLowerCase();
  return products.find((p) => p.slug === k || p.id.toLowerCase() === k || p.name.toLowerCase() === k) ?? products.find((p) => p.name.toLowerCase().includes(k));
};

/** Everything about one style: description, materials, sizes and how a case is packed, and what goes with it. */
export function productDetails({ style }: { style: string }) {
  const p = findOne(style);
  if (!p) return { found: false as const, suggestions: findProducts({ query: style, limit: 3 }).styles };
  return {
    found: true as const,
    ...card(p),
    description: p.desc,
    materials: p.materials.map((m) => `${m.label}: ${m.value}`),
    sizeRange: sizeRange(p.line),
    casePack: `${PACK} pairs per case, sizes ${CASE_PACK[p.line].map(([s, n]) => `${s}×${n}`).join(", ")}`,
    moq: `${MOQ_PAIRS} pairs (${MOQ_CASES} cases) per style and colour, then in steps of ${STEP_CASES} cases`,
    ...(p.rating && { rating: p.rating }),
    goesWith: related(p, 3).map(card),
  };
}

/* Countries by name, from the browser's own region names ("Germany" → "DE"), plus what people type. */
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_CODE: Record<string, string> = { usa: "US", america: "US", "united states of america": "US", uk: "GB", england: "GB", britain: "GB", uae: "AE", emirates: "AE", korea: "KR", holland: "NL" };
for (let a = 65; a <= 90; a++)
  for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    try {
      const name = REGION.of(code);
      if (name && name !== code) COUNTRY_CODE[name.toLowerCase()] ??= code;
    } catch {}
  }
/** "Germany", "de", "DE" → { code: "DE", name: "Germany" }; null when unknown. */
export function country(input: string | null | undefined) {
  const s = (input ?? "").trim();
  if (!s) return null;
  const code = /^[a-z]{2}$/i.test(s) ? s.toUpperCase() : COUNTRY_CODE[s.toLowerCase()];
  const name = code && REGION.of(code);
  return code && name && name !== code ? { code, name } : null;
}

/** The first country named in free text ("we sell in Germany and…" → Germany), longest names first. */
const COUNTRY_NAMES = Object.keys(COUNTRY_CODE).filter((n) => n.length > 3).sort((a, b) => b.length - a.length);
export function countryIn(text: string) {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\s]/gu, " ")} `;
  const hit = COUNTRY_NAMES.find((n) => t.includes(` ${n} `)) ?? ["usa", "uk", "uae"].find((n) => t.includes(` ${n} `));
  return hit ? country(hit) : null;
}

/** What sells where, now: the season in that country this month (or the month given), its best styles and when to order. */
export function seasonAdvice({ country: where, month }: { country?: string; month?: number }) {
  const c = country(where);
  const today = new Date();
  const date = month && month >= 1 && month <= 12 ? new Date(today.getFullYear() + (month - 1 < today.getMonth() ? 1 : 0), month - 1, 15) : today;
  const season = seasonOf(c?.code ?? "", date, SEASON_DATA);
  const theme = SEASONS[season];
  const plans = SHELF_SEASONS.map((s) => {
    const { order, daysLeft, plan } = nextPlan(s, today);
    return { name: s.name, markets: s.markets, note: s.note, orderBy: fmtDate(order, today), daysLeft, onShelf: fmtDate(plan[plan.length - 1].date, today) };
  });
  return {
    country: c?.name ?? "not given (northern calendar used)",
    month: date.toLocaleString("en", { month: "long" }),
    season: theme.name,
    edit: theme.edit,
    whatSells: theme.line,
    picks: seasonPicks(season, 6).map(card),
    orderCalendar: plans,
    leadTimes: `Samples about ${LEAD.samples.replace("d", "")} days, bulk production about ${LEAD.bulk.replace("d", "")} days, sea freight about ${LEAD.delivery.replace("d", "")} days (varies by market).`,
  };
}

/**
 * What to put forward now. The site has no live sales feed, so this is honest about its basis: the styles the trade
 * desk marks "Top reorder" or "Trending", those leading the season, and, when the database is connected, the styles
 * buyers ask about most in inquiries (`requested`, from the route).
 */
export function topSellers({ season, line, requested = [] }: { season?: SeasonId; line?: ProductLine; requested?: { id: string; inquiries: number }[] }) {
  const pool = products.filter((p) => !line || p.line === line);
  const marked = pool.filter((p) => p.badge === "Top reorder" || p.badge === "Trending");
  const seasonal = season ? seasonPicks(season, 6, pool) : [];
  const asked = requested.map((r) => ({ p: byId[r.id], n: r.inquiries })).filter((r) => r.p && (!line || r.p.line === line));
  return {
    basis: [
      "badges the trade desk sets (Top reorder, Trending)",
      ...(season ? [`fit for ${SEASONS[season].name.toLowerCase()}`] : []),
      ...(asked.length ? ["how often each style was asked for in inquiries over the last 90 days"] : []),
    ],
    mostRequested: asked.slice(0, 5).map((r) => ({ ...card(r.p), inquiries: r.n })),
    marked: marked.map(card),
    inSeason: seasonal.filter((p) => !marked.includes(p)).slice(0, 4).map(card),
  };
}

/** Shipping to a country: the market's port, transit, trade terms, import rules and the papers that travel. */
export function shippingInfo({ country: where }: { country: string }) {
  const c = country(where);
  const m = c && marketOf(c.name);
  return {
    country: c?.name ?? where,
    ...(m
      ? { market: m.name, port: m.port, transit: m.transit, terms: m.terms, importRules: m.rules }
      : { market: null, note: "Not one of our regular markets, but we ship worldwide: the trade desk quotes it on request.", regularMarkets: MARKETS.map((x) => x.name) }),
    documents: EXPORT_DOCS,
    termsExplained: { DDP: "We deliver to your door with duties paid.", FOB: "We load at the Chinese port; you arrange freight.", EXW: "You collect from the factory." },
  };
}

/** How an order of this size ships: cases, pallets, volume, weight and container, and where it sits on the price tiers. */
export function planOrder({ pairs, cases, styles }: { pairs?: number; cases?: number; styles?: number }) {
  const n = Math.max(1, Math.round(cases ?? (pairs ?? 0) / PACK));
  const l = load(n);
  const perStyle = styles && styles > 0 ? Math.floor(l.pairs / styles) : l.pairs;
  return {
    cases: l.cases,
    pairs: l.pairs,
    pallets: l.pallets,
    volumeCbm: Math.round(l.cbm * 10) / 10,
    weightKg: Math.round(l.kg),
    shipping: l.lcl ? "Shared container (LCL) is usually cheaper at this size" : `${l.count} × ${l.container.name}, last one about ${Math.round(l.fill * 100)}% full`,
    containers: CONTAINERS.map((c) => `${c.name}: about ${c.cases} cases`),
    moqOk: perStyle >= MOQ_PAIRS,
    tiers: TIERS.map((t) => ({ ...t, reached: perStyle >= t.pairs })),
    note: `MOQ is ${MOQ_PAIRS} pairs per style. Tier pricing starts at 1,000 pairs per style; private label from ${PRIVATE_LABEL_MIN} pairs.`,
  };
}

export const POLICY_TOPICS = ["ordering", "samples", "payment", "shipping", "quality", "verify", "privacy", "contact"] as const;
export type PolicyTopic = (typeof POLICY_TOPICS)[number];

const FAQ_FOR: Partial<Record<PolicyTopic, string>> = { ordering: "Ordering", samples: "Samples", payment: "Payment", shipping: "Shipping" };

/** The site's own answers on how ordering works, samples, payment, shipping, quality, verifying us, privacy and contact. */
export function policies({ topic }: { topic: PolicyTopic }) {
  const faq = FAQ.find((c) => FAQ_FOR[topic] && c.name.startsWith(FAQ_FOR[topic]!))?.faqs ?? [];
  const extra: Record<PolicyTopic, string[]> = {
    ordering: [
      `1. Pick styles in the catalog (/catalog) and add them to your inquiry list: at least ${MOQ_PAIRS} pairs (${MOQ_CASES} cases of ${PACK}) per style and colour.`,
      "2. Send the inquiry (the list's form, or ask me to prepare it). The trade desk replies within 24 hours with the line sheet and tier pricing.",
      `3. Samples in about ${LEAD.samples.replace("d", "")} days if you want them; approve your fit sample.`,
      "4. Sign the proforma invoice and pay the 30% deposit; bulk production takes about 45 days.",
      "5. Pre-shipment inspection (you may send your own inspector), then the 70% balance against the bill of lading.",
      "6. Shipping: DDP, FOB or EXW depending on your market.",
    ],
    samples: [],
    payment: ["Payments only ever go to an account in the company's name, the one printed on your proforma invoice."],
    shipping: [`Indicative loads: ${CONTAINERS.map((c) => `${c.name} about ${c.cases} cases`).join("; ")}. The /container-planner page works it out for your list.`],
    quality: QUALITY_STEPS.map((s) => `${s.title}: ${s.text}`),
    verify: [...VERIFY_STEPS.map((s) => `${s.title}: ${s.text}`), "Registration details are on /verify."],
    privacy: [
      "Your inquiry list stays in your own browser until you send it.",
      "When you send an inquiry we keep your company, work email, country, the styles and quantities and your note, to answer it and arrange orders. No IP address is stored.",
      "This chat is answered by an AI model through our provider; we don't keep the conversation unless you send it as an inquiry.",
      "Inquiries are kept while we trade with you and as long as tax and trade law requires; spam is deleted after 30 days.",
      `You can ask to see, correct or delete your data: write to ${COMPANY.email.general}. Full policy: /privacy. Terms of sale: /terms.`,
    ],
    contact: [
      `Email: ${COMPANY.email.general} (orders), ${COMPANY.email.oem} (private label), ${COMPANY.email.logistics} (shipping)`,
      `Phone: ${COMPANY.phone}, ${COMPANY.hours}`,
      ...(whatsappLink() ? [`WhatsApp: ${whatsappLink()}`] : []),
      "Factory visits and video tours: /meet.",
    ],
  };
  return { topic, answers: faq.map((f) => ({ q: f.q, a: f.a })), notes: extra[topic] };
}

/** Checks an inquiry the buyer wants to send: real styles only, at least MOQ each. The buyer confirms and sends it. */
export function draftInquiry(input: { styles: { style: string; cases?: number }[]; intent?: "quote" | "sample" | "visit" | "private_label" | "shipping"; note?: string; country?: string }) {
  const lines = input.styles.slice(0, 30).flatMap((s) => {
    const p = findOne(s.style);
    return p ? [{ ...card(p), cases: Math.max(MOQ_CASES, Math.round(s.cases ?? MOQ_CASES)) }] : [];
  });
  const unknown = input.styles.filter((s) => !findOne(s.style)).map((s) => s.style);
  return {
    lines,
    unknown,
    pairs: lines.reduce((a, l) => a + l.cases * PACK, 0),
    intent: input.intent ?? "quote",
    note: (input.note ?? "").slice(0, 1000),
    country: country(input.country)?.name ?? null,
    nextStep: "The buyer reviews this in the chat, then adds it to their inquiry list or sends it with their company and work email.",
  };
}

/**
 * Who Kai is and who it works for, for "who are you / where are you from / what do you sell". Counts and categories
 * come from the catalog, so the answer stays true as the range changes; nothing here is invented (no founding year,
 * staff count or factory size until the company supplies them).
 */
export function aboutCompany() {
  const lines = (["women", "men", "kids"] as const).map((l) => {
    const list = products.filter((p) => p.line === l);
    return { line: LINE_LABEL[l], styles: list.length, categories: [...new Set(list.map(categoryOf))] };
  });
  return {
    assistant: "Kai, an AI trade assistant for Chime Long. Not a person: the human trade desk confirms every price and order.",
    company: COMPANY.name,
    brand: "Chime Long",
    basedIn: "Guangzhou, China",
    business: "Wholesale footwear: designs, makes and exports boots, sneakers, sandals, loafers, flats and heels in bulk.",
    sellsTo: "Businesses only: retailers, distributors and private-label brands (no single pairs to consumers).",
    range: lines,
    /** Every kind of shoe in the range, most styles first. */
    categories: Object.entries(products.reduce<Record<string, number>>((acc, p) => ((acc[categoryOf(p)] = (acc[categoryOf(p)] ?? 0) + 1), acc), {}))
      .sort((x, y) => y[1] - x[1])
      .map(([c]) => c),
    services: ["Factory-direct wholesale", `Private label from ${PRIVATE_LABEL_MIN} pairs`, `Samples arrive in about ${LEAD.samples.replace("d", "")} days`, "Shipping worldwide on DDP, FOB or EXW terms"],
    markets: MARKETS.map((m) => m.name),
    minimumOrder: `${MOQ_PAIRS} pairs (${MOQ_CASES} cases of ${PACK}) per style and colour`,
    verify: "Registration details and how to check them: /verify. Factory video tours and visits: /meet.",
    contact: `${COMPANY.email.general}, ${COMPANY.phone} (${COMPANY.hours})`,
  };
}

export type BackOption = { kind: "ask"; label: string; prompt: string } | { kind: "link"; label: string; href: string };

/**
 * Ways back to buying, shown under a reply that declines an off-topic question: questions Kai answers in the chat,
 * then pages. The season one names the visitor's season when it's known.
 */
export function offTopic({ season }: { season?: SeasonId } = {}): { options: BackOption[] } {
  const now = season ? `this ${SEASONS[season].name.toLowerCase()}` : "right now";
  return {
    options: [
      { kind: "ask", label: `What sells best ${now}?`, prompt: `What sells best in my country ${now}?` },
      { kind: "ask", label: "Help me choose styles", prompt: "Help me choose styles for my store" },
      { kind: "ask", label: "MOQ and prices", prompt: "What's your MOQ and how does pricing work?" },
      { kind: "ask", label: "How to order", prompt: "How do I place an order?" },
      { kind: "link", label: "Get pricing", href: "/inquiry" },
      { kind: "link", label: "Browse the catalog", href: "/catalog" },
      { kind: "link", label: "Shipping", href: "/ship-to" },
      { kind: "link", label: "FAQ", href: "/faq" },
      { kind: "link", label: "Contact us", href: "/contact" },
    ],
  };
}

/** The season a visitor is in, from the cookies the proxy sets. */
export const visitorSeason = (cookie: string | undefined): SeasonId | undefined => (isSeason(cookie) ? cookie : undefined);
