import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Fab } from "@/components/Fab";
import { SeasonPreview } from "@/components/season/SeasonPreview";
import { SeasonWorld } from "@/components/season/world/SeasonWorld";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InquiryDrawer } from "@/components/inquiry/InquiryDrawer";
import { JsonLd } from "@/components/JsonLd";
import { QuickView } from "@/components/product/QuickView";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toast } from "@/components/Toast";
import { COMPANY, SOCIAL } from "@/lib/company";
import { seasonScript } from "@/lib/season";
import { absoluteUrl, ORG_ID, SITE_NAME, SITE_URL } from "@/lib/site";
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

// kept under ~155 characters so search results show it whole
const DESCRIPTION =
  "Factory-direct wholesale boots, sneakers and sandals from Guangzhou for retailers and private-label brands. From 300 pairs per style, samples in 10 days.";

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
 * Who we are, for search engines. Email and phone stay out until company.ts holds the real ones (they're placeholders);
 * social profiles join through SOCIAL as soon as they exist.
 */
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: COMPANY.name,
  alternateName: SITE_NAME,
  url: absoluteUrl("/"),
  logo: absoluteUrl("/images/chime-long-logo.png"),
  description: DESCRIPTION,
  address: { "@type": "PostalAddress", addressLocality: "Guangzhou", addressCountry: "CN" },
  areaServed: "Worldwide",
  knowsAbout: ["Wholesale footwear", "Private label footwear", "OEM shoe manufacturing", "Winter boots", "Footwear export shipping"],
  ...(SOCIAL.length ? { sameAs: SOCIAL.map((s) => s.href) } : {}),
};

/** The site itself, with the catalog search so engines can offer a search box straight into it. */
const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: absoluteUrl("/"),
  publisher: { "@id": ORG_ID },
  inLanguage: "en",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/catalog")}?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

// Design direction contract, kept in the rendered HTML for design reviews.
const CONTRACT = `<!--
THESIS: A wholesale catalogue as calm and fresh as a winter morning: the boots and the cold do the selling, not badges, boxes or jargon. Refuses the busy B2B portal (dense grids, glass chips, mono "spec" labels).
OWN-WORLD: White canvas, frost-blue air (#E8EFF2 to #D5E3EA), product on snow-grey #F5F5F2, ink-black pill actions, one glacier accent #2D5D6F. Inter for text, Source Serif 4 for headings, sentence case, almost no borders.
STORY: Buyer sees the range, feels the cold it is built for, learns the wholesale terms, adds styles and requests the line sheet.
FIRST VIEWPORT: A studio still life in slow motion: one pair of every kind drifts left to right along a floating oak shelf sloping down to the bottom right; any pair opens its details. Top right: "Factory-direct footwear for retail shelves.", the style counts per line, "Get wholesale pricing".
FORM: User-pinned reference (Quince, clean and fresh) over the seeded roll c4c2f88a. Signature motion: shelf-lineup hero, scroll-scrubbed cold test (0 to −25°C), pinned up-close zoom, order journey.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-season is set by the head script before first paint, so React leaves it alone on hydration
    <html lang="en" className={`${inter.variable} ${serif.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* the visitor's season theme, painted before anything shows (src/lib/season.ts) */}
        <script dangerouslySetInnerHTML={{ __html: seasonScript() }} />
      </head>
      <body className="bg-white font-sans text-ink antialiased">
        {/* design notes are for reviews of a local or preview build, not for the live site's source */}
        {process.env.NODE_ENV !== "production" && <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />}
        <JsonLd data={ORGANIZATION} />
        <JsonLd data={WEBSITE} />
        <StoreHydrator />
        {/* the season's 3D world behind every page (WebGL; the CSS season gradient stays as the fallback) */}
        <SeasonWorld />
        <div id="page" className="min-h-screen w-full overflow-x-clip [--shell-pad:clamp(16px,3.2vw,48px)]">
          <Header />
          <main id="top" className="px-(--shell-pad) pb-4 max-md:pb-24">
            {children}
          </main>
          <Footer />
        </div>
        <Fab />
        <SeasonPreview />
        <QuickView />
        <InquiryDrawer />
        <Toast />
      </body>
    </html>
  );
}
