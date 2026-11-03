import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { CONTENT_ELEMENT, publicContent } from "@/lib/content/model";
import { loadContent } from "@/lib/content/store";
import { paintScript } from "@/lib/season";
import { DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

/*
 * Two families, both drawn for the whole world: Latin with every European accent, Cyrillic, Greek and Vietnamese, so
 * a buyer's name, company or street prints in the house type whatever the language.
 */

/** Interface and reading text: neutral, very legible small, with even-width figures for quantities and prices. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"],
});

/** Headings and the plum italic accent: a calm text serif that adjusts its shapes to its size. */
const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Chime Long · Wholesale footwear, factory-direct", template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // the share image is the opengraph-image file beside this layout; these are the words that go with it
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Chime Long · Wholesale footwear, factory-direct",
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "Chime Long · Wholesale footwear, factory-direct", description: DESCRIPTION },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

/**
 * The document shell every page shares: fonts and the season theme. What surrounds a page comes from its route group:
 * the public site's header, footer and drawer in (site)/layout.tsx, the admin's own frame in admin/.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // the admin panel's edits, applied before anything renders and handed to the browser below
  const content = publicContent(await loadContent());
  return (
    // data-season is set by the head script before first paint, so React leaves it alone on hydration
    <html lang="en" className={`${inter.variable} ${serif.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* the visitor's season theme, painted before anything shows (src/lib/season.ts); /admin's CSP allows it by hash */}
        <script dangerouslySetInnerHTML={{ __html: paintScript() }} />
        {/* data, not code (never run, so no CSP hash needed): content/live.ts reads it in the browser */}
        <script id={CONTENT_ELEMENT} type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(content).replace(/</g, "\\u003c") }} />
      </head>
      <body className="bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
