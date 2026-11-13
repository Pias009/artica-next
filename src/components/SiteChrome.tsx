import { Suspense, type ReactNode } from "react";
import { KaiLauncher } from "./assistant/KaiLauncher";
import { Fab } from "./Fab";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { InquiryDrawer } from "./inquiry/InquiryDrawer";
import { JsonLd } from "./JsonLd";
import { MarketingTags } from "./MarketingTags";
import { QuickView } from "./product/QuickView";
import { SeasonBackground } from "./season/SeasonBackground";
import { SeasonDock } from "./season/SeasonDock";
import { SiteHealth } from "./SiteHealth";
import { StoreHydrator } from "./StoreHydrator";
import { Toast } from "./Toast";
import { Track } from "./Track";
import { COMPANY, SOCIAL } from "@/lib/company";
import { absoluteUrl, DESCRIPTION, ORG_ID, SITE_NAME } from "@/lib/site";

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

/** Everything around a page of the public site: header, footer, season background, the drawer and dialogs. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      {/* design notes are for reviews of a local or preview build, not for the live site's source */}
      {process.env.NODE_ENV !== "production" && <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />}
      <JsonLd data={ORGANIZATION} />
      <JsonLd data={WEBSITE} />
      <StoreHydrator />
      {/* Normal polished background matching the season with subtle thematic graphics */}
      <SeasonBackground />
      <div id="page" className="min-h-screen w-full overflow-x-clip [--shell-pad:clamp(16px,3.2vw,48px)]">
        <Header />
        <main id="top" className="px-(--shell-pad) pb-4 max-md:pb-24">
          {children}
        </main>
        <Footer />
      </div>
      <Fab />
      <KaiLauncher />
      <SeasonDock />
      {/* the visitor log for the admin panel; useSearchParams needs a boundary on prerendered pages */}
      <Suspense fallback={null}>
        <Track />
      </Suspense>
      {/* real-visitor speed and errors, for Vela's Engineering team (admin panel) */}
      <SiteHealth />
      {/* the Social team's tags (Admin → Social), behind a cookie banner; nothing at all while none is on */}
      <MarketingTags />
      <QuickView />
      <InquiryDrawer />
      <Toast />
    </>
  );
}
