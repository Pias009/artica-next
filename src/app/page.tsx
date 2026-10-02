import { BestSellers } from "@/components/home/BestSellers";
import { BuyerTypes } from "@/components/home/BuyerTypes";
import { ColdTest } from "@/components/home/ColdTest";
import { Hero } from "@/components/home/Hero";
import { HowItShips } from "@/components/home/HowItShips";
import { LineSheetCta } from "@/components/home/LineSheetCta";
import { OrderJourney } from "@/components/home/OrderJourney";
import { OrderSheet } from "@/components/home/OrderSheet";
import { PrivateLabel } from "@/components/home/PrivateLabel";
import { SampleRequest } from "@/components/home/SampleRequest";
import { ShopByLine } from "@/components/home/ShopByLine";
import { UpClose } from "@/components/home/UpClose";

/**
 * A wholesale buyer's path: see the range, plan quantities, feel the product,
 * see how it ships, sample it, build the order sheet, then the terms and the close.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <ShopByLine />
      <BestSellers />
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
