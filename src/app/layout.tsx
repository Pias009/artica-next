import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Fab } from "@/components/Fab";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InquiryDrawer } from "@/components/inquiry/InquiryDrawer";
import { QuickView } from "@/components/product/QuickView";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Toast } from "@/components/Toast";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "ARTICA Wholesale", template: "%s · ARTICA Wholesale" },
  description: "Wholesale winter boots for North American retailers, distributors and private-label brands.",
};

export const viewport: Viewport = {
  themeColor: "#FBFBF8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={manrope.variable} data-scroll-behavior="smooth">
      <body className="bg-surface font-sans text-ink antialiased">
        <StoreHydrator />
        <div
          id="page"
          className="min-h-screen w-full overflow-x-clip bg-surface px-(--shell-pad) pt-[18px] pb-[22px] max-md:pb-24 [--shell-pad:clamp(16px,2.5vw,40px)]"
        >
          <Header />
          <main id="top">{children}</main>
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
