import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageIntro } from "@/components/PageIntro";
import { CatalogIntroPanel, CatalogTerms } from "@/components/product/CatalogIntroPanel";
import { CatalogView } from "@/components/product/CatalogView";
import { EMPTY, parseCatalogParams, type CatalogState } from "@/lib/catalog-filters";
import { categoryOf, MOQ_PAIRS, PACK, products, type ProductLine } from "@/lib/products";
import { isSeason, SEASON_COOKIE, SEASONS } from "@/lib/season";
import { inSeason } from "@/lib/season-products";
import { pageMeta } from "@/lib/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SIZES: Record<ProductLine, string> = { women: "US 5–10", men: "US 7–13", kids: "Youth 11–4" };
const count = (line: ProductLine) => products.filter((p) => p.line === line).length;
/** A line's categories, most styles first: "Ankle boots, Sandals & slides, …" */
function categories(line: ProductLine, n = 5) {
  const tally = new Map<string, number>();
  for (const p of products) if (p.line === line) tally.set(categoryOf(p), (tally.get(categoryOf(p)) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c.toLowerCase());
}
const terms = `from ${MOQ_PAIRS} pairs per style, ${PACK} pairs per case`;

/**
 * Each single view of the catalog is a landing page of its own (a search for "wholesale women's boots" should land on
 * the women's view), with its own title, words and canonical. Combined filters, searches and sorts point back to
 * /catalog so search engines don't index every combination.
 */
function view(s: CatalogState) {
  const only = (k: keyof CatalogState) =>
    (Object.keys(EMPTY) as (keyof CatalogState)[]).every((x) => x === k || JSON.stringify(s[x]) === JSON.stringify(EMPTY[x]));
  if (s.season && only("season")) {
    const t = SEASONS[s.season];
    const n = products.filter((p) => inSeason(p, t.id)).length;
    const lead = `${n} wholesale styles for ${t.name.toLowerCase()}: ${t.line.charAt(0).toLowerCase()}${t.line.slice(1)}`;
    const withTerms = `${lead} ${terms[0].toUpperCase()}${terms.slice(1)}.`;
    return {
      path: `/catalog?season=${t.id}`,
      title: `Wholesale ${t.name.toLowerCase()} footwear`,
      h1: `${t.name} styles.`,
      text: t.line,
      // the terms only when they fit within ~160 characters
      description: withTerms.length <= 160 ? withTerms : lead,
    };
  }
  if (s.features.length === 1 && s.line === "all" && only("features")) {
    const f = s.features[0];
    const n = products.filter((p) => p.tags.includes(f)).length;
    return f === "waterproof"
      ? {
          path: "/catalog?line=waterproof",
          title: "Wholesale waterproof boots",
          h1: "Waterproof boots.",
          text: `${n} styles built to keep water out, for wet-weather and winter shelves. Sold by the case, ${terms}.`,
          description: `Wholesale waterproof boots for women, men and kids: ${n} styles for wet and winter weather, ${terms}. Samples in 10 days.`,
        }
      : {
          path: "/catalog?line=insulated",
          title: "Wholesale insulated winter boots",
          h1: "Insulated winter boots.",
          text: `${n} warm-lined styles for the coldest weeks of the year. Sold by the case, ${terms}.`,
          description: `Wholesale insulated winter boots for women, men and kids: ${n} warm-lined styles, ${terms}. Samples in 10 days.`,
        };
  }
  if (s.line !== "all" && only("line")) {
    const line = s.line;
    const who = { women: "women's", men: "men's", kids: "kids'" }[line];
    const cats = categories(line);
    const n = count(line);
    const title = line === "men" ? "Wholesale men's boots" : `Wholesale ${who} shoes and boots`;
    return {
      path: `/catalog?line=${line}`,
      title,
      h1: `${title}.`,
      text: `${n} ${who} ${n === 1 ? "style" : "styles"}: ${cats.join(", ")}. Sold by the ${PACK}-pair case in ${SIZES[line]}, from ${MOQ_PAIRS} pairs per style.`,
      description: `${n} wholesale ${who} styles: ${cats.slice(0, 4).join(", ")}. ${terms[0].toUpperCase()}${terms.slice(1)}, ${SIZES[line]}.`,
    };
  }
  return {
    path: "/catalog",
    title: "Wholesale footwear catalog",
    h1: "Wholesale footwear catalog.",
    text: "Women's, men's and kids' footwear for trade buyers. Filter by line, build, category and colour, then add styles to your inquiry.",
    description: `${products.length} wholesale footwear styles for women, men and kids: boots, sneakers, loafers and sandals. ${terms[0].toUpperCase()}${terms.slice(1)}.`,
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const v = view(parseCatalogParams(await searchParams));
  return pageMeta({ title: v.title, description: v.description, path: v.path });
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const initial = parseCatalogParams(await searchParams);
  const v = view(initial);
  // the visitor's season, from the proxy (or their own pick): it leads the featured order
  const jar = await cookies();
  const picked = jar.get(SEASON_COOKIE.pick)?.value ?? jar.get(SEASON_COOKIE.season)?.value;
  const season = isSeason(picked) ? picked : null;

  return (
    <>
      {/* the colour field the glass toolbar, filters and cards sit on */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <PageIntro
        tone="clear"
        crumbs={[{ href: "/", label: "Home" }, { label: "Catalog" }]}
        title={v.h1}
        text={v.text}
        aside={<CatalogIntroPanel />}
      >
        <CatalogTerms />
      </PageIntro>
      {/* key: remount when the header nav changes the query */}
      <div className="wrap">
        <CatalogView key={JSON.stringify(initial)} initial={initial} season={season} />
      </div>
    </>
  );
}
