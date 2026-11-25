import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AboutGallery } from "@/components/about/AboutGallery";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutVideo } from "@/components/about/AboutVideo";
import { ProcessSteps, type Step } from "@/components/about/ProcessSteps";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { AskInquiryButton } from "@/components/inquiry/AskInquiry";
import { ClosingBand } from "@/components/ui/ClosingBand";
import { SectionHead } from "@/components/ui/SectionHead";
import { ABOUT_VIDEOS, aboutPhoto, aboutPhotos } from "@/lib/about-photos";
import { LEAD, MOQ_PAIRS, PACK } from "@/lib/products";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "About us: footwear factory in Guangzhou",
  description: "See the Chime Long production floor, sample room, testing room, automated material warehouse and showroom, and how a pair goes from leather to carton.",
  path: "/about",
});

const days = (code: string) => code.replace(/^(\d+)d$/, "$1 days").replace(/^(\d+)h$/, "$1 hours");

/** The terms every buyer asks about first, from the site's own numbers (lib/products.ts). */
const TERMS: [string, string][] = [
  ["Samples", `About ${days(LEAD.samples)}, one pair per style`],
  ["Production", `About ${days(LEAD.bulk)} after you confirm`],
  ["Minimum order", `${MOQ_PAIRS} pairs per style`],
  ["Case pack", `${PACK} pairs, mixed size run`],
  ["Quote", `Within ${days(LEAD.quote)}`],
];

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

const NUMBERS: [string, string][] = [
  ["85,000 pr", "Monthly seasonal capacity across 4 lines"],
  ["100%", "Pre-shipment batch inspection before sealing"],
  ["120+", "Retail partners stocking Chime Long across NA"],
  ["0.4%", "Industry-lowest defect rate"],
];

/** A pair from leather to container, with the floor's own photo of each step. */
const STEPS: { slug: string; title: string; text: string }[] = [
  { slug: "step-materials", title: "Materials", text: "Leather, suede and linings are checked for grain, thickness and colour before anything is cut." },
  { slug: "step-cutting", title: "Cutting", text: "Pattern pieces are cut by machine, so every pair in a run matches." },
  { slug: "step-stitching", title: "Stitching", text: "Uppers are stitched on dedicated sewing lines, one stage per station." },
  { slug: "step-lasting", title: "Lasting and soles", text: "Each upper is pulled over its last, then the sole is attached and pressed." },
  { slug: "step-finishing", title: "Finishing", text: "Pairs are cleaned, checked and laced before they are boxed." },
  { slug: "step-cartons", title: "Packed in cases", text: `Boxed pairs go into export cartons, ${PACK} pairs to a case in a mixed size run.` },
  { slug: "step-container", title: "Container loading", text: "Cartons are loaded and sealed into the container for the trip to your port." },
];

/** The rooms behind the production floor, each with its photos. */
const ROOMS: { group: string; title: string; text: string }[] = [
  { group: "warehouse", title: "Raw material warehouse", text: "Leather and materials wait on automated racks and come to the line when a run needs them, so a reorder uses the same hides as the first." },
  { group: "sample", title: "Sample room", text: "Where new styles and your samples are made and corrected before any bulk order starts. Changes to a last, a colour or a sole are made here." },
  { group: "testing", title: "Testing room", text: "Where materials and finished pairs are checked on the bench before a run is released." },
];

const VISIT = ["Handle every style in the range", "Compare leathers, linings and soles side by side", "Sit down with the trade desk and choose your size runs"];

