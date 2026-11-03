import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import { LegalText } from "@/components/LegalText";
import { PageIntro } from "@/components/PageIntro";
import { COMPANY } from "@/lib/company";
import { MOQ_CASES, MOQ_PAIRS, PACK } from "@/lib/products";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "Terms of trade",
  description: "Terms for using the Chime Long wholesale site and for quotes, samples, orders, inspection, delivery and claims.",
  path: "/terms",
});

// A working draft: payment terms, the claims window and governing law are set by the client and their lawyer before launch.
const SECTIONS = [
  {
    title: "Trade buyers only",
    body: [
      "This site is for businesses buying to resell: retailers, distributors and brands. We do not sell single pairs to consumers.",
    ],
  },
  {
    title: "Information on this site",
    body: [
      "Styles, specifications, lead times, transit times and container loads on this site are a guide. Your quote and proforma invoice confirm the exact terms for your order.",
      "Import rules shown on this site are general guidance, not legal advice. You are responsible for the rules of your own market as the importer, unless we ship on DDP terms.",
    ],
  },
  {
    title: "Quotes and orders",
    body: [
      `The minimum order is ${MOQ_PAIRS} pairs (${MOQ_CASES} cases of ${PACK}) per style. A quote is valid for the time written on it.`,
      "An order is confirmed when both sides sign the proforma invoice or sales contract and the deposit arrives. Those documents set the price, payment terms, delivery terms and dates, and they take priority over this page.",
    ],
  },
  {
    title: "Payment",
    body: [
      "Pay only into the company bank account named on your proforma invoice. We never change bank details by email: if you are told otherwise, call us before paying.",
    ],
  },
  {
    title: "Samples",
    body: ["Samples are charged as quoted. Where a quote says so, the sample cost is credited against the bulk order that follows."],
  },
  {
    title: "Inspection and delivery",
    body: [
      "Every batch is inspected before shipping and you receive a report. You may also send your own inspector before the balance is paid.",
      "Risk passes to you as set by the agreed trade term (for example FOB, EXW or DDP, as defined by Incoterms® 2020).",
    ],
  },
  {
    title: "Claims",
    body: [
      "Report any defect or shortage in writing, with photos, within the period stated on your sales contract. We will replace or credit faulty pairs that fall within the agreed tolerance.",
    ],
  },
  {
    title: "Private label",
    body: [
      "You confirm you have the right to use any logo or brand you send us. We use your artwork only for your orders and do not sell your designs to others.",
    ],
  },
  {
    title: "Contact",
    body: [`${COMPANY.name}. Questions about these terms: ${COMPANY.email.general}.`],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageIntro crumbs={[{ href: "/", label: "Home" }, { label: "Terms of trade" }]} title="Terms of trade." text="How quotes, samples, orders and deliveries work with us." />
      <LegalText updated="October 22, 2026" sections={SECTIONS} />
    </>
  );
}
