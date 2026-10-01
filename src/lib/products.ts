/**
 * One source of truth for every product section, the Quick View and the inquiry list.
 * Style names, sizes, specs, ratios and lead times are client placeholders (see README).
 */

export type ProductLine = "men" | "women" | "kids";
export type Filter = ProductLine | "waterproof" | "insulated" | "all";
export type Scene = "sage" | "sand" | "blush" | "stone";
export type MaterialIcon = "boot" | "snow" | "layers" | "sole" | "zip" | "heel" | "tag" | "drop";

export type Material = { icon: MaterialIcon; label: string; value: string };
export type Hotspot = { id: string; label: string; value: string; x: number; y: number };
export type Shot = { src: string; w: number; h: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  type: string;
  line: ProductLine;
  badge?: "Top reorder" | "New" | "Trending";
  sizes: string;
  sizeRun: string[];
  spec: string;
  tags: string[];
  outer: Shot;
  zip?: Shot;
  desc: string;
  materials: Material[];
  hotspots: Hotspot[];
  color: { name: string; hex: string };
  scene: Scene;
  /** "−25°C" style rating shown in the spotlight, if any. */
  rating?: string;
};

/** Wholesale terms shared by every style. */
export const PACK = 12; // pairs per case
export const MOQ_CASES = 25; // 300 pairs
export const STEP_CASES = 5;
export const MOQ_PAIRS = MOQ_CASES * PACK;
export const PRIVATE_LABEL_MIN = 600;
export const LEAD = { quote: "24h", samples: "10d", bulk: "45d", delivery: "20d" } as const;

export const LINE_LABEL: Record<ProductLine, string> = { men: "Men", women: "Women", kids: "Kids" };

/** Pairs of each size inside one 12-pair case, per line. */
export const CASE_PACK: Record<ProductLine, [size: string, pairs: number][]> = {
  men: [["7", 1], ["8", 2], ["9", 2], ["10", 3], ["11", 2], ["12", 1], ["13", 1]],
  women: [["5", 1], ["6", 2], ["7", 3], ["8", 3], ["9", 2], ["10", 1]],
  kids: [["11", 1], ["12", 2], ["13", 2], ["1", 3], ["2", 2], ["3", 1], ["4", 1]],
};

export const img = (file: string) => `/images/${file}.webp`;
const shot = (file: string, w: number, h: number): Shot => ({ src: img(file), w, h });

