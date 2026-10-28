/*
 * What the admin panel shows and edits. The pages, products, seasons and campaigns are the site's own data; the
 * inquiries and traffic figures are sample data until the panel is wired to the leads database (src/lib/leads).
 */

import type { Status } from "@/lib/leads/db";
import type { Intent } from "@/lib/leads/mail";
import { products, type Product } from "@/lib/products";
import { SEASON_IDS, type SeasonId } from "@/lib/season";
import { SITE_PAGES } from "@/lib/site-pages";

export type View = "overview" | "visitors" | "agent" | "pages" | "products" | "inquiries" | "seasons" | "settings";

export const VIEWS: { id: View; label: string; title: string }[] = [
  { id: "overview", label: "Overview", title: "Dashboard" },
  { id: "visitors", label: "Visitors", title: "Visitors" },
  { id: "agent", label: "AI agent", title: "AI agent" },
  { id: "pages", label: "Pages", title: "Pages" },
  { id: "products", label: "Products", title: "Products" },
  { id: "inquiries", label: "Inquiries", title: "Inquiries" },
  { id: "seasons", label: "Seasons", title: "Seasons" },
  { id: "settings", label: "Settings", title: "Settings" },
];

/* ---------- pages and their sections ---------- */

export type Section = { id: string; label: string; kind: string; visible: boolean; eyebrow: string; title: string; sub: string };

/** The home page, chapter by chapter, in the order HomePage renders it. */
const HOME_SECTIONS: [id: string, label: string, kind: string, eyebrow: string, title: string, sub: string][] = [
  ["hero", "Hero spotlight", "Hero", "FW26 collection", "Factory-direct boots for your shelves.", "From 300 pairs per style, samples in 10 days."],
  ["season-edit", "Season edit", "Products", "In season", "What's selling this season.", "The styles buyers reorder most right now."],
  ["hot", "Hot products", "Products", "Hot", "Top reorders this month.", "Proven sell-through, ready to ship."],
  ["new", "New arrivals", "Products", "New arrivals", "Just landed for FW26.", "Fresh lasts and colourways."],
  ["campaign", "Campaign banner", "Banner", "FW26 campaign", "Built for sub-zero. Styled for the shelf.", "Insulated snow boots tested down to −25°C."],
  ["styles", "Best sellers", "Products", "The range", "Every line, one factory.", "Men, women and kids."],
  ["up-close", "Up close", "Story", "Craft", "Made to be looked at closely.", "Stitching, linings and soles."],
  ["lookbook", "Lookbook", "Banner", "Lookbook", "Seen on real streets.", "The range, styled."],
  ["programs", "Buyer programs", "Story", "Who it's for", "Programs for every buyer.", "Retailers, distributors and brands."],
  ["worn", "Worn in the city", "Banner", "Worn in the city", "Made to stop foot traffic.", "Real looks on real streets."],
  ["samples", "Sample request", "Form", "Samples", "Hold the pair first.", "Samples in 10 days."],
  ["order-sheet", "Order sheet", "Tool", "Ordering", "Build your order sheet.", "Cases, sizes and totals."],
  ["when-to-order", "When to order", "Tool", "Timing", "Order in time for the season.", "Worked back from your shelf date."],
  ["packing", "Packing", "Story", "Packing", "How your order is packed and shipped.", "From one pair to a full pallet."],
  ["worldwide", "Global reach", "Map", "Worldwide", "Shipped to 40+ markets.", "Every trade lane out of Guangzhou."],
  ["journey", "Order journey", "Story", "Timeline", "From inquiry to your shelf in about 11 weeks.", "One contact, quote to delivery."],
  ["buyer-desk", "Buyer desk", "Tool", "Planning", "Everything to plan an order.", "Sizes, dates and containers."],
  ["partner", "Private label", "Story", "Partnership", "Your brand on proven boots.", "From 600 pairs per style."],
  ["line-sheet", "Line sheet", "Form", "Line sheet", "Get the next line sheet first.", "New styles four times a year."],
];

