import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { Fab } from "@/components/Fab";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InquiryDrawer } from "@/components/inquiry/InquiryDrawer";
import { QuickView } from "@/components/product/QuickView";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toast } from "@/components/Toast";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Guangzhou Chime Long Trading Co., Ltd", template: "%s · Chime Long" },
  description: "Wholesale winter boots for North American retailers, distributors and private-label brands.",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

// Design direction contract, kept in the rendered HTML for design reviews.
const CONTRACT = `<!--
THESIS: A wholesale catalogue as calm and fresh as a winter morning: the boots and the cold do the selling, not badges, boxes or jargon. Refuses the busy B2B portal (dense grids, glass chips, mono "spec" labels).
OWN-WORLD: White canvas, frost-blue air (#E8EFF2 to #D5E3EA), product on snow-grey #F5F5F2, ink-black pill actions, one glacier accent #2D5D6F. Hanken Grotesk, sentence case, almost no borders.
STORY: Buyer sees the range, feels the cold it is built for, learns the wholesale terms, adds styles and requests the line sheet.
FIRST VIEWPORT: Packing-table grid; left "Twelve pairs. Every size. One case." with pricing and samples actions; right an open Chime Long carton from above, twelve size-stamped shoeboxes, one open on the boot; order slip and a five-cell terms bar below.
FORM: User-pinned reference (Quince, clean and fresh) over the seeded roll c4c2f88a. Signature motion: case-opening hero, scroll-scrubbed cold test (0 to −25°C), pinned up-close zoom, order journey.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={hanken.variable} data-scroll-behavior="smooth">
      <body className="bg-white font-sans text-ink antialiased">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <StoreHydrator />
        <div id="page" className="min-h-screen w-full overflow-x-clip bg-white [--shell-pad:clamp(16px,3.2vw,48px)]">
          <Header />
          <main id="top" className="px-(--shell-pad) pb-4 max-md:pb-24">
            {children}
          </main>
          <Footer />
        </div>
        <Fab />
        <QuickView />
        <InquiryDrawer />
        <Toast />
      </body>
    </html>
  );
}
