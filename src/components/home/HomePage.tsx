import { SeasonProvider } from "../season/SeasonContext";
import { BestSellers } from "./BestSellers";
import { BuyerDesk } from "./BuyerDesk";
import { BusinessPlanTeaser } from "./BusinessPlanTeaser";
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
import { SeasonPick } from "./SeasonPick";
import { SeasonShowcase } from "./SeasonShowcase";
import { UpClose } from "./UpClose";
import { WhenToOrder } from "./WhenToOrder";
import type { ReactNode } from "react";
import { SectionScope } from "../ui/SectionScope";
import type { SectionEdit } from "@/lib/content/model";
import { homeOrder, type HomeSectionId } from "@/lib/home-sections";
import type { SeasonId } from "@/lib/season";

/**
 * A wholesale buyer's path, in chapters: what's in season for them (the hero, the season they're stocking for, and the season's edit), what sells (hot,
 * new), the brand (the campaign), the whole range and how it's made (by line, up close, on foot), who it's for (buyer
 * programs, in the window), ordering it (samples, the order sheet, when to order), getting it (packing, trade lanes,
 * the timeline), checking us (the buyer desk), then the partnership and the close (private label, line sheet). The
 * three photography sections sit apart so the page alternates product, image and process.
 *
 * Built once per season (app/season/[season]); every product section puts that season's styles first.
 */
export function HomePage({ season, sections, all = false }: { season: SeasonId; sections?: SectionEdit[]; all?: boolean }) {
  const parts: Record<HomeSectionId, ReactNode> = {
    hero: <HeroSpotlight />,
    "season-pick": <SeasonPick />,
    "season-edit": <SeasonShowcase season={season} />,
    hot: <HotProducts />,
    new: <NewArrivals />,
    campaign: <EditorialCampaignBanner />,
    styles: <BestSellers />,
    "up-close": <UpClose />,
    lookbook: <LookbookFittingBanner />,
    programs: <BuyerTypes />,
    worn: <RetailMerchandisingBanner />,
    samples: <SampleRequest />,
    "order-sheet": <OrderSheet />,
    "when-to-order": <WhenToOrder />,
    "business-plan": <BusinessPlanTeaser />,
    packing: <HowItShips />,
    worldwide: <GlobalReach />,
    journey: <OrderJourney />,
    "buyer-desk": <BuyerDesk />,
    partner: <PrivateLabel />,
    "line-sheet": <LineSheetCta />,
    reveal: <HomeReveal />,
  };
  return (
    <SeasonProvider season={season}>
      {/* the colour field the glass surfaces sit on (home page only); its tints follow the season theme */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      {/* in the order set in the admin panel (Pages → Home), hidden sections left out; built-in order otherwise */}
      {/* `all`: the admin panel's copy (season/[season]/all), with hidden sections too so their content stays editable */}
      {homeOrder(sections)
        .filter((s) => s.visible || all)
        .map((s) => (
          <SectionScope key={s.id} id={s.id}>
            {/* where the admin panel's "See it on the page" lands (/#s-hot), highlighting the section after it */}
            <span id={`s-${s.id}`} data-section-anchor aria-hidden="true" className="block scroll-mt-28" />
            {parts[s.id]}
          </SectionScope>
        ))}
    </SeasonProvider>
  );
}
