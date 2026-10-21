import { BestSellers } from "@/components/home/BestSellers";
import { BuyerTypes } from "@/components/home/BuyerTypes";
import { EditorialCampaignBanner } from "@/components/home/EditorialCampaignBanner";
import { GlobalReach } from "@/components/home/GlobalReach";
import { HeroSpotlight } from "@/components/home/HeroSpotlight";
import { HomeReveal } from "@/components/home/HomeReveal";
import { HotProducts } from "@/components/home/HotProducts";
import { HowItShips } from "@/components/home/HowItShips";
import { LineSheetCta } from "@/components/home/LineSheetCta";
import { LookbookFittingBanner } from "@/components/home/LookbookFittingBanner";
import { NewArrivals } from "@/components/home/NewArrivals";
import { OrderJourney } from "@/components/home/OrderJourney";
import { OrderSheet } from "@/components/home/OrderSheet";
import { PrivateLabel } from "@/components/home/PrivateLabel";
import { RetailMerchandisingBanner } from "@/components/home/RetailMerchandisingBanner";
import { SampleRequest } from "@/components/home/SampleRequest";
import { UpClose } from "@/components/home/UpClose";

/**
 * A wholesale buyer's path, in chapters: what sells (hot, new), the brand (the campaign), the whole range and how it's
 * made (by line, up close, on foot), who it's for (buyer programs, in the window), ordering it (samples, the order
 * sheet), getting it (packing, trade lanes, the timeline), then the partnership and the close (private label, line
 * sheet). The three photography sections sit apart so the page alternates product, image and process.
 */
export default function Home() {
  return (
    <>
      {/* the colour field the glass surfaces sit on (home page only) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <HeroSpotlight />
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
      {/* getting it */}
      <HowItShips />
      <GlobalReach />
      <OrderJourney />
      {/* the partnership, and the close */}
      <PrivateLabel />
      <LineSheetCta />
      <HomeReveal />
    </>
  );
}