export const products: Product[] = [
  {
    id: "p04",
    slug: "nord",
    name: "Nord",
    type: "Winter leather lace-up",
    line: "men",
    badge: "Top reorder",
    sizes: "US 7–13",
    sizeRun: CASE_PACK.men.map(([s]) => s),
    spec: "Leather · Shearling",
    tags: ["men", "waterproof", "insulated", "leather", "lace"],
    outer: shot("p04-men-leather-winter-lace-up-outer-view", 1233, 866),
    zip: shot("p04-men-leather-winter-lace-up-zip-view", 1256, 891),
    desc: "Black leather lace-up boot with grey wool herringbone collar and metal hooks",
    materials: [
      { icon: "boot", label: "Upper", value: "Full-grain leather" },
      { icon: "snow", label: "Lining", value: "Shearling blend" },
      { icon: "layers", label: "Collar", value: "Wool herringbone" },
      { icon: "sole", label: "Outsole", value: "Rubber lug, 6 mm" },
      { icon: "zip", label: "Closure", value: "Laces + side zip" },
      { icon: "heel", label: "Heel", value: "3 cm" },
    ],
    hotspots: [
      { id: "collar", label: "Collar", value: "Wool herringbone", x: 17, y: 18 },
      { id: "eyelets", label: "Eyelets", value: "Metal hooks", x: 40, y: 16 },
      { id: "upper", label: "Upper", value: "Full-grain leather", x: 62, y: 64 },
      { id: "welt", label: "Welt", value: "Stitched, sealed", x: 80, y: 81 },
      { id: "outsole", label: "Outsole", value: "Rubber lug, 6 mm", x: 42, y: 94 },
    ],
    color: { name: "Black", hex: "#1D1E19" },
    scene: "sage",
    rating: "−25°C",
  },
  {
    id: "p05",
    slug: "tundra",
    name: "Tundra",
    type: "Shearling leather zip boot",
    line: "men",
    badge: "New",
    sizes: "US 7–13",
    sizeRun: CASE_PACK.men.map(([s]) => s),
    spec: "Leather · Side zip",
    tags: ["men", "insulated", "leather", "zip"],
    outer: shot("p05-leather-shearling-zip-boot-outer-view", 788, 616),
    desc: "Black smooth leather ankle boot with long diagonal side zip and stitched cap toe",
    materials: [
      { icon: "boot", label: "Upper", value: "Smooth leather" },
      { icon: "snow", label: "Lining", value: "Shearling blend" },
      { icon: "tag", label: "Toe", value: "Stitched cap toe" },
      { icon: "sole", label: "Outsole", value: "Rubber lug" },
      { icon: "zip", label: "Closure", value: "Diagonal side zip" },
      { icon: "heel", label: "Heel", value: "3 cm" },
    ],
    hotspots: [
      { id: "pull", label: "Zip pull", value: "Metal, easy grip", x: 15, y: 11 },
      { id: "zip", label: "Side zip", value: "Long diagonal zip", x: 40, y: 48 },
      { id: "toe", label: "Toe", value: "Stitched cap toe", x: 80, y: 72 },
      { id: "outsole", label: "Outsole", value: "Rubber lug", x: 55, y: 92 },
    ],
    color: { name: "Black", hex: "#1D1E19" },
    scene: "sand",
  },
  {
    id: "p01",
    slug: "mira",
    name: "Mira",
    type: "Suede ankle zip boot",
    line: "women",
    badge: "Top reorder",
    sizes: "US 5–10",
    sizeRun: CASE_PACK.women.map(([s]) => s),
    spec: "Suede · Block heel",
    tags: ["women", "insulated", "suede", "zip"],
    outer: shot("p01-women-suede-ankle-outer-view", 984, 916),
    zip: shot("p01-women-suede-ankle-zip-view", 1020, 917),
    desc: "Black suede ankle boot with inside zip, branded ARTICA pull and block heel",
    materials: [
      { icon: "boot", label: "Upper", value: "Suede" },
      { icon: "snow", label: "Lining", value: "Warm lining" },
      { icon: "zip", label: "Closure", value: "Inside zip" },
      { icon: "tag", label: "Zip pull", value: "Branded ARTICA" },
      { icon: "heel", label: "Heel", value: "Block heel" },
      { icon: "sole", label: "Outsole", value: "Rubber lug" },
    ],
    hotspots: [
      { id: "pull", label: "Zip pull", value: "Branded ARTICA", x: 28, y: 11 },
      { id: "upper", label: "Upper", value: "Soft black suede", x: 55, y: 55 },
      { id: "heel", label: "Heel", value: "Block heel", x: 15, y: 82 },
      { id: "outsole", label: "Outsole", value: "Rubber lug", x: 72, y: 93 },
    ],
    color: { name: "Black", hex: "#1D1E19" },
    scene: "sage",
  },
  {
    id: "p02",
    slug: "mira-tall",
    name: "Mira Tall",
    type: "Knee-high suede boot",
    line: "women",
    badge: "Trending",
    sizes: "US 5–10",
    sizeRun: CASE_PACK.women.map(([s]) => s),
    spec: "Suede · Full zip",
    tags: ["women", "suede", "zip", "tall"],
    outer: shot("p02-women-tall-suede-outer-view", 647, 1156),
    zip: shot("p02-women-tall-suede-zip-view", 657, 1096),
    desc: "Black suede knee-high boot with full-length zip and block heel",
    materials: [
      { icon: "boot", label: "Upper", value: "Suede" },
      { icon: "snow", label: "Lining", value: "Warm lining" },
      { icon: "layers", label: "Shaft", value: "38 cm" },
      { icon: "zip", label: "Closure", value: "Full-length zip" },
      { icon: "heel", label: "Heel", value: "Block heel" },
      { icon: "sole", label: "Outsole", value: "Rubber lug" },
    ],
    hotspots: [],
    color: { name: "Black", hex: "#1D1E19" },
    scene: "stone",
  },
  {
    id: "p03",
    slug: "pop",
    name: "Pop",
    type: "Patent lace-up boot",
    line: "kids",
    badge: "New",
    sizes: "Youth 11–4",
    sizeRun: CASE_PACK.kids.map(([s]) => s),
    spec: "Patent · Side zip",
    tags: ["kids", "patent", "lace", "pink"],
    outer: shot("p03-pink-patent-lace-up-outer-view", 948, 751),
    zip: shot("p03-pink-patent-lace-up-zip-view", 932, 720),
    desc: "Pink patent 8-eyelet lace-up boot with black laces, black collar trim and side zip",
    materials: [
      { icon: "boot", label: "Upper", value: "Patent" },
      { icon: "tag", label: "Eyelets", value: "8 eyelets" },
      { icon: "layers", label: "Collar", value: "Black trim" },
      { icon: "zip", label: "Closure", value: "Laces + side zip" },
      { icon: "sole", label: "Sole", value: "Welt-look rubber" },
      { icon: "drop", label: "Finish", value: "Wipe-clean" },
    ],
    hotspots: [
      { id: "collar", label: "Collar", value: "Black trim", x: 28, y: 7 },
      { id: "eyelets", label: "Eyelets", value: "8 eyelets", x: 47, y: 38 },
      { id: "upper", label: "Upper", value: "Pink patent", x: 25, y: 48 },
      { id: "sole", label: "Sole", value: "Welt-look rubber", x: 45, y: 90 },
    ],
    color: { name: "Pink", hex: "#EFC3C6" },
    scene: "blush",
  },
];

