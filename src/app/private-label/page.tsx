import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { Icon, type IconName } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { PRIVATE_LABEL_MIN } from "@/lib/products";

export const metadata: Metadata = {
  title: "Private Label & OEM Manufacturing",
  description: "Bespoke winter boot development for private-label retailers and brands. MOQ from 600 pairs, custom outsoles, leathers, hardware and packaging.",
};

const CAPABILITIES: {
  title: string;
  tag: string;
  desc: string;
  icon: IconName;
  items: string[];
}[] = [
  {
    title: "Custom Uppers & Leathers",
    tag: "MATERIALS",
    desc: "Direct access to LWG Gold-rated tanneries and waterproof barrier membranes.",
    icon: "shield",
    items: [
      "2.2mm Full-Grain Waterproof Cowhide",
      "Silicone-impregnated Nubuck & Suede",
      "Hydrophobic 900D Cordura Ripstop",
      "Merino Wool & Natural Shearling Lining",
    ],
  },
  {
    title: "Outsole Tooling & Moulds",
    tag: "TRACTION & LASTS",
    desc: "Engineered ice-grip rubber formulations rated to -25°C without hardening.",
    icon: "box",
    items: [
      "Exclusive Custom Tread Mold CAD & Prototyping",
      "Vibram® Arctic Grip Compound Available",
      "Dual-Density Shock Absorbing EVA Midsoles",
      "Deep Lug Siped Snow Geometries",
    ],
  },
  {
    title: "Hardware & Brand Detailing",
    tag: "BRANDING",
    desc: "High-precision hardware finishes that withstand salt, snow, and moisture.",
    icon: "tag",
    items: [
      "Debossed Genuine Leather Pull Tabs",
      "Matte Black & Gunmetal Speed-Lace Eyelets",
      "YKK Waterproof Aquaguard® Zippers",
      "Woven Damask Tongue Badges & Custom Aglets",
    ],
  },
  {
    title: "Retail Packaging & Barcoding",
    tag: "PACKAGING",
    desc: "Complete shelf-ready retail presentation configured to your distribution spec.",
    icon: "sample",
    items: [
      "FSC-Certified Rigid Gift & Kraft Shoe Boxes",
      "Pre-applied GS1 / UPC / EAN Barcode Labels",
      "Custom Branded Tissue Paper & Care Booklets",
      "Pre-sorted Case Pack Ratios per Your Curve",
    ],
  },
];

const TIERS = [
  {
    name: "Branded Archive",
    moq: "300 pairs",
    leadTime: "30–35 days",
    desc: "Select any existing Chime Long proven silhouette and apply your custom branded insole, heel emboss, and retail box.",
    features: [
      "Existing tested lasts and outsoles",
      "Custom branded insole & foil stamped heel",
      "Your branded exterior shoe box",
      "10-day prototype confirmation",
    ],
    recommended: false,
  },
  {
    name: "Custom Colorway & Spec",
    moq: `${PRIVATE_LABEL_MIN} pairs`,
    leadTime: "40–45 days",
    desc: "Our most popular tier. Custom Pantone dyed leathers, custom hardware finishes, and bespoke lining choices on our proven lasts.",
    features: [
      "Bespoke leather & collar trim combinations",
      "Custom colored metal eyelets & zip pulls",
      "Custom outsole rubber colorway",
      "Individual polybag / shoe bag per pair",
      "Pre-production sample in 14 days",
    ],
    recommended: true,
  },
  {
    name: "Full Bespoke Tooling",
    moq: "1,200+ pairs",
    leadTime: "60–75 days",
    desc: "Complete ground-up development. Exclusive proprietary last shapes, custom sole mold tooling, and unique upper architecture.",
    features: [
      "100% exclusive mould ownership",
      "Bespoke 3D CAD modeling & wooden test lasts",
      "Complete custom hardware tooling",
      "Full SATRA lab compliance certification report",
      "Dedicated senior technical development director",
    ],
    recommended: false,
  },
];

const STEPS = [
  {
    step: "01",
    title: "Brief & Tech Pack",
    time: "Day 1–3",
    desc: "Send your sketches, references, or select from our base architectures. We supply 2D/3D spec blueprints and material swatches.",
  },
  {
    step: "02",
    title: "Prototype & Fit Last",
    time: "Day 4–14",
    desc: "Our sample atelier builds physical fit and wear prototypes dispatched via express air courier for your approval.",
  },
  {
    step: "03",
    title: "Batch Tooling & Bulk Run",
    time: "Day 15–55",
    desc: "Cutting, lasting, vulcanization, and continuous quality inspection with photo/video batch reports before shipping.",
  },
  {
    step: "04",
    title: "DDP Customs & Delivery",
    time: "Day 56–75",
    desc: "Container or LCL freight cleared through customs and delivered directly to your North American 3PL or retail distribution center.",
  },
];

