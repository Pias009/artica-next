import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { CatalogView } from "@/components/product/CatalogView";
import { FILTERS, isFilter } from "@/lib/products";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Wholesale winter boots for men, women and kids. MOQ 300 pairs, 12 pairs per case.",
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ line?: string; q?: string }> }) {
  const { line, q = "" } = await searchParams;
  const filter = isFilter(line) ? line : "all";
  const label = FILTERS.find((f) => f.id === filter)?.label;

  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Catalog" }]}
        eyebrow="Fall/Winter 26 line sheet"
        title={filter === "all" ? "All styles" : `${label} styles`}
        text="Every style ships from 300 pairs, packed 12 per case with mixed size runs."
      />
      {/* key: remount when the header nav changes the query */}
      <CatalogView key={`${filter}|${q}`} initialFilter={filter} initialQuery={q} />
    </>
  );
}
