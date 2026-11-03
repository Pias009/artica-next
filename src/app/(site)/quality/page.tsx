import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import { IntroImage } from "@/components/buyer/IntroImage";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { PageIntro } from "@/components/PageIntro";
import { SectionHead } from "@/components/ui/SectionHead";
import { DOCUMENTS, QUALITY_STEPS } from "@/lib/buyer-desk";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Footwear quality control and test reports",
  description: "How every pair of Chime Long wholesale footwear is checked, from materials to final inspection, and the test reports buyers can request.",
  path: "/quality",
});

export default function QualityPage() {
  return (
    <>
      <PageIntro
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/buyer-desk", label: "Buyer desk" },
          { label: "Quality and documents" },
        ]}
        title="Footwear quality control at every step, before it ships."
        text="From the leather coming in to the last carton going out, and the papers your import needs."
        aside={
          <IntroImage
            src="/images/p04-men-leather-winter-lace-up-zip-view.webp"
            alt="Men's black leather winter boot, zip side: stitching, padded collar and lugged sole"
            fit="contain"
          />
        }
      />

      <section aria-labelledby="h-steps">
        <SectionHead id="h-steps" title="How each order is checked." />
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {QUALITY_STEPS.map((s, i) => (
            <li key={s.title} data-deco="card" className="rounded-card bg-tile p-5">
              <span className="flex items-center justify-between">
                <Icon name={s.icon} className="size-6! stroke-[1.4] text-brand" />
                <span className="text-[13px] font-semibold text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <p className="mt-6 text-[16px] font-semibold">{s.title}</p>
              <p className="mt-1.5 text-[14px] text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="h-docs" className="mt-sec">
        <SectionHead
          id="h-docs"
          title={
            <>
              Ask for the papers <em>your import needs.</em>
            </>
          }
          sub="Tell us the styles and the market, and the trade desk sends what applies to your order."
        />
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENTS.map((d) => (
            <li key={d.title} className="flex items-center justify-between gap-4 rounded-card bg-tile p-5">
              <span>
                <b className="block text-[15px] font-semibold">{d.title}</b>
                <span className="block text-[13px] text-muted">{d.for}</span>
              </span>
              <OpenInquiryButton note={`Document request: ${d.title} (${d.for}).`} className="btn btn-line h-11! flex-none px-5! text-[14px]!"
                aria-label={`Ask for the ${d.title}`}
              >
                Ask
              </OpenInquiryButton>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
