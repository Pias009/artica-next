import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";

export const metadata: Metadata = {
  title: "About ARTICA · Wholesale Footwear Atelier",
  description: "Learn about ARTICA's technical footwear engineering, LWG certified leathers, sub-zero testing laboratory, and ethical manufacturing standards.",
};

const PILLARS = [
  {
    title: "Tannery Integrity",
    subtitle: "LWG Gold Certified",
    desc: "We exclusively source premium 2.0–2.2mm heavy-gauge cowhides and full-grain suedes from Leather Working Group Gold-rated tanneries, ensuring non-toxic vegetable tanning and water recycling.",
  },
  {
    title: "Sub-Zero Rubber Chemistry",
    subtitle: "Flexible to -25°C",
    desc: "Standard commercial boot outsoles harden and become slick below freezing. Our custom vulcanized nitrile compounds retain Shore A 60 elasticity in extreme sub-zero blizzard conditions.",
  },
  {
    title: "Waterproof Bootie Sealing",
    subtitle: "4-Hour Immersion Rating",
    desc: "Unlike topical water-repellent sprays, every ARTICA style is constructed with a sealed hydrophilic inner membrane bootie with heat-welded tape over all needle puncture seams.",
  },
  {
    title: "Thermal Foil Strobel",
    subtitle: "Ground Cold Decoupling",
    desc: "Over 70% of winter heat loss occurs directly through the frozen pavement. Our soles integrate an aluminum thermal foil strobel board that radiates body heat back into the footbed.",
  },
];

const LAB_TESTS = [
  { test: "SATRA TM144", label: "Ice & Wet Surface Slip Resistance", standard: "Coefficient > 0.42 on wet ice tile" },
  { test: "ISO 20344 §5.13", label: "Upper Leather Water Penetration", standard: "Zero water ingress after 180 min" },
  { test: "Bally Penetrometer", label: "Dynamic Sole Flexing in Water", standard: "50,000 flex cycles without leakage" },
  { test: "ASTM F2413", label: "Cold Insulation Testing (-25°C)", standard: "< 5°C temp drop after 30 min exposure" },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/", label: "Home" }, { label: "About ARTICA" }]}
        eyebrow="Specialist Cold-Weather Footwear Engineering"
        title="Engineered for harsh retail realities."
        text="ARTICA was founded to eliminate the high return rates and poor cold-weather durability of conventional fashion winter boots. We build boots that keep trade buyers and end consumers loyal season after season."
      />

      {/* Story & Philosophy */}
      <section className="bg-studio relative overflow-hidden rounded-shell border border-line/60 p-[clamp(24px,4vw,50px)] shadow-soft">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <span className="mono-label text-accent font-bold">OUR PHILOSOPHY</span>
            <h2 className="text-[clamp(26px,3.2vw,40px)] font-extrabold uppercase tracking-tight text-ink mt-1">
              Zero compromises between brutal weather protection and store-shelf aesthetics.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              For decades, retail footwear buyers faced an unacceptable trade-off: stock clunky, aesthetic-free rubber pac-boots that sat on shelves, or fashionable leather booties that soaked through during the first January blizzard and resulted in customer returns.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              ARTICA bridges this divide. Our design atelier patterns modern, architectural silhouettes using authentic shearling, oiled full-grain leather, and matte hardware, while our engineering laboratory integrates vulcanized arctic traction and sealed waterproof booties.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/catalog" className="btn btn-dark">
                View current FW26 collection <Icon name="arrow" />
              </Link>
              <OpenInquiryButton className="btn btn-line">
                Book a showroom visit
              </OpenInquiryButton>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {[
              ["85,000 pr", "Monthly seasonal capacity across 4 lines"],
              ["100%", "Pre-shipment batch inspection before sealing"],
              ["120+", "Retail partners stocking ARTICA across NA"],
              ["0.4%", "Industry-lowest defect rate"],
            ].map(([val, label]) => (
              <div key={label} className="glass-card rounded-card p-4 shadow-xs">
                <span className="text-2xl font-extrabold text-ink tabular-nums">{val}</span>
                <span className="block mt-0.5 text-xs text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Pillars */}
      <section className="mt-sec">
        <div className="mb-6">
          <span className="mono-label text-accent font-bold">TECHNICAL STANDARDS</span>
          <h2 className="type-section mt-1">Four Pillars of Sub-Zero Construction</h2>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-card border border-line/60 bg-tile p-5 card-lift shadow-xs">
              <span className="mono-label text-[9.5px] text-accent font-bold">{p.subtitle}</span>
              <h3 className="mt-1 text-base font-extrabold uppercase text-ink">{p.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-ink-2">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Laboratory Test Standards */}
      <section className="mt-sec rounded-shell border border-line/60 bg-tile p-6 sm:p-8 shadow-soft">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mono-label text-accent font-bold">LABORATORY COMPLIANCE</span>
            <h2 className="type-section mt-1">Certified Testing Protocols</h2>
          </div>
          <span className="mono-label text-xs text-muted">THIRD-PARTY SATRA & INTERTEK VERIFIED</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {LAB_TESTS.map((t) => (
            <div key={t.test} className="rounded-card border border-line/60 bg-surface p-4 shadow-xs">
              <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-mono font-bold text-accent">
                {t.test}
              </span>
              <h4 className="mt-2 text-sm font-bold text-ink">{t.label}</h4>
              <p className="mt-1.5 text-xs text-muted">{t.standard}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sustainability & Ethical Factory Auditing */}
      <section className="mt-sec rounded-shell border border-line/60 bg-surface p-6 sm:p-8 shadow-soft">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <span className="mono-label text-accent font-bold">ETHICAL MANUFACTURING</span>
            <h3 className="text-xl font-extrabold uppercase text-ink mt-1">
              BSCI & SMETA 4-Pillar Audited Facilities
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">
              Our partner factory facilities operate under strict European social compliance guidelines. Fair living wages, safe dust-extracted bonding ventilation, zero forced labor, and continuous recycling of leather cutting scraps into bonded insoles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {["BSCI Audited", "SMETA 4-Pillar", "LWG Tannery Gold", "REACH Compliant", "ISO 9001 Certified"].map((badge) => (
              <span key={badge} className="rounded-full border border-line/70 bg-chip px-3 py-1.5 text-xs font-semibold text-ink">
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-sec mb-4 flex flex-col items-center justify-between gap-4 rounded-shell border border-line/60 bg-accent p-8 text-center text-on-accent md:flex-row md:text-left">
        <div>
          <span className="mono-label text-kraft text-[10px]">PARTNER WITH ARTICA</span>
          <h2 className="text-2xl font-extrabold uppercase mt-1">Request seasonal line sheet & samples</h2>
          <p className="mt-1 text-xs text-white/80">Experience the leather hand-feel and sub-zero grip firsthand.</p>
        </div>
        <OpenInquiryButton className="btn bg-surface text-ink hover:bg-white shadow-soft">
          Request Line Sheet <Icon name="arrow" />
        </OpenInquiryButton>
      </section>
    </>
  );
}
