import type { AddedProduct, ProductEdit } from "../content/model";
import { categoryFor } from "../product-categories";
import { CASE_PACK, mergeEdit, SIZES, type Material, type MaterialIcon, type Product, type ProductLine, type Scene } from "../products";
import type { SeasonId } from "../season";

/*
 * The Products view's working copy of a style, what saving sends to the server, and the suggestions on the add page.
 * Suggestions come only from the type, colour and materials typed so far and from the catalogue itself, so they work
 * with no AI model and never invent a claim. Nothing here touches the page or the server.
 */

/** A style as the view edits it: its fields now, what it started from, and how it's listed. */
export type Item = AddedProduct & {
  added: boolean;
  base: AddedProduct;
  live: boolean;
  featured: boolean;
  pins: SeasonId[];
  inquiries: number;
};
export type Row = { base: Product; added: boolean; inquiries: number };

export const toItem = (row: Row, e: ProductEdit = {}): Item => ({
  ...mergeEdit(row.base, e),
  added: row.added,
  base: row.base,
  live: e.live !== false,
  featured: !!e.featured,
  pins: e.seasons ?? [],
  inquiries: row.inquiries,
});

/* ---------- what saving sends ---------- */

const TEXT = ["name", "desc", "type", "sizes", "spec"] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const tagsOf = (p: { tags: string[] }) => p.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);

/** How a built-in style differs from the catalogue as built: only that is stored. */
export function editOf(p: Item): ProductEdit {
  const b = p.base;
  const e: ProductEdit = {};
  for (const k of TEXT) if (p[k].trim() && p[k].trim() !== b[k]) e[k] = p[k].trim();
  if (p.line !== b.line) e.line = p.line;
  if (!same(p.category, b.category)) e.category = p.category ?? "";
  if (!same(p.badge, b.badge)) e.badge = p.badge ?? "none";
  if (!same(p.sizeRun, b.sizeRun)) e.sizeRun = p.sizeRun;
  if (!same(tagsOf(p), b.tags)) e.tags = tagsOf(p);
  if (!same(p.outer, b.outer)) e.outer = p.outer;
  if (!same(p.zip, b.zip)) e.zip = p.zip ?? null;
  if (!same(p.materials, b.materials)) e.materials = p.materials;
  if (!same(p.color, b.color)) e.color = p.color;
  if (p.scene !== b.scene) e.scene = p.scene;
  const rating = p.rating?.trim() || undefined;
  if (rating !== b.rating) e.rating = rating ?? null;
  return e;
}

const listing = (p: Item): ProductEdit => ({
  ...(!p.live && { live: false }),
  ...(p.featured && { featured: true }),
  ...(p.pins.length && { seasons: p.pins }),
});

/** A new style's whole record, with nothing left blank that the record shouldn't hold. */
export function recordOf(p: Item): AddedProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name.trim(),
    type: p.type.trim(),
    line: p.line,
    ...(p.category && { category: p.category }),
    ...(p.badge && { badge: p.badge }),
    sizes: p.sizes.trim(),
    sizeRun: p.sizeRun,
    spec: p.spec.trim(),
    tags: tagsOf(p),
    outer: p.outer,
    ...(p.zip && { zip: p.zip }),
    desc: p.desc.trim(),
    materials: p.materials,
    hotspots: p.hotspots,
    color: p.color,
    scene: p.scene,
    ...(p.rating?.trim() && { rating: p.rating.trim() }),
  };
}

export function toPayload(items: Item[]) {
  const edits: Record<string, ProductEdit> = {};
  for (const p of items) {
    const e = { ...(p.added ? {} : editOf(p)), ...listing(p) };
    if (Object.keys(e).length) edits[p.id] = e;
  }
  return { edits, added: items.filter((p) => p.added).map(recordOf) };
}

/* ---------- a new style ---------- */

const NO_PHOTO = { src: "", w: 0, h: 0 };
export const SPARE_ID = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function blankDraft(): Item {
  const p: AddedProduct = {
    id: SPARE_ID(),
    slug: "",
    name: "",
    type: "",
    line: "women",
    sizes: SIZES.women,
    sizeRun: CASE_PACK.women.map(([s]) => s),
    spec: "",
    tags: ["women"],
    outer: NO_PHOTO,
    desc: "",
    materials: [],
    hotspots: [],
    color: { name: "", hex: "#1D1E19" },
    scene: "sage",
  };
  return { ...p, added: true, base: p, live: true, featured: false, pins: [], inquiries: 0 };
}

