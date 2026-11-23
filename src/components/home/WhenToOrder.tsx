import Link from "next/link";
import { Txt } from "../ui/Txt";
import { SeasonCards } from "../buyer/SeasonCards";
import { ArrowLink, SectionHead } from "../ui/SectionHead";

/**
 * The order calendar in brief, on the home page: the three seasons and the steps each one takes, without dates (the
 * order calendar page has them, counted from today).
 */
export function WhenToOrder() {
  return (
    <section id="when-to-order" aria-labelledby="h-when" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-when"
        eyebrow="Order calendar"
        title={
          <>
            Plan ahead for <em>every season.</em>
          </>
        }
        sub="Samples first, then the bulk order, production and delivery, in that order, so the boots are on your shelves before the season starts."
        right={
          <Link href="/order-calendar">
            <ArrowLink><Txt k="link" label="Link on the right">Open the order calendar</Txt></ArrowLink>
          </Link>
        }
      />
      <SeasonCards dates={false} />
    </section>
  );
}
