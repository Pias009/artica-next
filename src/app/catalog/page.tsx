import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { CatalogIntroPanel, CatalogTerms } from "@/components/product/CatalogIntroPanel";
import { CatalogView } from "@/components/product/CatalogView";
import { LINES, parseCatalogParams } from "@/lib/catalog-filters";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Wholesale footwear for men, women and kids. MOQ 300 pairs, 12 pairs per case.",
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = parseCatalogParams(await searchParams);
  const label = LINES.find((l) => l.id === initial.line)?.label;

  return (
    <>
      {/* the colour field the glass toolbar, filters and cards sit on */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <PageIntro
        tone="clear"
        crumbs={[{ href: "/", label: "Home" }, { label: "Catalog" }]}
        title={initial.line === "all" ? "All products" : `${label} styles`}
        text="Women's, men's and kids' footwear for trade buyers. Filter by line, build, category and colour, then add styles to your inquiry."
        aside={<CatalogIntroPanel />}
      >
        <CatalogTerms />
      </PageIntro>
      {/* key: remount when the header nav changes the query */}
      <div className="wrap">
        <CatalogView key={JSON.stringify(initial)} initial={initial} />
      </div>
    </>
  );
}
