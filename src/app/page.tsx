import { ColdBanner } from "@/components/home/ColdBanner";
import { Explorer } from "@/components/home/Explorer";
import { FullLineStrip } from "@/components/home/FullLineStrip";
import { Hero } from "@/components/home/Hero";
import { LineSheetCta } from "@/components/home/LineSheetCta";
import { LineTiles } from "@/components/home/LineTiles";
import { MaterialsGallery } from "@/components/home/MaterialsGallery";
import { NewSeason } from "@/components/home/NewSeason";
import { PartnerProgram } from "@/components/home/PartnerProgram";
import { ProductFinder } from "@/components/home/ProductFinder";
import { ServiceStrip } from "@/components/home/ServiceStrip";
import { ShopByLine } from "@/components/home/ShopByLine";
import { StoreWall } from "@/components/home/StoreWall";
import { Spotlight } from "@/components/home/Spotlight";
import { TechGrid } from "@/components/home/TechGrid";
import { Ticker } from "@/components/home/Ticker";
import { Timeline } from "@/components/home/Timeline";

/** Section order follows the ARTICA homepage brief. */
export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <ProductFinder />
      <Spotlight />
      <Explorer />
      <ColdBanner />
      <ShopByLine />
      <LineTiles />
      <NewSeason />
      <MaterialsGallery />
      <FullLineStrip />
      <StoreWall />
      <TechGrid />
      <Timeline />
      <PartnerProgram />
      <LineSheetCta />
      <ServiceStrip />
    </>
  );
}
