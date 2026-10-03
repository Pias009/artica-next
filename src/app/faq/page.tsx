import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN } from "@/lib/products";

export const metadata: Metadata = {
  title: "Wholesale Buyer FAQ & Trade Terms",
  description: "Frequently asked questions for wholesale footwear retail buyers, department stores, and private label brands. MOQs, terms, samples, and shipping.",
};

const CATEGORIES = [
  {
    name: "Ordering & MOQs",
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
    name: "Samples & Prototypes",
    faqs: [
      {
        q: `How long do physical samples take to arrive?`,
        a: `In-stock archive samples dispatch via DHL/FedEx Express within 24–48 hours and arrive in North America within 4–6 business days. Custom prototype lasts or bespoke colorway swatches take approximately 10–14 business days.`,
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
    name: "Payments & Financial Terms",
    faqs: [
      {
        q: `What are your standard wholesale payment terms?`,
        a: `Standard production terms are 30% deposit upon order confirmation and tech pack sign-off, with the remaining 70% balance due upon presentation of the Bill of Lading (BL) and pre-shipment inspection certificate.`,
      },
      {
        q: `Do you offer Net 30 or Net 60 trade terms?`,
        a: `Yes. For established North American retailers, department store accounts, and multi-season partners, we offer Net 30 or Net 60 credit terms subject to approval through our credit factoring underwriters (CIT / Euler Hermes).`,
      },
      {
        q: `Do you accept Letters of Credit (LC)?`,
        a: `Yes. Irrevocable Letters of Credit (LC at sight) issued by major North American or European prime commercial banks are accepted for orders exceeding $50,000 USD.`,
      },
    ],
  },
  {
    name: "Shipping, Customs & DDP",
    faqs: [
      {
        q: `What does DDP (Delivered Duty Paid) mean for our store?`,
        a: `DDP means zero customs headaches for you. Chime Long acts as the importer of record, handles all US Customs (CBP) or Canada (CBSA) clearances, pays all import duties and harbor fees, and delivers directly to your loading dock. The price on your invoice is your final landed cost.`,
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

export default function FaqPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Buyer FAQ" }]}
        eyebrow="Commercial Knowledge Base & FAQs"
        title="Wholesale trade terms & FAQ."
        text="Clear answers regarding MOQ volumes, sample turnarounds, DDP landed pricing, payment terms, and custom production timelines."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main FAQs */}
        <div className="space-y-8">
          {CATEGORIES.map((cat) => (
            <section key={cat.name} className="rounded-shell border border-line/60 bg-tile p-6 sm:p-8 shadow-soft">
              <span className="mono-label text-accent font-bold">CATEGORY</span>
              <h2 className="text-xl font-extrabold uppercase text-ink mt-1 mb-6 border-b border-line/50 pb-3">
                {cat.name}
              </h2>
              <div className="divide-y divide-line/50">
                {cat.faqs.map((faq) => (
                  <div key={faq.q} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="text-base font-bold text-ink mb-2">
                      {faq.q}
                    </h3>
                    <p className="text-xs leading-relaxed text-ink-2">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Sidebar Assistance */}
        <aside className="space-y-4">
          <div className="rounded-shell border border-line/60 bg-studio p-6 shadow-soft">
            <span className="mono-label text-accent font-bold">TRADE DESK</span>
            <h3 className="text-lg font-extrabold uppercase text-ink mt-1">Have an unlisted question?</h3>
            <p className="mt-2 text-xs text-ink-2 leading-relaxed">
              Our North American wholesale accounts team responds to commercial inquiries within 24 hours.
            </p>
            <div className="mt-4 pt-4 border-t border-line/60 space-y-2 text-xs text-ink">
              <div className="flex items-center gap-2">
                <Icon name="mail" className="size-4 text-accent" />
                <span className="font-semibold">wholesale@articafootwear.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="phone" className="size-4 text-accent" />
                <span className="font-semibold">+1 (800) 412-8820 (EST)</span>
              </div>
            </div>
            <OpenInquiryButton className="btn btn-dark w-full mt-5">
              Contact Accounts Team <Icon name="arrow" />
            </OpenInquiryButton>
          </div>

          <div className="glass-card rounded-shell p-6 shadow-xs border border-line/60">
            <span className="mono-label text-[10px] text-muted">QUICK REFERENCE</span>
            <ul className="mt-3 space-y-2.5 text-xs text-ink-2">
              <li className="flex justify-between border-b border-line/40 pb-1.5">
                <span>Standard MOQ</span>
                <b className="text-ink">{MOQ_PAIRS} pairs (25 cases)</b>
              </li>
              <li className="flex justify-between border-b border-line/40 pb-1.5">
                <span>Case Configuration</span>
                <b className="text-ink">{PACK} pairs per case</b>
              </li>
              <li className="flex justify-between border-b border-line/40 pb-1.5">
                <span>Sample Dispatch</span>
                <b className="text-ink">10 business days</b>
              </li>
              <li className="flex justify-between">
                <span>Bulk Production</span>
                <b className="text-ink">45 business days</b>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