export default function AboutPage() {
  const steps: Step[] = STEPS.map((s) => ({ ...s, photo: aboutPhoto(s.slug) }));
  const band = aboutPhoto("band-factory-floor");
  const showroom = aboutPhotos("showroom");
  const wide = showroom.find((p) => p.slug === "showroom-wide")!;
  return (
    <>
      <AboutHero slides={aboutPhotos("hero")} />

      {/* who we are, plainly, with the terms buyers ask about first */}
      <section aria-labelledby="h-intro" className="mt-sec grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h2 id="h-intro" className="type-section max-w-[20ch]">
            Zero compromises between weather protection and shelf appeal.
          </h2>
          <div className="mt-6 grid max-w-[62ch] gap-4 text-[17px] leading-relaxed text-ink-2">
            <p>
              For decades, retail footwear buyers faced an unacceptable trade-off: stock clunky, aesthetic-free rubber pac-boots that sat on shelves, or fashionable leather booties that soaked through during the first January blizzard and resulted in customer returns.
            </p>
            <p>
              Chime Long bridges this divide. Our design atelier patterns modern, architectural silhouettes using authentic shearling, oiled full-grain leather, and matte hardware, while our engineering laboratory integrates vulcanized arctic traction and sealed waterproof booties.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalog" className="btn btn-dark">
              View current collection <Icon name="arrow" />
            </Link>
            <OpenInquiryButton className="btn btn-line">Book a showroom visit</OpenInquiryButton>
          </div>
        </div>
        <aside aria-label="Trade terms" className="lg:col-span-5 lg:pt-2">
          <h3 className="text-[14px] font-semibold text-ink-2">Working with us</h3>
          <dl className="mt-3 border-t border-ink">
            {TERMS.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-4 border-b border-line py-4">
                <dt className="text-[14px] text-muted">{k}</dt>
                <dd className="text-[15px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <Link href="/terms" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink">
            Full terms of trade <Icon name="arrow" className="size-4" />
          </Link>
        </aside>
      </section>

      {/* how a pair is made: the steps stay put while their photos pass */}
      <section aria-labelledby="h-steps" className="mt-sec">
        <ProcessSteps steps={steps} />
      </section>

      {/* the floor itself, edge to edge, captioned like a figure */}
      <figure className="bleed relative mt-sec h-[clamp(340px,58vw,780px)] overflow-hidden">
        <Image src={band.src} alt={band.alt} fill sizes="100vw" className="object-cover" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(0deg,rgb(12_13_14/.55),transparent)]" />
        <figcaption className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1440px] items-end justify-between gap-6 px-(--shell-pad) pb-5 text-[13.5px] text-white/85">
          <span>The production floor: cutting, stitching, lasting and packing under one roof.</span>
          <span className="hidden shrink-0 tabular-nums sm:inline">Guangzhou</span>
        </figcaption>
      </figure>

      {/* the rooms most buyers never see, one per row */}
      <section aria-labelledby="h-rooms" className="mt-sec">
        <SectionHead id="h-rooms" title="Behind the production line." sub="Three rooms that decide whether a reorder matches the first run." />
        <div className="border-t border-line">
          {ROOMS.map((r, k) => {
            const [main, ...more] = aboutPhotos(r.group);
            return (
              <article key={r.group} className="grid items-center gap-6 border-b border-line py-8 lg:grid-cols-12 lg:gap-12 lg:py-10">
                <span className={`relative block aspect-[16/10] overflow-hidden rounded-shell bg-photo lg:col-span-7 ${k % 2 ? "lg:order-2" : ""}`}>
                  <Image src={main.src} alt={main.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
                </span>
                <div className={`lg:col-span-5 ${k % 2 ? "lg:order-1" : ""}`}>
                  <p className="text-[13px] font-semibold text-brand tabular-nums">{String(k + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 font-headline text-[clamp(24px,2.4vw,32px)] leading-tight font-semibold tracking-[-0.015em]">{r.title}</h3>
                  <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">{r.text}</p>
                  {more.length > 0 && (
                    <ul className="mt-6 grid max-w-[420px] grid-cols-3 gap-2">
                      {more.map((p) => (
                        <li key={p.slug} className="relative aspect-[4/3] overflow-hidden rounded-ph bg-photo">
                          <Image src={p.src} alt={p.alt} fill sizes="140px" className="object-cover" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* the line moving, on a dark band so the footage reads */}
      <section aria-labelledby="h-video" className="bleed mt-sec bg-ink px-(--shell-pad) py-[clamp(56px,7vw,104px)] text-white">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="h-video" className="type-section text-white">
              See the line at work.
            </h2>
            <p className="max-w-[40ch] text-[15px] text-white/65">Unedited clips from the floor. Silent, and they stop when you scroll past.</p>
          </div>
          <div className="mt-10 grid items-start gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <figure>
              <AboutVideo src={ABOUT_VIDEOS.factoryWalk.src} poster={ABOUT_VIDEOS.factoryWalk.poster} label="A walk along the assembly line" className="aspect-video w-full rounded-shell bg-white/5 object-cover" />
              <figcaption className="mt-3 text-[13.5px] text-white/60">Along the assembly line</figcaption>
            </figure>
            <figure>
              <AboutVideo src={ABOUT_VIDEOS.sewingLine.src} poster={ABOUT_VIDEOS.sewingLine.poster} label="The sewing floor" className="aspect-[3/4] w-full rounded-shell bg-white/5 object-cover" />
              <figcaption className="mt-3 text-[13.5px] text-white/60">The sewing floor</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* everything else from the floor, as a contact sheet */}
      <section aria-labelledby="h-floor" className="mt-sec">
        <SectionHead id="h-floor" title="On the factory floor." sub="Lines, machines, packing and the people who run them. Open any photo to see it large." />
        <AboutGallery photos={aboutPhotos("gallery")} shown={12} />
      </section>

      {/* the showroom: what a visit is for, beside the room itself */}
      <section aria-labelledby="h-showroom" className="mt-sec grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4 lg:pt-2">
          <h2 id="h-showroom" className="type-section">
            Visit the showroom.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">Every style in the range on one floor, so a buying trip takes a day, not a week.</p>
          <ul className="mt-6 grid gap-3 border-t border-line pt-5">
            {VISIT.map((v) => (
              <li key={v} className="flex gap-3 text-[15px]">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand" />
                {v}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <OpenInquiryButton className="btn btn-dark">
              Book a visit <Icon name="arrow" />
            </OpenInquiryButton>
            <Link href="/meet" className="btn btn-line">
              Video tour instead
            </Link>
          </div>
        </div>
        <div className="lg:col-span-8">
          <span className="relative block aspect-[16/9] overflow-hidden rounded-shell bg-photo">
            <Image src={wide.src} alt={wide.alt} fill sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
          </span>
          <AboutGallery photos={showroom.filter((p) => p !== wide)} shown={3} columns={3} className="mt-5" />
        </div>
      </section>

      {/* the standards, laid out as a spec sheet */}
      <section aria-labelledby="h-standards" className="mt-sec">
        <SectionHead id="h-standards" title="Standards and testing." sub="How the boots are built for the cold, and the tests they are held to." />
        <div className="grid gap-12 border-t border-ink pt-8 lg:grid-cols-12 lg:gap-16">
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-7">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <dt>
                  <span className="block text-[13px] font-semibold text-brand">{p.subtitle}</span>
                  <span className="mt-1.5 block text-[17px] font-semibold">{p.title}</span>
                </dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{p.desc}</dd>
              </div>
            ))}
          </dl>
          <div className="lg:col-span-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[14px] font-semibold text-ink-2">Laboratory tests</h3>
              <p className="text-[12.5px] text-muted">Third-party SATRA &amp; Intertek verified</p>
            </div>
            <dl className="mt-3 border-t border-line">
              {LAB_TESTS.map((t) => (
                <div key={t.test} className="border-b border-line py-3.5">
                  <dt className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-semibold">{t.label}</span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-brand tabular-nums">{t.test}</span>
                  </dt>
                  <dd className="mt-0.5 text-[14px] text-ink-2">{t.standard}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[13.5px] leading-relaxed text-muted">
              Our partner factories work to European social compliance guidelines: fair living wages, dust-extracted bonding rooms, zero forced labour, and leather cutting scraps recycled into bonded insoles.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px] font-semibold">
              {["BSCI audited", "SMETA 4-pillar", "LWG tannery Gold", "REACH compliant", "ISO 9001 certified"].map((badge) => (
                <li key={badge} className="inline-flex items-center gap-1.5">
                  <Icon name="check" className="size-3.5 text-brand" />
                  {badge}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <dl className="mt-12 grid grid-cols-2 border-t border-line lg:grid-cols-4">
          {NUMBERS.map(([v, k], i) => (
            <div key={k} className={`flex flex-col-reverse justify-end gap-1 py-6 pr-4 ${i % 2 ? "border-l border-line pl-4 lg:pl-6" : ""} ${i === 2 ? "lg:border-l lg:border-line lg:pl-6" : ""}`}>
              <dt className="text-[13.5px] text-muted">{k}</dt>
              <dd className="font-headline text-[clamp(28px,2.8vw,38px)] leading-none font-semibold tracking-[-0.02em] tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ClosingBand
        id="h-close"
        eyebrow="Partner with Chime Long"
        title="Request the wholesale line sheet and samples."
        text="Feel the leather and the construction in your own hands before you commit."
        action={
          <div className="flex flex-none flex-wrap gap-2">
            <OpenInquiryButton className="btn flex-none bg-white text-ink hover:bg-white/85">
              Request line sheet <Icon name="arrow" />
            </OpenInquiryButton>
            <AskInquiryButton className="btn flex-none text-white ring-1 ring-white/30 hover:bg-white/10" />
          </div>
        }
      />
    </>
  );
}
