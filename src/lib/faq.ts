import { MOQ_CASES, MOQ_PAIRS, PACK, PRIVATE_LABEL_MIN } from "./products";

/** The buyer FAQ, by topic: the /faq page renders it and the assistant (src/lib/assistant) answers from it. */
export const FAQ: { name: string; faqs: { q: string; a: string }[] }[] = [
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
