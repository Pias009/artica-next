import { BestSellers } from "@/components/home/BestSellers";
import { BuyerTypes } from "@/components/home/BuyerTypes";
import { GlobalReach } from "@/components/home/GlobalReach";
import { HeroSpotlight } from "@/components/home/HeroSpotlight";
import { HomeReveal } from "@/components/home/HomeReveal";
import { HotProducts } from "@/components/home/HotProducts";
import { HowItShips } from "@/components/home/HowItShips";
import { LineSheetCta } from "@/components/home/LineSheetCta";
import { NewArrivals } from "@/components/home/NewArrivals";
import { OrderJourney } from "@/components/home/OrderJourney";
import { OrderSheet } from "@/components/home/OrderSheet";
import { PrivateLabel } from "@/components/home/PrivateLabel";
import { SampleRequest } from "@/components/home/SampleRequest";
import { UpClose } from "@/components/home/UpClose";

/**
 * A wholesale buyer's path: see the range, plan quantities, feel the product,
 * see how it ships, sample it, build the order sheet, then the terms and the close.
 */
export default function Home() {
  return (
    <>
      {/* the colour field the glass surfaces sit on (home page only) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <HeroSpotlight />
      <HotProducts />
      <NewArrivals />
      <BestSellers />
      <GlobalReach />
      <BuyerTypes />
      <HowItShips />
      <UpClose />
      <SampleRequest />
      <OrderSheet />
      <OrderJourney />
      <PrivateLabel />
      <LineSheetCta />
      <HomeReveal />
    </>
  );
}