const GENERIC = (name: string): Section[] => [
  { id: "intro", label: "Page intro", kind: "Hero", visible: true, eyebrow: "", title: name, sub: "" },
  { id: "main", label: "Main content", kind: "Content", visible: true, eyebrow: "", title: "", sub: "" },
  { id: "close", label: "Closing band", kind: "Banner", visible: true, eyebrow: "Next step", title: "Talk to the trade desk.", sub: "A reply within 24 hours." },
];

export type AdminPage = { path: string; name: string; summary: string; group: string; published: boolean; sections: Section[]; views: number };

export const PAGES: AdminPage[] = SITE_PAGES.filter((p) => !p.path.includes("?")).map((p, i) => ({
  path: p.path,
  name: p.path === "/" ? "Home" : p.name,
  summary: p.summary,
  group: p.section,
  published: true,
  views: Math.round(5200 / (i + 1.4)),
  sections:
    p.path === "/"
      ? HOME_SECTIONS.map(([id, label, kind, eyebrow, title, sub]) => ({ id, label, kind, visible: true, eyebrow, title, sub }))
      : GENERIC(p.name),
}));

/* ---------- products ---------- */

export type AdminProduct = Product & { inquiries: number; live: boolean; featured: boolean; seasons: SeasonId[] };

export const PRODUCTS: AdminProduct[] = products.map((p, i) => ({
  ...p,
  inquiries: Math.max(1, Math.round(46 * 0.93 ** i)), // sample: interest tails off down the catalogue
  live: true,
  featured: i < 3,
  seasons: p.line === "kids" ? ["winter", "autumn"] : i % 2 ? ["winter", "holiday"] : ["autumn", "winter"],
}));

/* ---------- inquiries (sample data) ---------- */

export type AdminInquiry = {
  ref: string;
  company: string;
  contact: string;
  country: string;
  flag: string;
  intent: Intent;
  pairs: number;
  status: Exclude<Status, "spam">;
  received: string;
  note: string;
  styles: string[];
};

const INTENTS: Record<Intent, string> = { quote: "Quote", sample: "Samples", visit: "Visit", private_label: "Private label", shipping: "Shipping" };
export const intentLabel = (i: Intent) => INTENTS[i];

export const INQUIRIES: AdminInquiry[] = [
  ["Nordlys Sko AS", "Ingrid H.", "Norway", "🇳🇴", "quote", 1200, "new", "12 min ago", "Need the Nord and Mira Tall for a January drop. Can you do DDP Oslo?", ["Nord", "Mira Tall"]],
  ["Maple & Co. Footwear", "Daniel R.", "Canada", "🇨🇦", "sample", 0, "new", "48 min ago", "Samples of the kids' snow boots in sizes 11–3, please.", ["Pop", "Fjord"]],
  ["Berliner Schuhhaus", "Lena K.", "Germany", "🇩🇪", "private_label", 2400, "replied", "3 h ago", "Our own label on the Chelsea boot, 4 colourways.", ["Toffee"]],
  ["Hokkaido Select", "Ken S.", "Japan", "🇯🇵", "quote", 600, "replied", "Yesterday", "Price for 600 pairs, mixed sizes, FOB Ningbo.", ["Ivy", "Nord"]],
  ["Outfitters Lane", "Mia T.", "United States", "🇺🇸", "shipping", 3600, "quoted", "Yesterday", "DDP to our Reno DC, two containers.", ["Nord", "Cedar", "Storm"]],
  ["Snowline Retail", "Oskar L.", "Sweden", "🇸🇪", "quote", 900, "quoted", "2 days ago", "Reorder of last winter's best seller.", ["Mira Tall"]],
  ["Alpine Kids Ltd", "Sophie M.", "United Kingdom", "🇬🇧", "quote", 1500, "won", "4 days ago", "Confirmed the PO, deposit sent.", ["Pop"]],
  ["Patagonia Sur", "Lucas P.", "Chile", "🇨🇱", "visit", 0, "won", "1 week ago", "Visiting Guangzhou on the 14th.", []],
  ["Riviera Moda", "Giulia F.", "Italy", "🇮🇹", "quote", 300, "lost", "2 weeks ago", "Went with a local supplier this season.", ["Ivy"]],
].map(([company, contact, country, flag, intent, pairs, status, received, note, styles], i) => ({
  ref: `CL-2026-${String(142 - i).padStart(4, "0")}`,
  company,
  contact,
  country,
  flag,
  intent,
  pairs,
  status,
  received,
  note,
  styles,
})) as AdminInquiry[];

