import type { MetadataRoute } from "next";
import { loadContent } from "@/lib/content/store";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";
import { SITE_PAGES } from "@/lib/site-pages";

/** Every page search engines should find, product photos included. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // without the styles and pages the admin panel has hidden
  const content = await loadContent();
  return [
    ...SITE_PAGES.filter((p) => content.pages[p.path]?.published !== false).map((p) => ({ url: absoluteUrl(p.path), changeFrequency: p.changeFrequency, priority: p.priority })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [absoluteUrl(p.outer.src), ...(p.zip ? [absoluteUrl(p.zip.src)] : [])],
    })),
  ];
}