export default function PrivateLabelPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Private label" }]}
        eyebrow="OEM & Custom Footwear Atelier"
        title="Your brand. Our sub-zero engineering."
        text="Turnkey private-label and OEM winter boot manufacturing for North American retailers, apparel brands, and department store programs."
      />

      {/* Hero Overview Banner */}
      <section className="bg-studio relative overflow-hidden rounded-shell border border-line/60 p-[clamp(24px,4vw,50px)] shadow-soft">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="mono-label rounded-md bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                TURNKEY B2B PRODUCTION
              </span>
              <span className="mono-label text-[10px] text-muted">[ MOQ 600 PR ]</span>
            </div>
            <h2 className="text-[clamp(26px,3.2vw,44px)] font-extrabold uppercase tracking-tight text-ink">
              Eliminate overseas factory friction.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-2">
              We handle the entire product lifecycle: European footwear pattern engineering, tested sub-zero cold formulations, certified leather sourcing, and DDP domestic customs clearance to your warehouse door.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <OpenInquiryButton buyerType="Private label brand" className="btn btn-dark">
                Submit private label brief <Icon name="arrow" />
              </OpenInquiryButton>
              <Link href="/catalog" className="btn btn-line">
                Explore base silhouettes
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["600 pr", "Starting custom MOQ"],
              ["14 days", "Prototyping turnaround"],
              ["0.4%", "Defect tolerance rate"],
              ["DDP", "All US & CA customs handled"],
            ].map(([val, label]) => (
              <div key={label} className="glass-card flex flex-col justify-between rounded-card p-4 shadow-xs">
                <span className="text-2xl font-extrabold tracking-tight text-ink tabular-nums">{val}</span>
                <span className="mt-1 text-xs font-medium text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="mt-sec">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mono-label text-accent font-bold">MANUFACTURING SCOPE</span>
            <h2 className="type-section mt-1">Full Custom Capabilities</h2>
          </div>
          <p className="max-w-[42ch] text-xs text-muted">
            Every component is tested for sub-zero flexibility, water immersion, and abrasion resistance.
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="flex flex-col rounded-card border border-line/60 bg-tile p-5 card-lift shadow-xs">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-xl border border-line/60 bg-surface text-accent shadow-xs">
                  <Icon name={c.icon} className="size-5" />
                </div>
                <span className="mono-label text-[9px] text-muted">{c.tag}</span>
              </div>
              <h3 className="mt-4 text-base font-extrabold uppercase text-ink">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-2">{c.desc}</p>
              <ul className="mt-4 space-y-2 border-t border-line/50 pt-3 text-xs text-ink-2">
                {c.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 flex-none rounded-full bg-accent" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Program Tiers */}
      <section className="mt-sec">
        <div className="mb-6">
          <span className="mono-label text-accent font-bold">PROGRAM OPTIONS</span>
          <h2 className="type-section mt-1">Volume & Development Tiers</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col justify-between rounded-shell border p-6 card-lift shadow-soft ${
                t.recommended
                  ? "border-accent bg-surface ring-2 ring-accent/20"
                  : "border-line/60 bg-tile"
              }`}
            >
              {t.recommended && (
                <span className="mono-label absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-[9.5px] font-bold text-on-accent shadow-sm">
                  MOST POPULAR
                </span>
              )}
              <div>
                <span className="mono-label text-xs text-muted">TIER SPECIFICATION</span>
                <h3 className="mt-1 text-xl font-extrabold uppercase text-ink">{t.name}</h3>
                <div className="mt-3 flex items-baseline gap-2 border-b border-line/60 pb-3">
                  <span className="text-3xl font-extrabold tabular-nums text-ink">{t.moq}</span>
                  <span className="text-xs font-semibold text-muted">/ {t.leadTime}</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-2">{t.desc}</p>
                <ul className="mt-4 space-y-2.5 text-xs text-ink-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Icon name="check" className="size-3.5 text-accent flex-none" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60">
                <OpenInquiryButton
                  buyerType="Private label brand"
                  className={`btn w-full ${t.recommended ? "btn-dark" : "btn-line"}`}
                >
                  Configure {t.name} <Icon name="arrow" />
                </OpenInquiryButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline Steps */}
      <section className="mt-sec rounded-shell border border-line/60 bg-tile p-6 sm:p-8 shadow-soft">
        <div className="mb-6">
          <span className="mono-label text-accent font-bold">DEVELOPMENT ROADMAP</span>
          <h2 className="type-section mt-1">From First Sketch to Delivered Carton</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-card border border-line/50 bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="mono-label text-xs font-extrabold text-accent">STEP {s.step}</span>
                <span className="rounded bg-chip px-2 py-0.5 text-[10px] font-mono text-muted">{s.time}</span>
              </div>
              <h3 className="mt-3 text-base font-extrabold uppercase text-ink">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Strip */}
      <section className="mt-sec mb-4 flex flex-col items-center justify-between gap-4 rounded-shell border border-line/60 bg-accent p-8 text-center text-on-accent md:flex-row md:text-left">
        <div>
          <span className="mono-label text-kraft text-[10px]">READY TO BUILD YOUR LINE?</span>
          <h2 className="text-2xl font-extrabold uppercase mt-1">Speak directly with an OEM Technical Director</h2>
          <p className="mt-1 text-xs text-white/80">Send your moodboard or volume requirements. Confidentiality NDA provided upon request.</p>
        </div>
        <OpenInquiryButton buyerType="Private label brand" className="btn bg-surface text-ink hover:bg-white shadow-soft">
          Start Private Label Brief <Icon name="arrow" />
        </OpenInquiryButton>
      </section>
    </>
  );
}
