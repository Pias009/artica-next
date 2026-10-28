import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN } from "@/lib/products";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Wholesale footwear FAQ: MOQ, samples, payment",
  description: `Answers for wholesale footwear buyers: ${MOQ_PAIRS}-pair MOQ, samples, payment terms, Net 30, letters of credit, DDP and FOB shipping, and defects.`,
  path: "/faq",
});

const CATEGORIES = [
  {
    name: "Ordering and MOQs",
    faqs: [
      {
        q: `What is the minimum order quantity (MOQ)?`,
        a: `Our standard minimum order quantity is ${MOQ_PAIRS} pairs per style (which equals ${MOQ_CASES} master cartons of ${PACK} pairs each). For private-label custom colorways or material developments, the minimum is ${PRIVATE_LABEL_MIN} pairs.`,
      },
      {
        q: `Can I customize the size breakdown per case?`,
        a: `For orders under 1,000 pairs, cases ship in our proven standard size curves (e.g. Men US 7–13: 1-2-3-3-2-1). For orders of 1,000 pairs or more, we can calibrate custom case pack size ratios to match your specific regional or customer demographics.`,
      },
      {
        q: `Can I split an order across two different colors?`,
        a: `Each ${MOQ_PAIRS}-pair production lot is dyed and lasted per colorway. If you wish to split across two colors (e.g., 300 Black and 300 Cognac), the total order volume would be 600 pairs.`,
      },
    ],
  },
  {
    name: "Samples and prototypes",
    faqs: [
      {
        q: `How long do physical samples take to arrive?`,
        a: `In-stock archive samples dispatch via DHL/FedEx Express within 24–48 hours and arrive in most countries within 4–7 business days. Custom prototype lasts or bespoke colorway swatches take approximately 10–14 business days.`,
      },
      {
        q: `Is sample cost deductible against bulk production?`,
        a: `Yes. Sample pairs are billed at standard wholesale sample rates ($75–$95/pair including express courier air freight). Upon confirmation of your production order of 300+ pairs, 100% of your sample fees are credited directly on your commercial invoice.`,
      },
      {
        q: `Can you supply physical leather and material swatch rings?`,
        a: `Yes. We provide complete swatch ring kits including our 2.2mm waterproof cowhides, oiled nubucks, shearling trims, and rubber tread compound pucks free of charge to qualified retail buyers.`,
      },
    ],
  },
  {
    name: "Payment and financial terms",
    faqs: [
      {
        q: `What are your standard wholesale payment terms?`,
        a: `Standard production terms are 30% deposit upon order confirmation and tech pack sign-off, with the remaining 70% balance due upon presentation of the Bill of Lading (BL) and pre-shipment inspection certificate.`,
      },
      {
        q: `Do you offer Net 30 or Net 60 trade terms?`,
        a: `Yes. For established retailers, department store accounts, and multi-season partners, we offer Net 30 or Net 60 credit terms subject to approval through our credit factoring underwriters (CIT / Euler Hermes).`,
      },
      {
        q: `Do you accept Letters of Credit (LC)?`,
        a: `Yes. Irrevocable Letters of Credit (LC at sight) issued by major international prime commercial banks are accepted for orders exceeding $50,000 USD.`,
      },
    ],
  },
  {
    name: "Shipping, customs and DDP",
    faqs: [
      {
        q: `What does DDP (Delivered Duty Paid) mean for our store?`,
        a: `DDP means zero customs headaches for you. Where DDP is available for your country, Chime Long acts as the importer of record, handles import customs clearance at your destination, pays all import duties and harbor fees, and delivers directly to your loading dock. The price on your invoice is your final landed cost.`,
      },
      {
        q: `Can we use our own freight forwarder (FOB terms)?`,
        a: `Absolutely. Major accounts frequently purchase on FOB terms (Port of Ningbo or Shanghai). We deliver the export cargo to your forwarder's CFS warehouse and provide all electronic EDI documentation.`,
      },
      {
        q: `What happens if a pair arrives defective?`,
        a: `Our pre-shipment AQL 1.5 testing yields a historical defect rate under 0.4%. However, if any manufacturing defect is discovered, we provide an immediate 100% credit note or replacement pair on your next dispatch.`,
      },
    ],
  },
];

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
