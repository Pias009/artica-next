import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Open to every crawler, AI answer engines included. The inquiry list and the season copies of "/" carry their own
 * noindex, which crawlers can only read if they may fetch the page, so nothing is disallowed here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
