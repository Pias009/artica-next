import Link from "next/link";
import { Icon } from "../Icon";
import { ProductCard } from "../product/ProductCard";
import { SeasonFor } from "../season/SeasonFor";
import { ArrowLink } from "../ui/SectionHead";
import { SEASONS, type SeasonId } from "@/lib/season";
import { seasonPicks } from "@/lib/season-products";

const PICKS = 4;

/**
 * The season's edit, straight after the hero: the season's name and promise on its own theme ground, and the four
 * styles that suit it best, one per kind. Built per season, so it arrives already chosen.
 */
export function SeasonShowcase({ season }: { season: SeasonId }) {
  const t = SEASONS[season];
  const picks = seasonPicks(season, PICKS);

  return (
    <section id="season-edit" aria-labelledby="h-season" className="mt-sec scroll-mt-24">
      <div data-deco="band" className="bg-season-field relative isolate grid gap-8 overflow-hidden rounded-shell p-[clamp(20px,4vw,56px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)] lg:items-center lg:gap-12">
        <div>
          <p className="eyebrow">
            <Icon name={t.icon} className="size-4! text-season" />
            {t.edit}
          </p>
          <h2 id="h-season" className="type-section mt-3">
            {t.title[0]}
            <em>{t.title[1]}</em>
          </h2>
          <p className="mt-4 max-w-[40ch] text-[17px] text-ink-2">{t.line}</p>
          <SeasonFor season={season} />
          <Link href={`/catalog?season=${season}`} className="mt-6 inline-block">
            <ArrowLink>See every {t.name.toLowerCase()} style</ArrowLink>
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {picks.map((p) => (
            <li key={p.id}>
              <ProductCard p={p} sizes="(max-width: 768px) 45vw, 240px" className="h-full" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
