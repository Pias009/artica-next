/**
 * One source of truth for the buyer desk: size conversions, the order calendar, container loads, the markets we ship
 * to, the quality steps, the ways to verify us and where to meet us. Like the rest of the catalog these are client
 * placeholders (see README): confirm them before launch. Every page and homepage section renders from here.
 */

import { CASE_PACK, CASES_PER_PALLET, LEAD, PACK, type ProductLine } from "./products";

/* ---- Sizes ---- */

export type SizeRow = { us: string; uk: string; eu: string; cm: string };

/** US sizes from the case packs, with their UK, EU and foot-length equivalents. Indicative: the fit sample confirms. */
export const SIZE_CHART: Record<ProductLine, SizeRow[]> = {
  men: [
    { us: "7", uk: "6", eu: "40", cm: "25" },
    { us: "8", uk: "7", eu: "41", cm: "26" },
    { us: "9", uk: "8", eu: "42", cm: "27" },
    { us: "10", uk: "9", eu: "43", cm: "28" },
    { us: "11", uk: "10", eu: "44.5", cm: "29" },
    { us: "12", uk: "11", eu: "46", cm: "30" },
    { us: "13", uk: "12", eu: "47", cm: "31" },
  ],
  women: [
    { us: "5", uk: "3", eu: "36", cm: "22" },
    { us: "6", uk: "4", eu: "37", cm: "23" },
    { us: "7", uk: "5", eu: "38", cm: "24" },
    { us: "8", uk: "6", eu: "39", cm: "25" },
    { us: "9", uk: "7", eu: "40", cm: "26" },
    { us: "10", uk: "8", eu: "41", cm: "27" },
  ],
  kids: [
    { us: "11", uk: "10", eu: "28", cm: "17" },
    { us: "12", uk: "11", eu: "30", cm: "18" },
    { us: "13", uk: "12", eu: "31", cm: "19" },
    { us: "1", uk: "13", eu: "32", cm: "20" },
    { us: "2", uk: "1", eu: "33", cm: "21" },
    { us: "3", uk: "2", eu: "34", cm: "21.5" },
    { us: "4", uk: "3", eu: "36", cm: "22.5" },
  ],
};

/** The size chart joined with how many pairs of each size sit in one case. */
export const sizeTable = (line: ProductLine) =>
  SIZE_CHART[line].map((r) => ({ ...r, pairs: CASE_PACK[line].find(([s]) => s === r.us)?.[1] ?? 0 }));

/** "EU 40–47 · UK 6–12" for a line. */
export const sizeRange = (line: ProductLine) => {
  const rows = SIZE_CHART[line];
  const [a, z] = [rows[0], rows[rows.length - 1]];
  return `EU ${a.eu}–${z.eu} · UK ${a.uk}–${z.uk}`;
};

/* ---- Order calendar ---- */

const days = (lead: string) => Number.parseInt(lead, 10);
export const LEAD_DAYS = { samples: days(LEAD.samples), bulk: days(LEAD.bulk), delivery: days(LEAD.delivery) };
/** Time the buyer takes to approve a sample, and to get a delivery from the dock onto the shelf. */
export const REVIEW_DAYS = 7;
export const SHELF_DAYS = 7;

export type Season = {
  id: string;
  name: string;
  markets: string;
  /** Month (0–11) and day the boots should be on the shelf. */
  shelf: [month: number, day: number];
  note: string;
  /** Reorders of styles the buyer already knows skip samples. */
  reorder?: boolean;
  /** The season's photo (from the campaign set in public/images/models). */
  image: string;
};

export const SEASONS: Season[] = [
  {
    id: "north-winter",
    name: "Northern winter",
    markets: "North America, Europe, UK, Japan, Korea",
    shelf: [8, 15],
    note: "The main boot season.",
    image: "/images/models/07-banner-women-snow-onfeet.jpg",
  },
  {
    id: "south-winter",
    name: "Southern winter",
    markets: "Australia, New Zealand, Chile, South Africa",
    shelf: [3, 15],
    note: "Winter there runs June to August.",
    image: "/images/models/08-banner-duo-campaign-pavilion.jpg",
  },
  {
    id: "holiday",
    name: "Holiday reorder",
    markets: "North America, Europe, UK",
    shelf: [10, 15],
    note: "Top up the styles that sold through.",
    reorder: true,
    image: "/images/models/06-banner-men-street-onfeet.jpg",
  },
];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export type Milestone = { key: "samples" | "order" | "ships" | "shelf"; label: string; date: Date };

