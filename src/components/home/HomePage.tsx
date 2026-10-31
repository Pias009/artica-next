import { SeasonProvider } from "../season/SeasonContext";
import { BestSellers } from "./BestSellers";
import { BuyerDesk } from "./BuyerDesk";
import { BuyerTypes } from "./BuyerTypes";
import { EditorialCampaignBanner } from "./EditorialCampaignBanner";
import { GlobalReach } from "./GlobalReach";
import { HeroSpotlight } from "./HeroSpotlight";
import { HomeReveal } from "./HomeReveal";
import { HotProducts } from "./HotProducts";
import { HowItShips } from "./HowItShips";
import { LineSheetCta } from "./LineSheetCta";
import { LookbookFittingBanner } from "./LookbookFittingBanner";
import { NewArrivals } from "./NewArrivals";
import { OrderJourney } from "./OrderJourney";
import { OrderSheet } from "./OrderSheet";
import { PrivateLabel } from "./PrivateLabel";
import { RetailMerchandisingBanner } from "./RetailMerchandisingBanner";
import { SampleRequest } from "./SampleRequest";
import { SeasonShowcase } from "./SeasonShowcase";
import { UpClose } from "./UpClose";
import { WhenToOrder } from "./WhenToOrder";
import type { SeasonId } from "@/lib/season";

/**
 * A wholesale buyer's path, in chapters: what's in season for them (the hero and the season's edit), what sells (hot,
 * new), the brand (the campaign), the whole range and how it's made (by line, up close, on foot), who it's for (buyer
 * programs, in the window), ordering it (samples, the order sheet, when to order), getting it (packing, trade lanes,
 * the timeline), checking us (the buyer desk), then the partnership and the close (private label, line sheet). The
 * three photography sections sit apart so the page alternates product, image and process.
 *
 * Built once per season (app/season/[season]); every product section puts that season's styles first.
 */
export function HomePage({ season }: { season: SeasonId }) {
  return (
    <SeasonProvider season={season}>
      {/* the colour field the glass surfaces sit on (home page only); its tints follow the season theme */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <HeroSpotlight />
      {/* what's in season */}
      <SeasonShowcase season={season} />
      {/* what sells */}
      <HotProducts />
      <NewArrivals />
      <EditorialCampaignBanner />
      {/* the range, and how it's made */}
      <BestSellers />
      <UpClose />
      <LookbookFittingBanner />
      {/* who it's for */}
      <BuyerTypes />
      <RetailMerchandisingBanner />
      {/* ordering it */}
      <SampleRequest />
      <OrderSheet />
      <WhenToOrder />
      {/* getting it */}
      <HowItShips />
      <GlobalReach />
      <OrderJourney />
      {/* planning it, and checking us */}
      <BuyerDesk />
      {/* the partnership, and the close */}
      <PrivateLabel />
      <LineSheetCta />
      <HomeReveal />
    </SeasonProvider>
  );
}