export const slugFor = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The address for a name, numbered if another style has it. */
export function uniqueSlug(name: string, taken: Iterable<string>) {
  const base = slugFor(name);
  if (!base) return "";
  const all = new Set(taken);
  if (!all.has(base)) return base;
  let n = 2;
  while (all.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** What still stops a style going on the site. */
export function problems(p: Item, others: Item[]) {
  const out: string[] = [];
  const name = p.name.trim().toLowerCase();
  if (!name) out.push("Give it a name");
  else if (others.some((o) => o.id !== p.id && o.name.trim().toLowerCase() === name)) out.push("Another style already has this name");
  if (!p.type.trim()) out.push("Say what kind of shoe it is");
  if (!p.outer.src) out.push("Add a main photo");
  if (!p.color.name.trim()) out.push("Name its colour");
  if (!p.materials.some((m) => m.value.trim())) out.push("Add at least one material");
  if (p.materials.some((m) => !m.label.trim() || !m.value.trim())) out.push("Finish or remove the empty material row");
  if (!p.sizeRun.length) out.push("Add its sizes");
  if (!p.desc.trim()) out.push("Write a description");
  return out;
}

/* ---------- suggestions ---------- */

export type Option = { value: string; note?: string; hex?: string };

const tally = (values: string[]): Option[] => {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, n]) => ({ value, note: n === 1 ? "1 style" : `${n} styles` }));
};

/** Everything the catalogue already says, as options for the form's fields. */
export function vocabOf(list: AddedProduct[]) {
  const values = new Map<string, string[]>();
  for (const p of list) for (const m of p.materials) values.set(m.label, [...(values.get(m.label) ?? []), m.value]);
  const colors = new Map<string, { hex: string; n: number }>();
  // a colour's first swatch in the catalogue stands for it (a few names have more than one shade)
  for (const p of list) colors.set(p.color.name, { hex: colors.get(p.color.name)?.hex ?? p.color.hex, n: (colors.get(p.color.name)?.n ?? 0) + 1 });
  return {
    types: tally(list.map((p) => p.type)),
    labels: tally(list.flatMap((p) => p.materials.map((m) => m.label))),
    values: Object.fromEntries([...values].map(([label, v]) => [label, tally(v)])) as Record<string, Option[]>,
    tags: tally(list.flatMap((p) => p.tags).filter((t) => t !== "men" && t !== "women" && t !== "kids")),
    sizes: tally(list.map((p) => p.sizes)),
    colors: [...colors]
      .sort((a, b) => b[1].n - a[1].n)
      .map(([value, c]): Option => ({ value, hex: c.hex, note: c.n === 1 ? "1 style" : `${c.n} styles` })),
    ratings: tally(list.map((p) => p.rating ?? "")),
  };
}
export type Vocab = ReturnType<typeof vocabOf>;

/** The options for what's typed: every word must start a word in the option, and options starting with it come first. */
export function matchOptions(options: Option[], query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  const words = q.split(/\s+/);
  const hits = options.filter((o) => {
    const parts = o.value.toLowerCase().split(/[^a-z0-9]+/);
    return o.value.toLowerCase() !== q && words.every((w) => parts.some((part) => part.startsWith(w)));
  });
  return [...hits.filter((o) => o.value.toLowerCase().startsWith(q)), ...hits.filter((o) => !o.value.toLowerCase().startsWith(q))].slice(0, limit);
}

const first = (rules: [RegExp, string][], text: string) => rules.find(([re]) => re.test(text))?.[1] ?? "";

const UPPER: [RegExp, string][] = [
  [/crinkle/, "Crinkle patent"],
  [/patent/, "Patent"],
  [/nubuck/, "Nubuck-look synthetic"],
  [/suede/, "Suede"],
  [/quilted/, "Quilted synthetic"],
  [/metallic/, "Metallic leather"],
  [/leather|combat|chelsea|derby|loafer/, "Leather"],
  [/nylon|snow/, "Water-resistant nylon"],
  [/knit|sock|stretch/, "Stretch textile"],
  [/sport sandal|webbing/, "Webbing straps"],
];
const LINING: [RegExp, string][] = [
  [/shearling/, "Shearling blend"],
  [/fur|snow|fleece|winter/, "Warm lining"],
];
const CLOSURE: [RegExp, string][] = [
  [/chelsea/, "Elastic gore"],
  [/toggle/, "Toggle laces"],
  [/knee-high|tall/, "Full-length zip"],
  [/lace.*zip|zip.*lace/, "Laces + side zip"],
  [/lace.*buckle|buckle.*lace/, "Laces + buckle"],
  [/lace|derby|combat|hiker/, "Laces"],
  [/buckle/, "Buckle strap"],
  [/two-strap|cross-strap/, "Two hook-and-loop straps"],
  [/strap/, "Hook-and-loop strap"],
  [/zip/, "Side zip"],
  [/loafer|pump|flat|slide|mary jane/, "Slip-on"],
];
const SOLE: [RegExp, string][] = [
  [/cork/, "Cork-look wedge"],
  [/platform/, "Platform rubber"],
  [/sneaker|high-top/, "Rubber cupsole"],
  [/flat|pump/, "Flexible rubber"],
  [/boot|lug|hiker|chelsea/, "Rubber lug"],
];
const HEEL: [RegExp, string][] = [[/pump|heeled|block-heel|block heel/, "Block heel"]];

