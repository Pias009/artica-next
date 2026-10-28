import type { Metadata } from "next";
import { ContainerPlanner } from "@/components/buyer/ContainerPlanner";
import { IntroImage } from "@/components/buyer/IntroImage";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";
import { CARTON, CONTAINERS } from "@/lib/buyer-desk";
import { CASES_PER_PALLET, PACK } from "@/lib/products";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Shoe container planner: 20ft, 40ft, 40HC",
  description: "Turn wholesale boot cases into pairs, pallets, volume and the container that fits: 20ft, 40ft or 40ft high cube.",
  path: "/container-planner",
});

export default function ContainerPlannerPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Container planner" },
        ]}
        title="How many shoes fit in a container."
        text="Enter your cases, or start from your inquiry list, and see the pallets, volume and the container that fits best."
        aside={<IntroImage src="/images/workshop-boxes.webp" alt="An open Chime Long shoe box lined with tissue, ready for packing" />}
      />

      <ContainerPlanner />

      <section aria-labelledby="h-loads" className="mt-sec">
        <SectionHead id="h-loads" title="The numbers behind it." sub="Indicative; every quote confirms the exact load." />
        <dl className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["One case", `${PACK} pairs · ${CARTON.cbm} m³ · ${CARTON.kg} kg`],
            ["One pallet", `${CASES_PER_PALLET} cases · ${CASES_PER_PALLET * PACK} pairs`],
            ...CONTAINERS.map((c) => [c.name, `${c.cases} cases · ${(c.cases * PACK).toLocaleString("en-US")} pairs`]),
          ].map(([k, v]) => (
            <div key={k} className="rounded-card bg-tile p-5">
              <dt className="text-[15px] font-semibold">{k}</dt>
              <dd className="mt-1 text-[14px] text-ink-2 tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
