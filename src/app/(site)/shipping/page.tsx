import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { DeliveryRoute } from "@/components/shipping/DeliveryRoute";
import { ClosingBand } from "@/components/ui/ClosingBand";
import { ArrowLink, SectionHead } from "@/components/ui/SectionHead";
import { MOQ_CASES, MOQ_PAIRS, PACK } from "@/lib/products";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Shipping and trade terms: DDP, FOB, EXW",
  description: "Wholesale shipping terms for buyers worldwide. DDP, FOB, and EXW logistics, transit times, pallet dimensions, and customs clearance.",
  path: "/shipping",
});

const INCOTERMS = [
  {
    code: "DDP",
    title: "Delivered duty paid",
    subtitle: "Recommended for most markets",
    desc: "100% turnkey logistics. Chime Long covers ocean freight, customs tariffs, terminal fees, and inland trucking. The price quoted is the exact landed cost to your loading dock.",
    bullets: [
      "No customs broker or import bond required by buyer",
      "Destination import duties and taxes included",
      "Door delivery to your retail DC or commercial warehouse",
      "Liftgate and delivery appointments scheduled in advance",
    ],
    recommended: true,
  },
  {
    code: "FOB",
    title: "Free on board",
    subtitle: "Port of Ningbo or Shanghai",
    desc: "Preferred by national department stores and retailers with proprietary global freight forwarder agreements and master ocean service contracts.",
    bullets: [
      "Goods cleared for export and loaded onto buyer's designated vessel",
      "Full export commercial invoice, packing list & COO provided",
      "Buyer assumes responsibility once container is onboard",
      "Lower upfront unit cost without freight markup",
    ],
    recommended: false,
  },
  {
    code: "EXW",
    title: "Ex works",
    subtitle: "Collected at the factory gate",
    desc: "Available for high-volume distributors consolidating multiple footwear and apparel lines in dedicated 40ft High Cube containers.",
    bullets: [
      "Direct factory collection by buyer's logistics partner",
      "Export documentation prepared to buyer's forwarder format",
      "Maximum cost efficiency for enterprise consolidation",
      "Minimum order threshold: 2,400 pairs (200 cases)",
    ],
    recommended: false,
  },
];

/** Indicative ocean transit from Ningbo / Shanghai on the main trade lanes (client placeholders; confirmed per quote). */
const TRANSIT = [
  { port: "Los Angeles / Long Beach", region: "North America, West", days: "14–18 days", inland: "+1–3 days to your DC" },
  { port: "New York / Savannah", region: "North America, East", days: "26–34 days", inland: "+1–3 days to your DC" },
  { port: "Rotterdam / Hamburg", region: "Northern Europe", days: "30–36 days", inland: "+2–4 days by road or rail" },
  { port: "Felixstowe / Southampton", region: "United Kingdom", days: "32–38 days", inland: "+1–2 days to your DC" },
  { port: "Jebel Ali, Dubai", region: "Middle East", days: "18–22 days", inland: "+1–3 days in the GCC" },
  { port: "Sydney / Melbourne", region: "Australia & NZ", days: "14–20 days", inland: "+1–3 days to your DC" },
  { port: "Santos / Valparaíso", region: "South America", days: "35–42 days", inland: "+2–5 days to your DC" },
];

const PACKAGING_SPECS = [
  {
    title: "Master carton",
    value: `${PACK} pairs per case`,
    desc: "Double-wall corrugated 275# test kraft carton, built not to crush in ocean transit.",
  },
  {
    title: "Pallet",
    value: "40″ × 48″ GMA",
    desc: `Heat-treated ISPM-15 wooden pallets holding ${MOQ_CASES} master cartons (the ${MOQ_PAIRS}-pair MOQ).`,
  },
  {
    title: "Carton weight and cube",
    value: "16.8 kg · 0.082 CBM",
    desc: "Fixed dimensions for exact container planning: about 7,200 pairs per 40ft HC.",
  },
  {
    title: "Barcodes and tickets",
    value: "GS1 / UPC ready",
    desc: "Every shoe box and master carton carries pre-printed, high-contrast scannable barcodes.",
  },
];

/** What is tested on random cartons before the container doors are sealed. */
const INSPECTIONS = [
  { title: "Immersion leak test", text: "4 hours of dynamic flexing in a water bath up to the collar." },
  { title: "Sole pull-off force", text: "Vulcanised bond tested to more than 4.0 N/mm." },
  { title: "Digital audit report", text: "Photos and measurements as a PDF, emailed to your buyer before release." },
];