const iconFor = (label: string, value: string): MaterialIcon => {
  const l = label.toLowerCase();
  if (/upper/.test(l)) return "boot";
  if (/lining/.test(l)) return "snow";
  if (/closure|zip/.test(l)) return /zip/i.test(value) ? "zip" : "tag";
  if (/sole/.test(l)) return "sole";
  if (/heel/.test(l)) return "heel";
  if (/collar|shaft|cuff/.test(l)) return "layers";
  if (/finish/.test(l)) return "drop";
  return "tag";
};
export const material = (label: string, value: string): Material => ({ icon: iconFor(label, value), label, value });

const STANDARD: [label: string, rules: [RegExp, string][]][] = [
  ["Upper", UPPER],
  ["Lining", LINING],
  ["Closure", CLOSURE],
  ["Outsole", SOLE],
  ["Heel", HEEL],
];
const valueOf = (p: { materials: Material[] }, label: string) => p.materials.find((m) => m.label === label)?.value ?? "";

const TAGS: [string, RegExp][] = [
  ["waterproof", /waterproof|water-resistant|snow/],
  ["insulated", /shearling|fur|snow|warm lining|fleece/],
  ["leather", /(^|[^-\w])leather/],
  ["suede", /suede/],
  ["patent", /patent/],
  ["zip", /zip/],
  ["lace", /lace|derby/],
  ["buckle", /buckle/],
  ["strap", /strap/],
  ["chelsea", /chelsea/],
  ["hiker", /hiker/],
  ["snow", /snow/],
  ["tall", /knee-high|tall/],
  ["sneaker", /sneaker|high-top/],
  ["sandal", /sandal/],
  ["slide", /slide/],
  ["loafer", /loafer/],
  ["derby", /derby/],
  ["pump", /pump/],
  ["flat", /\bflat\b/],
];
/** Tags the site's filters and season picks go by, from what the style is and what it's made of. */
export function tagsFor(p: { type: string; line: ProductLine; materials: Material[] }) {
  const upper = valueOf(p, "Upper");
  // "Synthetic leather" isn't leather
  const text = `${p.type} ${p.materials.filter((m) => m.label !== "Upper").map((m) => m.value).join(" ")} ${/synthetic/i.test(upper) ? "" : upper}`.toLowerCase();
  return [p.line as string, ...TAGS.filter(([, re]) => re.test(text)).map(([t]) => t)];
}

export const specFor = (p: { materials: Material[] }) =>
  [valueOf(p, "Upper"), valueOf(p, "Heel") || valueOf(p, "Outsole")].filter(Boolean).join(" · ");

/** A plain first description, in the catalogue's own style: "Black suede ankle boot with side zip and rubber lug outsole". */
export function descFor(p: { type: string; color: { name: string }; materials: Material[] }) {
  if (!p.type.trim()) return "";
  const type = p.type.trim().toLowerCase();
  const upper = valueOf(p, "Upper").toLowerCase();
  const said = upper.split(/\s+/).some((w) => type.includes(w));
  const features = [valueOf(p, "Closure"), valueOf(p, "Heel"), valueOf(p, "Outsole") && `${valueOf(p, "Outsole")} outsole`]
    .filter(Boolean)
    .map((f) => f.toLowerCase().replace(" + ", " and "));
  const list = features.length > 1 ? `${features.slice(0, -1).join(", ")} and ${features[features.length - 1]}` : features[0];
  const head = [p.color.name, !said && upper, type].filter(Boolean).join(" ");
  return `${head[0].toUpperCase()}${head.slice(1)}${list ? ` with ${list}` : ""}`;
}

const SCENES: Scene[] = ["sage", "sand", "blush", "stone"];
/** The backdrop its line uses least, so a new style doesn't repeat its neighbours. */
const sceneFor = (line: ProductLine, list: AddedProduct[]) => {
  const used = (s: Scene) => list.filter((p) => p.line === line && p.scene === s).length;
  return [...SCENES].sort((a, b) => used(a) - used(b))[0];
};

