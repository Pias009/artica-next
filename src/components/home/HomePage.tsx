import { SeasonProvider } from "../season/SeasonContext";
import { BestSellers } from "./BestSellers";
import { BuyerTypes } from "./BuyerTypes";
import { EditorialCampaignBanner } from "./EditorialCampaignBanner";
import { HeroSpotlight } from "./HeroSpotlight";
import { HomeReveal } from "./HomeReveal";
import { HotProducts } from "./HotProducts";
import { HowItShips } from "./HowItShips";
import { LineSheetCta } from "./LineSheetCta";
import { OrderJourney } from "./OrderJourney";
import { SeasonShowcase } from "./SeasonShowcase";
import { UpClose } from "./UpClose";
import type { SeasonId } from "@/lib/season";

/**
 * A wholesale buyer's path, one section per question: what's in season (the hero and the season's edit), what buyers
 * reorder (hot products), the whole range, the brand (the campaign), the proof (up close), who it's for, how an order is packed, how long it takes, then
 * the close (the line sheet). Everything else a buyer may want (samples, order sheet, order calendar, trade lanes,
 * the buyer tools, private label) has its own page, linked from the header, the footer and these sections.
 *
 * Built once per season (app/season/[season]); every product section puts that season's styles first.
 */
export function HomePage({ season }: { season: SeasonId }) {
  return (
    <SeasonProvider season={season}>
      {/* the colour field the glass surfaces sit on (home page only); its tints follow the season theme */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <HeroSpotlight />
      <SeasonShowcase season={season} />
      <HotProducts />
      <BestSellers />
      <EditorialCampaignBanner />
      <UpClose />
      <BuyerTypes />
      <HowItShips />
      <OrderJourney />
      <LineSheetCta />
      <HomeReveal />
    </SeasonProvider>
  );
}
