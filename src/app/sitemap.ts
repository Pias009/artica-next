import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";
import { SITE_PAGES } from "@/lib/site-pages";

/** Every page search engines should find, product photos included. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...SITE_PAGES.map((p) => ({ url: absoluteUrl(p.path), changeFrequency: p.changeFrequency, priority: p.priority })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [absoluteUrl(p.outer.src), ...(p.zip ? [absoluteUrl(p.zip.src)] : [])],
    })),
  ];
}
