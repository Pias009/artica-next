import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Link from "next/link";
import { IntroImage } from "@/components/buyer/IntroImage";
import { PageIntro } from "@/components/PageIntro";
import { BusinessPlanner } from "@/components/planner/BusinessPlanner";
import { SectionHead } from "@/components/ui/SectionHead";
import { LEAD_DAYS } from "@/lib/buyer-desk";
import { MOQ_PAIRS } from "@/lib/products";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Business planner: plan a season of shoes from China",
  description:
    "Work out the order-by date for your market, what to buy for your budget, the landed cost per pair, your margin and the cash an import from China ties up. For new shops, growing stores and distributors.",
  path: "/business-plan",
});

const HOW = [
  ["Timing comes first", `Shoes are made to order in about ${LEAD_DAYS.bulk} days, then cross the sea. Summer stock ordered in May arrives when summer is ending, so we plan back from the season you can still catch.`],
  ["Start small, start proven", `A first order of two or three proven styles at our ${MOQ_PAIRS}-pair minimum each teaches you more than ten styles at once, and leaves cash for the balance payment.`],
  ["Know your landed cost", "Factory price is only part of it. Freight, duty, insurance and fees decide your real margin, and they're different for every market."],
  ["Plan the cash", "You pay the deposit when you order and the balance before the goods sail. Sales come months later; the planner shows how long the money is out."],
];

export default function BusinessPlanPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Business planner" },
        ]}
        title="Plan your next season from China."
        text="When to order so the stock lands in time, what to buy for your budget, what each pair costs landed, and the cash it needs. Built from our own lead times and order terms."
        aside={<IntroImage src="/images/models/08-banner-duo-campaign-pavilion.jpg" alt="Two models in the season's boots outside a pavilion" />}
      />

      <BusinessPlanner />

      <section aria-labelledby="h-how" className="mt-sec print:hidden">
        <SectionHead id="h-how" title={<>How the trade desk <em>plans a season.</em></>} sub="The same four rules our team uses with every new buyer." />
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map(([title, text], i) => (
            <li key={title} className="rounded-card bg-tile p-5">
              <span className="text-[13px] font-semibold text-muted tabular-nums">0{i + 1}</span>
              <h3 className="mt-1 text-[16px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[15px] text-ink-2">
          Want the dates only? The <Link href="/order-calendar" className="font-semibold text-brand hover:underline">order calendar</Link> has them. Container
          questions: the <Link href="/container-planner" className="font-semibold text-brand hover:underline">container planner</Link>.
        </p>
      </section>
    </>
  );
}
