import { z } from "zod";
import { isPhotoSrc } from "./cloudinary";
import { CATEGORIES } from "../product-categories";
import { builtInProducts } from "../products";
import { SEASON_IDS } from "../season";

/** What saving the Products view accepts. Every field is checked again here, whatever the form allowed. */

const text = (label: string, max: number) => z.string().trim().max(max, `${label} can be at most ${max} characters.`);
const needed = (label: string, max: number) => text(label, max).min(1, `${label} is needed.`);

const Shot = z.object({
  src: z.string().max(400).refine(isPhotoSrc, "That photo isn't on the site or its Cloudinary account."),
  w: z.number().int().positive().max(20_000),
  h: z.number().int().positive().max(20_000),
});
const Material = z.object({
  icon: z.enum(["boot", "snow", "layers", "sole", "zip", "heel", "tag", "drop"]),
  label: needed("A detail's name", 30),
  value: needed("A detail's value", 80),
});
const Hotspot = z.object({ id: z.string().max(30), label: z.string().max(30), value: z.string().max(80), x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
const Color = z.object({
  name: needed("The colour", 24),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "The colour's code should look like #1D1E19."),
});
const Line = z.enum(["men", "women", "kids"]);
const Scene = z.enum(["sage", "sand", "blush", "stone"]);
const Category = z.enum(CATEGORIES as [string, ...string[]], "Unknown category.");
const Tags = z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9 -]{1,24}$/, "Tags use letters, numbers, spaces and hyphens.")).max(24);
const SizeRun = z.array(text("A size", 10).min(1)).min(1, "A style needs at least one size.").max(24);
const Materials = z.array(Material).max(12);

const Edit = z.object({
  live: z.boolean().optional(),
  featured: z.boolean().optional(),
  name: text("The name", 40).optional(),
  desc: text("The description", 600).optional(),
  seasons: z.array(z.enum(SEASON_IDS)).max(6).optional(),
  badge: z.enum(["Top reorder", "New", "Trending", "none"]).optional(),
  type: text("The type", 60).optional(),
  line: Line.optional(),
  category: z.union([z.literal(""), Category]).optional(),
  sizes: text("The size range", 30).optional(),
  sizeRun: SizeRun.optional(),
  spec: text("The short spec", 80).optional(),
  tags: Tags.optional(),
  outer: Shot.optional(),
  zip: Shot.nullable().optional(),
  materials: Materials.optional(),
  color: Color.optional(),
  scene: Scene.optional(),
  rating: text("The rating", 16).nullable().optional(),
});

export const AddedSchema = z.object({
  id: z.string().regex(/^n[a-z0-9]{6,20}$/, "Unknown style."),
  slug: z
    .string()
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The address can only use lowercase letters, numbers and hyphens."),
  name: needed("The name", 40),
  type: needed("The type", 60),
  line: Line,
  category: Category.optional(),
  badge: z.enum(["Top reorder", "New", "Trending"]).optional(),
  sizes: needed("The size range", 30),
  sizeRun: SizeRun,
  spec: needed("The short spec", 80),
  tags: Tags,
  outer: Shot,
  zip: Shot.optional(),
  desc: needed("The description", 600),
  materials: Materials.min(1, "Add at least one material."),
  hotspots: z.array(Hotspot).max(12),
  color: Color,
  scene: Scene,
  rating: text("The rating", 16).optional(),
});

export const ProductsPayload = z
  .object({ edits: z.record(z.string(), Edit), added: z.array(AddedSchema).max(500) })
  .superRefine(({ edits, added }, ctx) => {
    const built = builtInProducts();
    const ids = new Set(built.map((p) => p.id));
    const slugs = new Set(built.map((p) => p.slug));
    for (const p of added) {
      if (ids.has(p.id)) ctx.addIssue({ code: "custom", message: "That style is already in the catalogue." });
      if (slugs.has(p.slug)) ctx.addIssue({ code: "custom", message: `Another style already uses the address /products/${p.slug}.` });
      ids.add(p.id);
      slugs.add(p.slug);
    }
    if (Object.keys(edits).some((id) => !ids.has(id))) ctx.addIssue({ code: "custom", message: "Unknown style." });
  });
