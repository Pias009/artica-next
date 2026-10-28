import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { Icon, type IconName } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { ClosingBand } from "@/components/ui/ClosingBand";
import { SectionHead } from "@/components/ui/SectionHead";
import { MOQ_PAIRS, PRIVATE_LABEL_MIN } from "@/lib/products";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Private label and OEM footwear manufacturing",
  description: "Bespoke footwear development for private-label retailers and brands. MOQ from 600 pairs, custom outsoles, leathers, hardware and packaging.",
  path: "/private-label",
});

const CAPABILITIES: {
  title: string;
  tag: string;
  desc: string;
  icon: IconName;
  items: string[];
}[] = [
  {
    title: "Custom uppers and leathers",
    tag: "Materials",
    desc: "Direct access to LWG Gold-rated tanneries and waterproof barrier membranes.",
    icon: "shield",
    items: ["2.2mm full-grain waterproof cowhide", "Silicone-impregnated nubuck and suede", "Hydrophobic 900D Cordura ripstop", "Merino wool and natural shearling lining"],
  },
  {
    title: "Outsole tooling and moulds",
    tag: "Traction and lasts",
    desc: "Ice-grip rubber formulations rated to −25°C without hardening.",
    icon: "sole",
    items: ["Exclusive tread mould CAD and prototyping", "Vibram® Arctic Grip compound available", "Dual-density shock-absorbing EVA midsoles", "Deep-lug siped snow geometries"],
  },
  {
    title: "Hardware and brand detailing",
    tag: "Branding",
    desc: "Precision hardware finishes that stand up to salt, snow and moisture.",
    icon: "tag",
    items: ["Debossed genuine leather pull tabs", "Matte black and gunmetal speed-lace eyelets", "YKK AquaGuard® waterproof zips", "Woven damask tongue badges and custom aglets"],
  },
  {
    title: "Retail packaging and barcodes",
    tag: "Packaging",
    desc: "Shelf-ready presentation set up to your distribution spec.",
    icon: "box",
    items: ["FSC-certified rigid gift and kraft shoe boxes", "Pre-applied GS1 / UPC / EAN labels", "Branded tissue paper and care booklets", "Case-pack ratios sorted to your size curve"],
  },
];

const TIERS = [
  {
    name: "Branded archive",
    moq: `${MOQ_PAIRS} pairs`,
    leadTime: "30–35 days",
    desc: "Pick any proven Chime Long silhouette and add your branded insole, heel emboss and retail box.",
    features: ["Existing tested lasts and outsoles", "Branded insole and foil-stamped heel", "Your branded outer shoe box", "Prototype confirmed in 10 days"],
    recommended: false,
  },
  {
    name: "Custom colourway and spec",
    moq: `${PRIVATE_LABEL_MIN} pairs`,
    leadTime: "40–45 days",
    desc: "Pantone-dyed leathers, custom hardware finishes and your choice of lining, on our proven lasts.",
    features: ["Your leather and collar-trim combinations", "Coloured metal eyelets and zip pulls", "Custom outsole rubber colour", "Polybag or shoe bag per pair", "Pre-production sample in 14 days"],
    recommended: true,
  },
  {
    name: "Full bespoke tooling",
    moq: "1,200+ pairs",
    leadTime: "60–75 days",
    desc: "Ground-up development: your own last shapes, sole mould tooling and upper construction.",
    features: ["100% exclusive mould ownership", "3D CAD modelling and wooden test lasts", "Custom hardware tooling", "Full SATRA lab compliance report", "A dedicated senior development lead"],
    recommended: false,
  },
];

const STEPS = [
  { title: "Brief and tech pack", time: "Days 1–3", desc: "Send sketches and references, or start from one of our base styles. We return 2D/3D specs and material swatches." },
  { title: "Prototype and fit", time: "Days 4–14", desc: "Our sample room builds fit and wear prototypes and sends them by express air for your approval." },
  { title: "Tooling and bulk run", time: "Days 15–55", desc: "Cutting, lasting and vulcanising, with quality checks throughout and photo or video reports before shipping." },
  { title: "Customs and delivery", time: "Days 56–75", desc: "Container or LCL freight, cleared through customs and delivered to your 3PL or distribution centre." },
];

