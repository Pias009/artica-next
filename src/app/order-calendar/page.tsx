import type { Metadata } from "next";
import { IntroImage } from "@/components/buyer/IntroImage";
import { SeasonCards } from "@/components/buyer/SeasonCards";
import { ShelfDatePlanner } from "@/components/buyer/ShelfDatePlanner";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";
import { LEAD_DAYS, REVIEW_DAYS, SHELF_DAYS } from "@/lib/buyer-desk";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Order calendar: when to order winter boots",
  description: `When to request samples and confirm bulk for northern and southern winter. Samples ${LEAD_DAYS.samples} days, production ${LEAD_DAYS.bulk}, delivery ${LEAD_DAYS.delivery}.`,
  path: "/order-calendar",
});

const STEPS = [
  [`${LEAD_DAYS.samples} days`, "Samples", "One pair of each style reaches you by express courier."],
  [`${REVIEW_DAYS} days`, "Your review", "Check fit, leather and finish, then confirm styles and sizes."],
  [`${LEAD_DAYS.bulk} days`, "Production", "Your cases are made, inspected and packed."],
  [`${LEAD_DAYS.delivery} days`, "Delivery", "From the factory to your door."],
  [`${SHELF_DAYS} days`, "Onto the shelf", "Unpacking and ticketing at your end."],
];

export default function OrderCalendarPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Order calendar" },
        ]}
        title="When to order winter boots, worked back from your shelf."
        text="Boots sell in a short window. Here is the date to start for each season, and a planner for your own."
        aside={<IntroImage src="/images/models/05-kids-pop-pink-combat-lookbook.jpg" alt="A child in pink winter boots walking through a snowy park" />}
      />

      <section aria-labelledby="h-seasons">
        <SectionHead id="h-seasons" title="The next date for each season." sub="Counting down from today." />
        <SeasonCards />
      </section>

      <section aria-labelledby="h-plan" className="mt-sec">
        <SectionHead id="h-plan" title="Plan your own date." sub="Pick when the boots should be on your shelves." />
        <ShelfDatePlanner />
      </section>

      <section aria-labelledby="h-math" className="mt-sec">
        <SectionHead id="h-math" title="Where the time goes." />
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(([time, title, text], i) => (
            <li key={title} className="rounded-card bg-tile p-5">
              <span className="text-[13px] font-semibold text-brand tabular-nums">Step {i + 1}</span>
              <p className="mt-3 font-headline text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{time}</p>
              <p className="mt-3 text-[15px] font-semibold">{title}</p>
              <p className="mt-1 text-[14px] text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