/** Works back from a shelf date: when to ask for samples, confirm bulk, when it ships. */
export function backPlan(shelf: Date, reorder = false): Milestone[] {
  const ships = addDays(shelf, -(SHELF_DAYS + LEAD_DAYS.delivery));
  const order = addDays(ships, -LEAD_DAYS.bulk);
  const samples = addDays(order, -(REVIEW_DAYS + LEAD_DAYS.samples));
  return [
    ...(reorder ? [] : [{ key: "samples", label: "Ask for samples", date: samples } as const]),
    { key: "order", label: "Confirm bulk order", date: order },
    { key: "ships", label: "Leaves the factory", date: ships },
    { key: "shelf", label: "On your shelves", date: shelf },
  ];
}

/** The next season whose bulk order date hasn't passed yet, planned back from its shelf date. */
export function nextPlan(season: Season, today: Date) {
  for (let year = today.getFullYear(); ; year++) {
    const plan = backPlan(new Date(year, season.shelf[0], season.shelf[1]), season.reorder);
    const order = plan.find((m) => m.key === "order")!.date;
    if (order >= today) return { plan, order, daysLeft: Math.round((order.getTime() - today.getTime()) / 86_400_000) };
  }
}

export const fmtDate = (d: Date, today?: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(today && d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });

/* ---- Container loads ---- */

export const CARTON = { cbm: 0.082, kg: 16.8 };
/** Indicative cases per container (client placeholders; confirmed on each quote). */
export const CONTAINERS = [
  { id: "20gp", name: "20ft container", cases: 280 },
  { id: "40gp", name: "40ft container", cases: 560 },
  { id: "40hc", name: "40ft high cube", cases: 600 },
] as const;
/** Under this many cases a shared container (LCL) usually costs less than a whole one. */
export const LCL_MAX_CASES = 100;

export function load(cases: number) {
  const fits = CONTAINERS.find((c) => cases <= c.cases);
  const big = CONTAINERS[CONTAINERS.length - 1];
  const count = fits ? 1 : Math.ceil(cases / big.cases);
  const box = fits ?? big;
  return {
    cases,
    pairs: cases * PACK,
    pallets: Math.ceil(cases / CASES_PER_PALLET),
    cbm: cases * CARTON.cbm,
    kg: cases * CARTON.kg,
    lcl: cases < LCL_MAX_CASES,
    container: box,
    count,
    /** How full the last container is, 0–1. */
    fill: (cases - (count - 1) * box.cases) / box.cases,
  };
}

/* ---- Markets ---- */

export type Market = {
  id: string;
  name: string;
  countries: string[];
  port: string;
  transit: string;
  terms: ("DDP" | "FOB" | "EXW")[];
  /** What the buyer's import usually needs. General guidance; their customs broker confirms. */
  rules: string[];
};

export const MARKETS: Market[] = [
  {
    id: "na",
    name: "North America",
    countries: ["United States", "Canada", "Mexico"],
    port: "Los Angeles · New York · Vancouver",
    transit: "14–34 days",
    terms: ["DDP", "FOB", "EXW"],
    rules: [
      "Country of origin marked on every pair and carton",
      "Kids' styles: US CPSIA lead and phthalate limits, with a children's product certificate",
      "California: Prop 65 warning where it applies",
      "Mexico: Spanish footwear labels (NOM-020-SCFI)",
    ],
  },
  {
    id: "eu",
    name: "European Union",
    countries: ["Germany", "France", "Netherlands", "Italy", "Spain", "Poland"],
    port: "Rotterdam · Hamburg",
    transit: "30–36 days",
    terms: ["DDP", "FOB", "EXW"],
    rules: [
      "REACH chemical limits, such as chromium VI in leather and azo dyes",
      "Material label for upper, lining and sole (Directive 94/11/EC)",
      "EU deforestation rules (EUDR) are coming for leather: ask us for traceability",
    ],
  },
  {
    id: "uk",
    name: "United Kingdom",
    countries: ["United Kingdom"],
    port: "Felixstowe · Southampton",
    transit: "32–38 days",
    terms: ["DDP", "FOB", "EXW"],
    rules: ["UK REACH chemical limits", "Material label for upper, lining and sole"],
  },
  {
    id: "me",
    name: "Middle East",
    countries: ["United Arab Emirates", "Saudi Arabia"],
    port: "Jebel Ali · Dammam",
    transit: "18–22 days",
    terms: ["FOB", "EXW"],
    rules: ["Saudi Arabia: a SABER conformity certificate for each shipment", "Arabic labels where your retailer asks for them"],
  },
  {
    id: "anz",
    name: "Australia & New Zealand",
    countries: ["Australia", "New Zealand"],
    port: "Sydney · Melbourne · Auckland",
    transit: "14–20 days",
    terms: ["DDP", "FOB", "EXW"],
    rules: ["Country of origin on the label", "Biosecurity: heat-treated (ISPM-15) pallets and a clean container"],
  },
  {
    id: "asia",
    name: "Japan & Korea",
    countries: ["Japan", "South Korea"],
    port: "Tokyo · Busan",
    transit: "5–10 days",
    terms: ["FOB", "EXW"],
    rules: ["Japan: leather footwear falls under a tariff-rate quota; duty outside the quota is high", "Korea: kids' styles need KC safety certification"],
  },
  {
    id: "latam",
    name: "South America",
    countries: ["Brazil", "Chile"],
    port: "Santos · Valparaíso",
    transit: "35–42 days",
    terms: ["FOB", "EXW"],
    rules: ["Chile: a China–Chile certificate of origin can lower duty", "Spanish or Portuguese labels"],
  },
  {
    id: "af",
    name: "Southern Africa",
    countries: ["South Africa"],
    port: "Durban",
    transit: "22–28 days",
    terms: ["FOB", "EXW"],
    rules: ["Country of origin on the label"],
  },
];