export default function PrivateLabelPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "Private label" }]}
        eyebrow="OEM and custom footwear"
        title="Private label footwear, under your brand."
        text="OEM and private-label manufacturing for retailers, apparel brands and department stores."
      />

      {/* Overview */}
      <section aria-labelledby="h-overview" className="bg-studio relative overflow-hidden rounded-shell border border-line/60 p-[clamp(24px,4vw,56px)] shadow-soft">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <p className="eyebrow">Turnkey production</p>
            <h2 id="h-overview" className="type-section mt-3">
              One partner, <em>sketch to shelf.</em>
            </h2>
            <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-ink-2">
              We handle the whole product lifecycle: European pattern engineering, cold-tested sole compounds, certified leather sourcing, and DDP customs clearance to your warehouse door.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <OpenInquiryButton buyerType="Private label brand" className="btn btn-dark">
                Submit a private label brief <Icon name="arrow" />
              </OpenInquiryButton>
              <Link href="/catalog" className="btn btn-line">
                Explore base silhouettes
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {[
              [`${PRIVATE_LABEL_MIN} pr`, "Starting custom MOQ"],
              ["14 days", "Prototype turnaround"],
              ["0.4%", "Defect tolerance"],
              ["DDP", "Import customs handled for you"],
            ].map(([val, label]) => (
              <div key={label} className="glass-card flex flex-col-reverse justify-end rounded-card p-5 shadow-xs">
                <dt className="mt-1 text-[14px] text-muted">{label}</dt>
                <dd className="font-headline text-[clamp(26px,2.4vw,32px)] leading-none font-semibold tracking-[-0.02em] tabular-nums">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Capabilities */}
      <section aria-labelledby="h-capabilities" className="mt-sec">
        <SectionHead
          id="h-capabilities"
          eyebrow="Manufacturing scope"
          title={<>Every component, <em>made to your spec.</em></>}
          sub="Each one tested for sub-zero flex, water immersion and abrasion."
        />
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="flex flex-col rounded-card bg-tile p-6">
              <span className="flex items-center justify-between gap-3">
                <Icon name={c.icon} className="size-6! stroke-[1.4] text-brand" />
                <span className="type-label text-muted">{c.tag}</span>
              </span>
              <h3 className="mt-6 text-[16px] font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{c.desc}</p>
              <ul className="mt-5 grid gap-2 border-t border-line pt-4 text-[14px] text-ink-2">
                {c.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5">
                    <span aria-hidden="true" className="mt-2 size-1.5 flex-none rounded-full bg-brand" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* Programme tiers */}
      <section aria-labelledby="h-tiers" className="mt-sec">
        <SectionHead id="h-tiers" eyebrow="Programme options" title={<>Three ways <em>to start.</em></>} />
        <ul className="grid gap-3.5 lg:grid-cols-3">
          {TIERS.map((t) => (
            <li key={t.name} className={`flex flex-col rounded-shell p-7 ${t.recommended ? "bg-white shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-tile"}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-semibold">{t.name}</h3>
                {t.recommended && <span className="type-label rounded-full bg-ink px-3 py-1.5 text-white">Most popular</span>}
              </div>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2 border-b border-line pb-5">
                <span className="font-headline text-[clamp(32px,3vw,40px)] leading-none font-semibold tracking-[-0.02em] tabular-nums">{t.moq}</span>
                <span className="text-[14px] text-muted">min. · {t.leadTime}</span>
              </p>
              <p className="mt-5 text-[14px] leading-relaxed text-ink-2">{t.desc}</p>
              <ul className="mt-5 grid flex-1 content-start gap-2.5 text-[14px] text-ink-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 size-4 flex-none text-brand" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <OpenInquiryButton
                buyerType="Private label brand"
                note={`Private label programme: ${t.name} (${t.moq}).`}
                className={`btn mt-7 w-full ${t.recommended ? "btn-dark" : "btn-line"}`}
              >
                Start with this tier <Icon name="arrow" />
              </OpenInquiryButton>
            </li>
          ))}
        </ul>
      </section>

      {/* Development roadmap */}
      <section aria-labelledby="h-roadmap" className="mt-sec">
        <SectionHead id="h-roadmap" eyebrow="Development roadmap" title={<>From first sketch <em>to delivered carton.</em></>} />
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-card bg-tile p-6">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[13px] font-semibold text-brand tabular-nums">{s.time}</span>
              </span>
              <p className="mt-6 text-[16px] font-semibold">{s.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <ClosingBand
        id="h-close"
        eyebrow="Ready to build your line?"
        title="Talk directly with our OEM technical lead."
        text="Send your moodboard or volume plan. We sign an NDA on request."
        action={
          <OpenInquiryButton buyerType="Private label brand" className="btn flex-none bg-white text-ink hover:bg-white/85">
            Start a private label brief <Icon name="arrow" />
          </OpenInquiryButton>
        }
      />
    </>
  );
}
