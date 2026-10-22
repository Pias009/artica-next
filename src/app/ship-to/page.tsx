import type { Metadata } from "next";
import Link from "next/link";
import { IntroImage } from "@/components/buyer/IntroImage";
import { ShipToPicker } from "@/components/buyer/ShipToPicker";
import { PageIntro } from "@/components/PageIntro";
import { ArrowLink, SectionHead } from "@/components/ui/SectionHead";
import { MARKETS } from "@/lib/buyer-desk";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Wholesale footwear shipping by country",
  description: "Port, transit time, trade terms (DDP, FOB, EXW) and import rules for wholesale footwear shipped to North America, Europe, the UK, the Middle East and Australia.",
  path: "/ship-to",
});

export default function ShipToPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Ships to your country" },
        ]}
        title="What it takes to land wholesale footwear in your country."
        text="Pick where the order ships: the port, transit time, trade terms and what your import usually needs."
        aside={<IntroImage src="/images/models/06-banner-men-street-onfeet.jpg" alt="Black leather winter boots on a snowy city street" />}
      />

      <ShipToPicker />

      <section aria-labelledby="h-lanes" className="mt-sec">
        <SectionHead
          id="h-lanes"
          title="Every trade lane."
          right={
            <Link href="/shipping">
              <ArrowLink>Shipping and trade terms</ArrowLink>
            </Link>
          }
        />
        <div tabIndex={0} role="region" aria-label="Trade lanes table" className="overflow-x-auto rounded-card bg-tile">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <caption className="sr-only">Markets, arrival ports, ocean transit and trade terms</caption>
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                {["Market", "Arrives at", "Ocean transit", "Terms"].map((h) => (
                  <th key={h} scope="col" className="px-5 py-3.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MARKETS.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-semibold">
                    {m.name}
                    <span className="block text-[13px] font-normal text-muted">{m.countries.join(", ")}</span>
                  </th>
                  <td className="px-5 py-3 text-ink-2">{m.port}</td>
                  <td className="px-5 py-3 text-ink-2 tabular-nums">{m.transit}</td>
                  <td className="px-5 py-3 font-semibold">{m.terms.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
