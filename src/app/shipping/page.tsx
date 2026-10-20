import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { MOQ_CASES, MOQ_PAIRS } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shipping, Freight & Trade Terms",
  description: "Wholesale shipping terms for buyers worldwide. DDP, FOB, and EXW logistics, transit times, pallet dimensions, and customs clearance.",
};

const INCOTERMS = [
  {
    code: "DDP",
    title: "Delivered Duty Paid",
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
    title: "Free On Board",
    subtitle: "Port of Ningbo / Shanghai",
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
    title: "Ex Works",
    subtitle: "Factory Atelier Gate",
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
    title: "Master Shipping Carton",
    value: "12 Pairs / Case",
    desc: "Double-wall corrugated 275# test kraft carton designed to resist crushing during ocean transit.",
  },
  {
    title: "Pallet Dimensions",
    value: "40″ × 48″ GMA Standard",
    desc: "Heat-treated ISPM-15 certified wooden pallets holding 25 master cartons (300 pairs MOQ).",
  },
  {
    title: "Carton Weight & Cube",
    value: "16.8 kg · 0.082 CBM",
    desc: "Standardized dimensions allow precise container space calculation (approx. 7,200 pairs per 40ft HC).",
  },
  {
    title: "Barcoding & Ticketing",
    value: "GS1 / UPC Compliant",
    desc: "Each individual shoe box and master carton features high-contrast pre-printed scannable barcodes.",
  },
];

export default function ShippingPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Shipping terms" }]}
        eyebrow="Global Freight Operations"
        title="Predictable landed delivery. Zero tariff risk."
        text="Whether you require turnkey DDP delivery direct to your loading dock or FOB consolidation at vessel, our logistics team coordinates smooth ocean and domestic transit."
      />

      {/* Incoterms Grid */}
      <section className="mt-sec">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mono-label text-accent font-bold">FREIGHT CONTRACTS</span>
            <h2 className="type-section mt-1">Available Trade Incoterms</h2>
          </div>
          <span className="mono-label text-muted text-xs">STANDARD MOQ {MOQ_PAIRS} PR ({MOQ_CASES} CASES)</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {INCOTERMS.map((t) => (
            <div
              key={t.code}
              className={`relative flex flex-col justify-between rounded-shell border p-6 card-lift shadow-soft ${
                t.recommended
                  ? "border-accent bg-surface ring-2 ring-accent/20"
                  : "border-line/60 bg-tile"
              }`}
            >
              {t.recommended && (
                <span className="mono-label absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-[9.5px] font-bold text-on-accent shadow-sm">
                  MOST POPULAR WORLDWIDE
                </span>
              )}
              <div>
                <span className="mono-label text-2xl font-black text-ink">{t.code}</span>
                <h3 className="mt-1 text-base font-extrabold uppercase text-ink">{t.title}</h3>
                <p className="mono-label text-[11px] text-accent mt-0.5">{t.subtitle}</p>
                <p className="mt-3 text-xs leading-relaxed text-ink-2">{t.desc}</p>
                <ul className="mt-4 space-y-2 border-t border-line/60 pt-3 text-xs text-ink-2">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Icon name="check" className="size-3.5 text-accent flex-none mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60">
                <OpenInquiryButton className={`btn w-full ${t.recommended ? "btn-dark" : "btn-line"}`}>
                  Request {t.code} Quote <Icon name="arrow" />
                </OpenInquiryButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ocean Transit Matrix */}
      <section className="mt-sec rounded-shell border border-line/60 bg-tile p-6 sm:p-8 shadow-soft">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mono-label text-accent font-bold">PORT LOGISTICS</span>
            <h2 className="type-section mt-1">Average Ocean Transit Timelines</h2>
          </div>
          <span className="mono-label text-xs text-muted">SCHEDULED DIRECT CONTAINER SHIPS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line/60 text-muted mono-label text-[10px]">
                <th className="pb-3 font-bold">Destination Port</th>
                <th className="pb-3 font-bold">Region</th>
                <th className="pb-3 font-bold">Water Transit</th>
                <th className="pb-3 font-bold">Inland Drayage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {TRANSIT.map((tr) => (
                <tr key={tr.port} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3.5 font-bold text-ink">{tr.port}</td>
                  <td className="py-3.5 text-ink-2">{tr.region}</td>
                  <td className="py-3.5 font-bold tabular-nums text-accent">{tr.days}</td>
                  <td className="py-3.5 text-muted">{tr.inland}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Packaging & Pallet Specs */}
      <section className="mt-sec">
        <div className="mb-6">
          <span className="mono-label text-accent font-bold">STANDARDIZED PACKAGING</span>
          <h2 className="type-section mt-1">Carton & Pallet Master Specifications</h2>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGING_SPECS.map((s) => (
            <div key={s.title} className="rounded-card border border-line/60 bg-surface p-5 shadow-xs card-lift">
              <span className="mono-label text-[9.5px] text-muted">{s.title}</span>
              <p className="mt-1 text-xl font-extrabold uppercase text-ink">{s.value}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quality & Pre-Shipment Inspection Protocol */}
      <section className="mt-sec rounded-shell border border-line/60 bg-studio p-6 sm:p-8 shadow-soft">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <span className="mono-label text-accent font-bold">AQL 1.5 AUDIT PROTOCOL</span>
            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-ink mt-1">
              Every production batch inspected before container sealing
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-ink-2">
              We eliminate receipt surprises. Before your container doors are sealed, our factory quality control engineers perform rigorous tests on random carton samples:
            </p>
            <ul className="mt-4 space-y-2 text-xs text-ink-2">
              <li className="flex items-center gap-2">
                <Icon name="shield" className="size-4 text-accent flex-none" />
                <span><b>Immersion Leak Testing:</b> 4-hour dynamic flexing in water bath up to collar.</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="shield" className="size-4 text-accent flex-none" />
                <span><b>Sole Pull-off Force:</b> &gt;4.0 N/mm vulcanization bonding test.</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="shield" className="size-4 text-accent flex-none" />
                <span><b>Digital Audit Report:</b> High-resolution photo and measurement PDF emailed to your buyer prior to release.</span>
              </li>
            </ul>
          </div>

          <div className="glass-card flex flex-col justify-between rounded-card p-6 shadow-sm border border-line/60">
            <span className="mono-label text-[10px] text-accent">EXPORT PACK CONFIGURATION</span>
            <p className="text-2xl font-black text-ink mt-2">12 Pairs / Case</p>
            <p className="text-xs text-muted mt-1">Pre-sorted ratio curves prevent uneven leftover inventory for retailers.</p>
            <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between">
              <span className="text-xs font-bold text-ink">Minimum order per style:</span>
              <span className="text-sm font-extrabold text-accent tabular-nums">25 cases ({MOQ_PAIRS} pr)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Strip */}
      <section className="mt-sec mb-4 flex flex-col items-center justify-between gap-4 rounded-shell border border-line/60 bg-accent p-8 text-center text-on-accent md:flex-row md:text-left">
        <div>
          <span className="mono-label text-kraft text-[10px]">READY TO ARRANGE SHIPMENT?</span>
          <h2 className="text-2xl font-extrabold uppercase mt-1">Request custom shipping quotation</h2>
          <p className="mt-1 text-xs text-white/80">Provide your warehouse zip/postal code for exact DDP delivered rates.</p>
        </div>
        <OpenInquiryButton className="btn bg-surface text-ink hover:bg-white shadow-soft">
          Request Shipping Rate <Icon name="arrow" />
        </OpenInquiryButton>
      </section>
    </>
  );
}