export const marketOf = (country: string) => MARKETS.find((m) => m.countries.includes(country));
export const MARKET_COUNTRIES = MARKETS.flatMap((m) => m.countries).sort();

/** Papers that travel with every export shipment. */
export const EXPORT_DOCS = ["Commercial invoice", "Packing list", "Bill of lading", "Certificate of origin"];

/* ---- Quality ---- */

export const QUALITY_STEPS = [
  { icon: "layers", title: "Materials in", text: "Leather, linings and soles are checked against your approved sample before cutting." },
  { icon: "sample", title: "Your fit sample", text: `You approve a sample in your size run before bulk starts. Samples reach you in about ${LEAD_DAYS.samples} days.` },
  { icon: "rows", title: "Checks on the line", text: "Stitching, bonding and sizing are checked at each stage of the line." },
  { icon: "shield", title: "Final inspection", text: "Random pairs from every batch are inspected, and a photo report reaches you before shipping." },
  { icon: "user", title: "Your own inspector", text: "Send your own QC or a third-party inspector before the balance is paid." },
] as const;

/** Documents buyers ask for. Shown as requests, not claims: the trade desk confirms what exists for each style. */
export const DOCUMENTS = [
  { title: "REACH test report", for: "EU and UK" },
  { title: "Children's product certificate (CPSIA)", for: "US, kids' styles" },
  { title: "Prop 65 test report", for: "California" },
  { title: "Material composition sheet", for: "Every market" },
  { title: "Factory audit report", for: "Retail chains" },
  { title: "Certificate of origin", for: "Every shipment" },
];

/* ---- Verify us ---- */

/**
 * Registration details shown on /verify. Leave a value empty until the client supplies it: empty rows read "Sent on
 * request" instead of showing a made-up number.
 */
export const REGISTRATION: { label: string; value: string }[] = [
  { label: "Registered name", value: "Guangzhou Chime Long Trading Co., Ltd" },
  { label: "Registered in", value: "Guangzhou, China" },
  { label: "Unified social credit code", value: "" },
  { label: "Business licence", value: "" },
  { label: "Export registration", value: "" },
  { label: "Registered address", value: "" },
];

export const VERIFY_STEPS = [
  { icon: "camera", title: "Tour the factory on a video call", text: "See the line, the samples room and the people you'll work with, live." },
  { icon: "list", title: "Check our licence", text: "We send our business licence; look the credit code up on China's national enterprise register (gsxt.gov.cn)." },
  { icon: "lock", title: "Pay a company account only", text: "Every payment goes to an account in our company name, the one printed on your proforma invoice." },
  { icon: "shield", title: "Inspect before you pay the balance", text: "Book your own inspection; the balance is due only after it." },
] as const;

/* ---- Meet us ---- */

/** Trade shows the team attends. Empty until dates are confirmed: the page then offers to email them instead. */
export const TRADE_SHOWS: { name: string; city: string; dates: string; booth?: string }[] = [];
