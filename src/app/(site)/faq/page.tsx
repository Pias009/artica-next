import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { FAQ } from "@/lib/faq";
import { MOQ_CASES, MOQ_PAIRS, PACK } from "@/lib/products";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Wholesale footwear FAQ: MOQ, samples, payment",
  description: `Answers for wholesale footwear buyers: ${MOQ_PAIRS}-pair MOQ, samples, payment terms, Net 30, letters of credit, DDP and FOB shipping, and defects.`,
  path: "/faq",
});

const CATEGORIES = FAQ;

/** The same questions and answers as the page, for search and AI answer engines. */
const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: CATEGORIES.flatMap((c) => c.faqs).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={FAQ_SCHEMA} />
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Buyer FAQ" }]}
        eyebrow="Buyer FAQ"
        title="Wholesale buyer FAQ."
        text="MOQs, samples, payment, shipping and lead times, answered plainly."
      />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        {/* the answers: one reading column, a category per section */}
        <div className="grid gap-3.5">
          {CATEGORIES.map((cat, i) => (
            <section key={cat.name} aria-labelledby={`h-faq-${i}`} className="rounded-shell bg-tile p-[clamp(24px,3.4vw,44px)]">
              <h2 id={`h-faq-${i}`} className="font-headline text-[clamp(24px,2.4vw,30px)] leading-tight font-semibold tracking-[-0.015em]">
                {cat.name}
              </h2>
              <div className="mt-5 divide-y divide-line border-t border-line">
                {cat.faqs.map((faq) => (
                  <div key={faq.q} className="py-5 last:pb-0">
                    <h3 className="text-[17px] font-semibold tracking-[-0.005em]">{faq.q}</h3>
                    <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* help and the key numbers, kept in view while reading */}
        <aside className="grid gap-3.5 lg:sticky lg:top-28">
          <div data-deco="card" className="rounded-shell bg-studio p-7">
            <p className="eyebrow">Trade desk</p>
            <h2 className="mt-3 font-headline text-[24px] leading-tight font-semibold tracking-[-0.01em]">Have an unlisted question?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">Our wholesale accounts team replies to trade inquiries within 24 hours.</p>
            <div className="mt-5 grid gap-1 border-t border-line pt-3 text-[14px]">
              <a href="mailto:wholesale@articafootwear.com" className="inline-flex min-h-10 items-center gap-2.5 font-semibold hover:text-brand">
                <Icon name="mail" className="size-4 text-muted" />
                wholesale@articafootwear.com
              </a>
              <a href="tel:+18004128820" className="inline-flex min-h-10 items-center gap-2.5 text-ink-2 hover:text-brand">
                <Icon name="phone" className="size-4 text-muted" />
                +1 (800) 412-8820 (EST)
              </a>
            </div>
            <OpenInquiryButton className="btn btn-dark mt-5 w-full">
              Contact the accounts team <Icon name="arrow" />
            </OpenInquiryButton>
          </div>

          <div className="rounded-shell bg-tile p-7">
            <p className="type-label text-muted">Quick reference</p>
            <dl className="mt-3 divide-y divide-line text-[14px]">
              {[
                ["Standard MOQ", `${MOQ_PAIRS} pairs (${MOQ_CASES} cases)`],
                ["Case pack", `${PACK} pairs per case`],
                ["Sample dispatch", "10 business days"],
                ["Bulk production", "45 business days"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