export default function ShippingPage() {
  return (
    <>
      <DeliveryRoute />

      {/* Incoterms: the first section after the intro, so the intro's own margin is the gap */}
      <section aria-labelledby="h-incoterms">
        <SectionHead
          id="h-incoterms"
          eyebrow="Freight contracts"
          title={<>Three ways <em>to ship.</em></>}
          right={<p className="type-label text-muted">Standard MOQ {MOQ_PAIRS} pairs ({MOQ_CASES} cases)</p>}
        />
        <ul className="grid gap-3.5 lg:grid-cols-3">
          {INCOTERMS.map((t) => (
            <li
              key={t.code}
              className={`relative flex flex-col rounded-shell p-7 ${t.recommended ? "bg-white shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-tile"}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-headline text-[32px] leading-none font-semibold tracking-[-0.02em]">{t.code}</span>
                {t.recommended && <span className="type-label rounded-full bg-ink px-3 py-1.5 text-white">Most popular</span>}
              </span>
              <h3 className="mt-5 text-[16px] font-semibold">{t.title}</h3>
              <p className="mt-0.5 text-[14px] text-muted">{t.subtitle}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{t.desc}</p>
              <ul className="mt-5 grid flex-1 content-start gap-2.5 border-t border-line pt-5 text-[14px] text-ink-2">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 size-4 flex-none text-brand" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <OpenInquiryButton note={`Shipping quote: ${t.code}.`} className={`btn mt-7 w-full ${t.recommended ? "btn-dark" : "btn-line"}`}>
                Request a {t.code} quote <Icon name="arrow" />
              </OpenInquiryButton>
            </li>
          ))}
        </ul>
      </section>

      {/* Ocean transit */}
      <section aria-labelledby="h-transit" className="mt-sec">
        <SectionHead
          id="h-transit"
          eyebrow="Port logistics"
          title={<>Ocean transit, <em>port to port.</em></>}
          sub="Indicative sailing times from Ningbo and Shanghai on scheduled direct container ships. Each quote confirms the dates."
        />
        <div className="overflow-x-auto rounded-card bg-tile">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line">
                {["Destination port", "Region", "Ocean transit", "Inland delivery"].map((h) => (
                  <th key={h} scope="col" className="type-label px-5 py-4 text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {TRANSIT.map((tr) => (
                <tr key={tr.port}>
                  <th scope="row" className="px-5 py-4 font-semibold">{tr.port}</th>
                  <td className="px-5 py-4 text-ink-2">{tr.region}</td>
                  <td className="px-5 py-4 font-semibold tabular-nums">{tr.days}</td>
                  <td className="px-5 py-4 text-[14px] text-ink-2">{tr.inland}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Packaging and pallet specs */}
      <section aria-labelledby="h-packaging" className="mt-sec">
        <SectionHead id="h-packaging" eyebrow="Standard packaging" title={<>Carton and pallet <em>specifications.</em></>} />
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGING_SPECS.map((s) => (
            <li key={s.title} className="rounded-card bg-tile p-6">
              <p className="type-label text-muted">{s.title}</p>
              <p className="mt-4 font-headline text-[24px] leading-tight font-semibold tracking-[-0.015em]">{s.value}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{s.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Pre-shipment inspection */}
      <section aria-labelledby="h-aql" className="mt-sec">
        <SectionHead
          id="h-aql"
          eyebrow="AQL 1.5 audit"
          title={<>Every batch checked <em>before the container is sealed.</em></>}
          sub="Our quality engineers test random cartons from each batch, so nothing arrives as a surprise."
          right={
            <Link href="/quality">
              <ArrowLink>How each order is checked</ArrowLink>
            </Link>
          }
        />
        <ul className="grid gap-3.5 md:grid-cols-3">
          {INSPECTIONS.map((c) => (
            <li key={c.title} className="rounded-card bg-tile p-6">
              <Icon name="shield" className="size-6! stroke-[1.4] text-brand" />
              <p className="mt-6 text-[16px] font-semibold">{c.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{c.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <ClosingBand
        id="h-close"
        eyebrow="Ready to ship?"
        title="Request a shipping quote to your door."
        text="Send your warehouse ZIP or postal code and we'll quote the exact DDP delivered rate."
        action={
          <OpenInquiryButton note="Shipping quote request." className="btn flex-none bg-white text-ink hover:bg-white/85">
            Request a shipping rate <Icon name="arrow" />
          </OpenInquiryButton>
        }
      />
    </>
  );
}
