import Link from "next/link";
import { SeasonCards } from "../buyer/SeasonCards";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { LEAD_DAYS } from "@/lib/buyer-desk";

/** The order calendar's main point: the next date to confirm bulk for each season, counting down from today. */
export function WhenToOrder() {
  return (
    <section id="when-to-order" aria-labelledby="h-when" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-when"
        eyebrow="Order calendar"
        title={
          <>
            Order by the date, <em>not the season.</em>
          </>
        }
        sub={`Samples ${LEAD_DAYS.samples} days, production ${LEAD_DAYS.bulk}, delivery ${LEAD_DAYS.delivery}. Worked back from the day the boots should be on your shelves.`}
        right={
          <Link href="/order-calendar">
            <ArrowLink>Plan your own date</ArrowLink>
          </Link>
        }
      />
      <SeasonCards />
    </section>
  );
}
