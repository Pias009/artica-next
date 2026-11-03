import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import { IntroImage } from "@/components/buyer/IntroImage";
import { SeasonSignup } from "@/components/buyer/SeasonSignup";
import { VisitRequest } from "@/components/buyer/VisitRequest";
import { Icon } from "@/components/Icon";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";
import { TRADE_SHOWS } from "@/lib/buyer-desk";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Meet us: factory tours and trade shows",
  description: "Tour the Chime Long factory on a live video call, visit us in Guangzhou, or meet the team at a trade show.",
  path: "/meet",
});

export default function MeetPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Meet us" },
        ]}
        title="See the factory before you order."
        text="Walk the line on a live video call, or come and see it in Guangzhou. Either way, you meet the people who make your boots."
        aside={<IntroImage src="/images/hero-trio-showcase.jpg" alt="Three winter boots on display plinths in the showroom" />}
      />

      <section aria-labelledby="h-book">
        <SectionHead id="h-book" title="Book a tour." sub="We reply within a working day to set the time." />
        <VisitRequest />
      </section>

      <section aria-labelledby="h-shows" className="mt-sec">
        <SectionHead id="h-shows" title="Trade shows." />
        {TRADE_SHOWS.length ? (
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {TRADE_SHOWS.map((s) => (
              <li key={s.name} className="rounded-card bg-tile p-6">
                <Icon name="pin" className="size-6! stroke-[1.4] text-brand" />
                <p className="mt-5 text-[16px] font-semibold">{s.name}</p>
                <p className="mt-1 text-[14px] text-ink-2">
                  {s.city} · {s.dates}
                  {s.booth && ` · Booth ${s.booth}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-4">
            <p className="max-w-[56ch] text-[17px] text-ink-2">Next season&rsquo;s show dates are being confirmed. Sign up and they come to you with the line sheet.</p>
            <div className="rounded-shell bg-tile p-1.5">
              <SeasonSignup heading="h3" />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
