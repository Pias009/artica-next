import type { Metadata } from "next";

/**
 * The site's own address, for canonicals, share links, the sitemap and structured data. Set NEXT_PUBLIC_SITE_URL in
 * production; on Vercel the project's production domain stands in until it is.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const SITE_NAME = "Chime Long";

/** "/catalog" → "https://…/catalog" */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/** The share image (src/app/opengraph-image.jpg), for pages without a photo of their own. */
const DEFAULT_IMAGE = "/opengraph-image.jpg";

/** The Organization node every other piece of structured data points back to. */
export const ORG_ID = absoluteUrl("/#organization");

/**
 * A page's metadata in one go. Next replaces the layout's openGraph and twitter objects instead of merging them, so
 * each page sets its own share title, description, URL and image here, along with its canonical address. (Setting
 * openGraph also drops the layout's file-based share image, hence the default.)
 * `title` is the page's own part; the layout's template adds " · Chime Long" to the tab title.
 */
export function pageMeta({
  title,
  description,
  path,
  image,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const shareTitle = `${title} · ${SITE_NAME}`;
  const images = [image ?? DEFAULT_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title: shareTitle, description, url: path, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}
