import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import { IntroImage } from "@/components/buyer/IntroImage";
import { SeasonCards } from "@/components/buyer/SeasonCards";
import { BuyerDesk } from "@/components/home/BuyerDesk";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Buyer desk: wholesale ordering tools",
  description: "Size conversions, order dates, container loads, import rules by country, quality checks and ways to verify Chime Long before you order.",
  path: "/buyer-desk",
});

export default function BuyerDeskPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Buyer desk" }]}
        title="Everything to plan a wholesale footwear order."
        text="Sizes, dates, containers and import rules, plus every way to check who you're buying from."
        aside={<IntroImage src="/images/workshop-plate-clean.webp" alt="A Chime Long shoe box with leather swatches, laces and order papers" />}
      />
      <BuyerDesk heading={false} />
      <section aria-labelledby="h-dates" className="mt-sec">
        <SectionHead id="h-dates" title="Next order dates." sub="For boots on the shelf in time, counting down from today." />
        <SeasonCards />
      </section>
    </>
  );
}
