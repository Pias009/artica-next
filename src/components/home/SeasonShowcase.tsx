import Link from "next/link";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { SeasonIndex } from "./SeasonIndex";
import { SEASONS, type SeasonId } from "@/lib/season";
import { seasonPicks } from "@/lib/season-products";

const PICKS = 6;

/**
 * The season's edit, straight after the hero: the season's promise as the section heading, and on the season's own
 * theme ground the styles that suit it best (one per kind first), as an index beside a stage that moves through them
 * on its own. Built per season, so it arrives chosen.
 */
export function SeasonShowcase({ season }: { season: SeasonId }) {
  const t = SEASONS[season];
  const picks = seasonPicks(season, PICKS);

  return (
    <section id="season-edit" aria-labelledby="h-season" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-season"
        title={
          <>
            {t.title[0]}
            <em>{t.title[1]}</em>
          </>
        }
        right={
          <Link href={`/catalog?season=${season}`}>
            <ArrowLink>See every {t.name.toLowerCase()} style</ArrowLink>
          </Link>
        }
      />
      <div data-deco="band" className="bg-season-field relative isolate overflow-hidden rounded-shell p-[clamp(20px,4vw,56px)]">
        <SeasonIndex ids={picks.map((p) => p.id)} label={`${t.name} styles`} />
      </div>
    </section>
  );
}
