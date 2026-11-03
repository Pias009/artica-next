import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { ClosingBand } from "@/components/ui/ClosingBand";
import { SectionHead } from "@/components/ui/SectionHead";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "About us: footwear factory in Guangzhou",
  description: "Learn about Chime Long's technical footwear engineering, LWG certified leathers, sub-zero testing laboratory, and ethical manufacturing standards.",
  path: "/about",
});

const PILLARS = [
  {
    title: "Tannery integrity",
    subtitle: "LWG Gold Certified",
    desc: "We exclusively source premium 2.0–2.2mm heavy-gauge cowhides and full-grain suedes from Leather Working Group Gold-rated tanneries, ensuring non-toxic vegetable tanning and water recycling.",
  },
  {
    title: "Sub-zero rubber chemistry",
    subtitle: "Flexible to -25°C",
    desc: "Standard commercial boot outsoles harden and become slick below freezing. Our custom vulcanized nitrile compounds retain Shore A 60 elasticity in extreme sub-zero blizzard conditions.",
  },
  {
    title: "Waterproof bootie sealing",
    subtitle: "4-hour immersion rating",
    desc: "Unlike topical water-repellent sprays, every Chime Long style is constructed with a sealed hydrophilic inner membrane bootie with heat-welded tape over all needle puncture seams.",
  },
  {
    title: "Thermal foil strobel",
    subtitle: "Ground-cold decoupling",
    desc: "Over 70% of conductive heat loss occurs directly through cold pavement. Our soles integrate an aluminum thermal foil strobel board that radiates warmth back into the footbed.",
  },
];

const LAB_TESTS = [
  { test: "SATRA TM144", label: "Slip resistance on ice and wet floors", standard: "Coefficient > 0.42 on wet ice tile" },
  { test: "ISO 20344 §5.13", label: "Upper leather water penetration", standard: "Zero water ingress after 180 min" },
  { test: "Bally Penetrometer", label: "Dynamic sole flexing in water", standard: "50,000 flex cycles without leakage" },
  { test: "ASTM F2413", label: "Cold insulation at −25°C", standard: "< 5°C temp drop after 30 min exposure" },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "About Chime Long" }]}
        eyebrow="Specialist footwear engineering"
        title="Wholesale footwear, built to sell through."
        text="Boots that hold up in the weather and look right on the shelf, so fewer pairs come back."
      />

      {/* Story & philosophy */}
      <section aria-labelledby="h-philosophy" className="bg-studio relative overflow-hidden rounded-shell border border-line/60 p-[clamp(24px,4vw,56px)] shadow-soft">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <p className="eyebrow">Our philosophy</p>
            <h2 id="h-philosophy" className="type-section mt-3">
              Zero compromises between weather protection <em>and shelf appeal.</em>
            </h2>
            <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-ink-2">
              For decades, retail footwear buyers faced an unacceptable trade-off: stock clunky, aesthetic-free rubber pac-boots that sat on shelves, or fashionable leather booties that soaked through during the first January blizzard and resulted in customer returns.
            </p>
            <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-2">
              Chime Long bridges this divide. Our design atelier patterns modern, architectural silhouettes using authentic shearling, oiled full-grain leather, and matte hardware, while our engineering laboratory integrates vulcanized arctic traction and sealed waterproof booties.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/catalog" className="btn btn-dark">
                View current collection <Icon name="arrow" />
              </Link>
              <OpenInquiryButton className="btn btn-line">Book a showroom visit</OpenInquiryButton>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {[
              ["85,000 pr", "Monthly seasonal capacity across 4 lines"],
              ["100%", "Pre-shipment batch inspection before sealing"],
              ["120+", "Retail partners stocking Chime Long across NA"],
              ["0.4%", "Industry-lowest defect rate"],
            ].map(([val, label]) => (
              <div key={label} className="glass-card flex flex-col-reverse justify-end rounded-card p-5 shadow-xs">
                <dt className="mt-1 text-[14px] text-muted">{label}</dt>
                <dd className="font-headline text-[clamp(26px,2.4vw,32px)] leading-none font-semibold tracking-[-0.02em] tabular-nums">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Engineering pillars */}
      <section aria-labelledby="h-pillars" className="mt-sec">
        <SectionHead id="h-pillars" eyebrow="Technical standards" title={<>Four pillars of <em>sub‑zero construction.</em></>} />
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <li key={p.title} className="rounded-card bg-tile p-6">
              <p className="type-label text-brand">{p.subtitle}</p>
              <h3 className="mt-4 text-[16px] font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{p.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Laboratory test standards */}
      <section aria-labelledby="h-lab" className="mt-sec">
        <SectionHead
          id="h-lab"
          eyebrow="Laboratory compliance"
          title={<>Certified testing <em>protocols.</em></>}
          right={<p className="type-label text-muted">Third-party SATRA &amp; Intertek verified</p>}
        />
        <dl className="overflow-hidden rounded-card bg-tile">
          {LAB_TESTS.map((t) => (
            <div key={t.test} className="grid gap-1 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-6">
              <dt className="text-[13px] font-semibold text-brand tabular-nums">{t.test}</dt>
              <dd className="text-[15px] font-semibold">{t.label}</dd>
              <dd className="text-[14px] text-ink-2">{t.standard}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Ethical factory auditing */}
      <section aria-labelledby="h-ethics" className="mt-sec">
        <SectionHead
          id="h-ethics"
          eyebrow="Ethical manufacturing"
          title={<>BSCI and SMETA <em>audited facilities.</em></>}
          sub="Our partner factories work to European social compliance guidelines: fair living wages, dust-extracted bonding rooms, zero forced labour, and leather cutting scraps recycled into bonded insoles."
        />
        <ul className="flex flex-wrap gap-2.5">
          {["BSCI audited", "SMETA 4-pillar", "LWG tannery Gold", "REACH compliant", "ISO 9001 certified"].map((badge) => (
            <li key={badge} className="inline-flex h-11 items-center gap-2 rounded-full bg-tile px-4 text-[14px] font-semibold">
              <Icon name="check" className="size-4 text-brand" />
              {badge}
            </li>
          ))}
        </ul>
      </section>

      <ClosingBand
        id="h-close"
        eyebrow="Partner with Chime Long"
        title="Request the wholesale line sheet and samples."
        text="Feel the leather and the construction in your own hands before you commit."
        action={
          <OpenInquiryButton className="btn flex-none bg-white text-ink hover:bg-white/85">
            Request line sheet <Icon name="arrow" />
          </OpenInquiryButton>
        }
      />
    </>
  );
}