/**
 * Fills in everything that can be worked out, and leaves alone whatever the admin has typed (`touched`: field names,
 * or "mat:Upper" for one material). Run on every change on the add page, so suggestions follow the fields above them.
 */
export function autofill(p: Item, touched: ReadonlySet<string>, list: AddedProduct[], vocab: Vocab): Item {
  const text = p.type.toLowerCase();
  const standard = STANDARD.flatMap(([label, rules]) => {
    const value = touched.has(`mat:${label}`) ? valueOf(p, label) : first(rules, text);
    return value || touched.has(`mat:${label}`) ? [material(label, value)] : [];
  }).filter((m) => m.value || p.materials.some((x) => x.label === m.label));
  const extra = p.materials.filter((m) => !STANDARD.some(([label]) => label === m.label));
  const next: Item = { ...p, materials: [...standard, ...extra] };
  if (!touched.has("sizes")) next.sizes = SIZES[p.line];
  if (!touched.has("sizeRun")) next.sizeRun = CASE_PACK[p.line].map(([s]) => s);
  if (!touched.has("scene")) next.scene = sceneFor(p.line, list);
  if (!touched.has("hex")) {
    const known = vocab.colors.find((c) => c.value.toLowerCase() === p.color.name.trim().toLowerCase());
    if (known?.hex) next.color = { ...p.color, hex: known.hex };
  }
  next.tags = touched.has("tags") ? [p.line, ...p.tags.filter((t) => t !== "men" && t !== "women" && t !== "kids")] : tagsFor(next);
  if (!touched.has("spec")) next.spec = specFor(next);
  if (!touched.has("desc")) next.desc = descFor(next);
  return next;
}

/** A new style that starts from an existing one: its make, never its name or photos. */
export function fromTemplate(p: Item, t: AddedProduct): { item: Item; touched: string[] } {
  const item: Item = {
    ...p,
    type: t.type,
    line: t.line,
    category: t.category,
    sizes: t.sizes,
    sizeRun: t.sizeRun,
    spec: t.spec,
    tags: t.tags,
    materials: t.materials,
    color: t.color,
    scene: t.scene,
    rating: t.rating,
  };
  return { item, touched: ["sizes", "sizeRun", "spec", "tags", "hex", "scene", "type", ...t.materials.map((m) => `mat:${m.label}`), ...STANDARD.map(([l]) => `mat:${l}`)] };
}

/** Switching line: the line's tag follows, and so do the sizes unless they've been changed from that line's own. */
export function withLine(p: Item, line: ProductLine): Item {
  const run = (l: ProductLine) => CASE_PACK[l].map(([s]) => s);
  const tags = [line as string, ...p.tags.filter((t) => t !== "men" && t !== "women" && t !== "kids")];
  return {
    ...p,
    line,
    tags,
    sizes: p.sizes === SIZES[p.line] ? SIZES[line] : p.sizes,
    sizeRun: same(p.sizeRun, run(p.line)) ? run(line) : p.sizeRun,
  };
}

/** Existing styles it may be a repeat of, closest first. */
export function similarStyles(p: Item, list: AddedProduct[], n = 3) {
  if (!p.type.trim()) return [];
  const category = categoryFor(p);
  const upper = valueOf(p, "Upper");
  const score = (x: AddedProduct) =>
    (x.type.toLowerCase() === p.type.trim().toLowerCase() ? 3 : 0) +
    (categoryFor(x) === category && x.line === p.line ? 2 : 0) +
    (p.color.name && x.color.name.toLowerCase() === p.color.name.trim().toLowerCase() ? 2 : 0) +
    (upper && valueOf(x, "Upper") === upper ? 1 : 0);
  return list
    .filter((x) => x.id !== p.id)
    .map((x) => ({ x, s: score(x) }))
    .filter((r) => r.s >= 4)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((r) => r.x);
}

const NAMES =
  "Alder Aspen Bramble Briar Cedar Clover Cove Dune Elm Fern Fjord Flint Glen Harbor Hazel Heath Iris Ivy Juniper Kestrel Lark Laurel Linden Maple Marlow Moss Oak Orla Quill Rowan Sable Sage Sorrel Sparrow Thistle Wren Willow Yarrow Zephyr".split(" ");
/** Short names in the catalogue's style that no style uses yet. */
export function nameIdeas(list: { name: string }[]): Option[] {
  const used = new Set(list.map((p) => p.name.trim().toLowerCase()));
  return NAMES.filter((n) => !used.has(n.toLowerCase())).map((value) => ({ value }));
}