export const byId: Record<string, Product> = Object.fromEntries(products.map((p) => [p.id, p]));
export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const inLine = (line: ProductLine) => products.filter((p) => p.line === line);

/* ---------- detail crops (cut from the same photos with CSS, no extra files) ---------- */

export type Crop = {
  id: string;
  productId: string;
  label: string;
  shot: Shot;
  /** Crop center and width, as fractions of the source photo. */
  cx: number;
  cy: number;
  w: number;
};

const P = byId;
export const CROPS: Crop[] = [
  { id: "collar", productId: "p04", label: "Wool collar", shot: P.p04.outer, cx: 0.17, cy: 0.2, w: 0.25 },
  { id: "eyelets", productId: "p04", label: "Metal hooks", shot: P.p04.outer, cx: 0.44, cy: 0.27, w: 0.27 },
  { id: "lining", productId: "p04", label: "Shearling lining", shot: P.p04.zip!, cx: 0.71, cy: 0.2, w: 0.25 },
  { id: "stitching", productId: "p04", label: "Stitched welt", shot: P.p04.outer, cx: 0.68, cy: 0.8, w: 0.25 },
  { id: "zip-pull", productId: "p01", label: "ARTICA zip pull", shot: P.p01.zip!, cx: 0.77, cy: 0.3, w: 0.26 },
  { id: "heel", productId: "p02", label: "Block heel", shot: P.p02.zip!, cx: 0.67, cy: 0.86, w: 0.46 },
  { id: "patent", productId: "p03", label: "Pink patent", shot: P.p03.zip!, cx: 0.51, cy: 0.33, w: 0.32 },
];
export const cropsFor = (productId: string) => CROPS.filter((c) => c.productId === productId);

/** Background styles that show a crop at a given box aspect (width / height). */
export function cropStyle(c: Pick<Crop, "shot" | "cx" | "cy" | "w">, aspect = 4 / 5) {
  const { w: W, h: H, src } = c.shot;
  const h = Math.min(1, (c.w * W) / (H * aspect));
  const x = Math.min(Math.max(c.cx - c.w / 2, 0), 1 - c.w);
  const y = Math.min(Math.max(c.cy - h / 2, 0), 1 - h);
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: `${100 / c.w}% auto`,
    backgroundPosition: `${c.w < 1 ? (x / (1 - c.w)) * 100 : 50}% ${h < 1 ? (y / (1 - h)) * 100 : 50}%`,
    backgroundRepeat: "no-repeat",
  } as const;
}

/* ---------- filters ---------- */

export const FILTERS: { id: Filter; label: string; icon: "man" | "woman" | "kid" | "drop" | "snow" | "grid" }[] = [
  { id: "men", label: "Men", icon: "man" },
  { id: "women", label: "Women", icon: "woman" },
  { id: "kids", label: "Kids", icon: "kid" },
  { id: "waterproof", label: "Waterproof", icon: "drop" },
  { id: "insulated", label: "Insulated", icon: "snow" },
  { id: "all", label: "All styles", icon: "grid" },
];

export const isFilter = (v: unknown): v is Filter => FILTERS.some((f) => f.id === v);

export function filterProducts(list: Product[], filter: Filter, query: string) {
  const q = query.trim().toLowerCase();
  return list.filter(
    (p) =>
      (filter === "all" || p.tags.includes(filter)) &&
      (!q || [p.name, p.type, p.spec, p.line, p.id, ...p.tags].join(" ").toLowerCase().includes(q)),
  );
}

export const related = (p: Product, n = 4) =>
  [...products.filter((x) => x.id !== p.id && x.line === p.line), ...products.filter((x) => x.line !== p.line)].slice(0, n);

export const badgeTone = (b?: Product["badge"]) => (b === "New" ? "new" : "hot");
