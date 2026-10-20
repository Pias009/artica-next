import { BestSellers } from "@/components/home/BestSellers";
import { BuyerTypes } from "@/components/home/BuyerTypes";
import { ColdTest } from "@/components/home/ColdTest";
import { FactoryWorkshop } from "@/components/home/FactoryWorkshop";
import { HeroSpotlight } from "@/components/home/HeroSpotlight";
import { HowItShips } from "@/components/home/HowItShips";
import { LineSheetCta } from "@/components/home/LineSheetCta";
import { NewArrivals } from "@/components/home/NewArrivals";
import { OrderJourney } from "@/components/home/OrderJourney";
import { OrderSheet } from "@/components/home/OrderSheet";
import { PrivateLabel } from "@/components/home/PrivateLabel";
import { SampleRequest } from "@/components/home/SampleRequest";
import { Showroom } from "@/components/showroom/Showroom";
import { UpClose } from "@/components/home/UpClose";

/**
 * A wholesale buyer's path: see the range, plan quantities, feel the product,
 * see how it ships, sample it, build the order sheet, then the terms and the close.
 */
export default function Home() {
  return (
    <>
      <HeroSpotlight />
      <NewArrivals />
      <FactoryWorkshop />
      <BestSellers />
      <Showroom />
      <BuyerTypes />
      <ColdTest />
      <HowItShips />
      <UpClose />
      <SampleRequest />
      <OrderSheet />
      <OrderJourney />
      <PrivateLabel />
      <LineSheetCta />
    </>
  );
}