export const PIPELINE: { id: AdminInquiry["status"]; label: string }[] = [
  { id: "new", label: "New" },
  { id: "replied", label: "Replied" },
  { id: "quoted", label: "Quoted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

/* ---------- traffic and the week (sample data) ---------- */

export const WEEK = [
  { day: "Mon", n: 9 },
  { day: "Tue", n: 14 },
  { day: "Wed", n: 22 },
  { day: "Thu", n: 17 },
  { day: "Fri", n: 12 },
  { day: "Sat", n: 5 },
  { day: "Sun", n: 3 },
];

/** Monthly inquiries and how many got a first reply inside 24 hours. */
export const MONTHS = [
  { m: "Jun", leads: 64, replied: 52 },
  { m: "Jul", leads: 71, replied: 60 },
  { m: "Aug", leads: 98, replied: 88 },
  { m: "Sep", leads: 132, replied: 121 },
  { m: "Oct", leads: 158, replied: 147 },
  { m: "Nov", leads: 142, replied: 134 },
];

/** Where buyers write from (the busiest markets), placed on the equirectangular world map by longitude and latitude. */
const at = (lon: number, lat: number) => ({ x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 });
export const MARKETS = [
  { name: "Germany", share: 18, ...at(10, 51) },
  { name: "United States", share: 16, ...at(-98, 39) },
  { name: "United Kingdom", share: 11, ...at(-2, 54) },
  { name: "Canada", share: 9, ...at(-106, 56) },
  { name: "Japan", share: 8, ...at(138, 36) },
  { name: "Australia", share: 6, ...at(134, -25) },
];
/** The factory, for the map's home pin. */
export const HOME_PIN = at(113.3, 23.1);

export const AGENDA = [
  { day: 2, from: 0, span: 2, label: "Sample run: Nord" },
  { day: 3, from: 1, span: 2, label: "Quote: Outfitters Lane" },
  { day: 4, from: 2, span: 1, label: "Factory video tour" },
  { day: 5, from: 0, span: 2, label: "Bulk confirm: Pop" },
];

/* ---------- visitor footprints (sample data) ---------- */

export type Step = { page: string; at: string };
export type Visitor = { id: string; flag: string; country: string; device: "Desktop" | "Mobile" | "Tablet"; source: string; searched?: string; trail: Step[]; live: boolean; left?: string };

/** Visitors now on the site, and a few who just left: where they came from and every page they went to. */
export const VISITORS: Visitor[] = [
  { id: "v1", flag: "🇩🇪", country: "Germany", device: "Desktop", source: "Google", searched: "wholesale winter boots supplier", live: true, trail: [{ page: "/", at: "0:00" }, { page: "/catalog?line=women", at: "0:42" }, { page: "/products/mira-tall", at: "1:58" }, { page: "/shipping", at: "3:10" }] },
  { id: "v2", flag: "🇺🇸", country: "United States", device: "Mobile", source: "LinkedIn", live: true, trail: [{ page: "/private-label", at: "0:00" }, { page: "/faq", at: "1:05" }] },
  { id: "v3", flag: "🇨🇦", country: "Canada", device: "Desktop", source: "Google", searched: "kids snow boots wholesale", live: true, trail: [{ page: "/catalog?line=kids", at: "0:00" }, { page: "/products/pop", at: "0:51" }, { page: "/size-guide", at: "2:14" }, { page: "/inquiry", at: "3:40" }] },
  { id: "v4", flag: "🇬🇧", country: "United Kingdom", device: "Tablet", source: "Direct", live: true, trail: [{ page: "/", at: "0:00" }, { page: "/container-planner", at: "1:30" }] },
  { id: "v5", flag: "🇯🇵", country: "Japan", device: "Desktop", source: "Bing", searched: "leather boots OEM China", live: false, left: "/products/nord", trail: [{ page: "/", at: "0:00" }, { page: "/products/nord", at: "0:37" }] },
  { id: "v6", flag: "🇸🇪", country: "Sweden", device: "Mobile", source: "Instagram", live: false, left: "/catalog", trail: [{ page: "/catalog", at: "0:00" }] },
];

/** The buying path, step by step, and how many of the week's visitors reach each step. */
export const FUNNEL = [
  { step: "Landed", page: "Any page", n: 4820 },
  { step: "Browsed the catalog", page: "/catalog", n: 2610 },
  { step: "Opened a style", page: "/products/…", n: 1745 },
  { step: "Started an inquiry", page: "Inquiry list", n: 412 },
  { step: "Sent it", page: "Inquiry form", n: 82 },
];

/** Where visitors leave the site from. */
export const EXITS = [
  { page: "/products/nord", exits: 312, rate: 38 },
  { page: "/catalog", exits: 288, rate: 22 },
  { page: "/shipping", exits: 164, rate: 41 },
  { page: "/inquiry", exits: 141, rate: 57 },
  { page: "/size-guide", exits: 96, rate: 33 },
];

/** Where they come from, and the search-engine words that brought them. */
export const SOURCES = [
  { name: "Google", share: 46 },
  { name: "Direct", share: 21 },
  { name: "LinkedIn", share: 12 },
  { name: "Bing", share: 8 },
  { name: "Instagram", share: 7 },
  { name: "Other", share: 6 },
];
export const KEYWORDS = [
  { q: "wholesale winter boots", n: 412 },
  { q: "boots manufacturer china", n: 268 },
  { q: "private label footwear", n: 199 },
  { q: "kids snow boots wholesale", n: 141 },
  { q: "ddp shoes supplier", n: 77 },
];

/** What visitors type into the site's own search; `found` is how many styles matched. */
export const SITE_SEARCHES = [
  { q: "chelsea", n: 96, found: 4 },
  { q: "waterproof", n: 81, found: 11 },
  { q: "vegan leather", n: 44, found: 0 },
  { q: "steel toe", n: 29, found: 0 },
  { q: "sneakers", n: 27, found: 6 },
  { q: "wide fit", n: 18, found: 0 },
];

/* ---------- the AI agent (preview) ---------- */

export type AgentTask = { id: string; title: string; text: string; mode: "suggest" | "ask" | "auto"; runs: number };
export const AGENT_TASKS: AgentTask[] = [
  { id: "reply", title: "Draft replies to new inquiries", text: "Reads each inquiry, checks stock and terms, and drafts a reply for the desk.", mode: "ask", runs: 38 },
  { id: "followup", title: "Chase unanswered quotes", text: "After 5 days with no answer, writes a short follow-up.", mode: "suggest", runs: 12 },
  { id: "copy", title: "Tune page copy", text: "Finds pages people leave fast and suggests shorter, clearer copy.", mode: "suggest", runs: 6 },
  { id: "search", title: "Fill search gaps", text: "Turns searches with no results into catalog or FAQ suggestions.", mode: "suggest", runs: 4 },
  { id: "report", title: "Weekly report", text: "Every Monday: inquiries, replies, top styles and drop-offs.", mode: "auto", runs: 9 },
];
export const AGENT_LOG = [
  { at: "09:42", text: "Drafted a reply to Nordlys Sko AS (1,200 pairs, DDP Oslo)", kind: "draft" },
  { at: "09:15", text: "Flagged 3 searches with no results: vegan leather, steel toe, wide fit", kind: "insight" },
  { at: "08:30", text: "Suggested a shorter intro for /shipping (41% leave from it)", kind: "copy" },
  { at: "Mon", text: "Sent the weekly report to the trade desk", kind: "report" },
];

export { SEASON_IDS };
