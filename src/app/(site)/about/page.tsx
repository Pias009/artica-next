import { editableMeta } from "@/lib/content/meta";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AboutGallery } from "@/components/about/AboutGallery";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutVideo } from "@/components/about/AboutVideo";
import { Icon } from "@/components/Icon";
import { OpenInquiryButton } from "@/components/OpenInquiryButton";
import { AskInquiryButton } from "@/components/inquiry/AskInquiry";
import { ClosingBand } from "@/components/ui/ClosingBand";
import { SectionHead } from "@/components/ui/SectionHead";
import { ABOUT_VIDEOS, aboutPhoto, aboutPhotos } from "@/lib/about-photos";
import { PACK } from "@/lib/products";

export const generateMetadata = (): Promise<Metadata> => editableMeta({
  title: "About us: footwear factory in Guangzhou",
  description: "See the Chime Long factory floor, sample room, testing room, automated material warehouse and showroom, and how a pair goes from leather to carton.",
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

/** A pair from leather to container, with the factory's own photo of each step. */
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
  { group: "warehouse", title: "Raw material warehouse", text: "Leather and materials wait on automated racks and come to the line when a run needs them." },
  { group: "sample", title: "Sample room", text: "Where new styles and your samples are made and corrected, before any bulk order starts." },
  { group: "testing", title: "Testing room", text: "Where materials and finished pairs are checked on the bench." },
];

export default function AboutPage() {
  const band = aboutPhoto("band-factory-floor");
  const wide = aboutPhoto("showroom-wide");
  return (
    <>
      <AboutHero slides={aboutPhotos("hero")} />

      {/* Story & philosophy */}
      <section aria-labelledby="h-philosophy" className="bg-studio relative mt-sec overflow-hidden rounded-shell border border-line/60 p-[clamp(24px,4vw,56px)] shadow-soft">
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

      {/* From material to carton: the A-shots, in order */}
      <section aria-labelledby="h-steps" className="mt-sec">
        <SectionHead id="h-steps" eyebrow="How a pair is made" title={<>From leather <em>to carton.</em></>} sub="Seven steps on our own floor, photographed as they happen." />
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
            const p = aboutPhoto(s.slug);
            return (
              <li key={s.slug} className={i === 0 ? "sm:col-span-2" : undefined}>
                <figure className="group flex h-full flex-col overflow-hidden rounded-card bg-tile">
                  <span className={`relative block overflow-hidden bg-photo ${i === 0 ? "aspect-[4/3] sm:aspect-[8/3.05]" : "aspect-[4/3]"}`}>
                    <Image src={p.src} alt={p.alt} fill sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"} className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]" />
                    <span className="absolute top-3 left-3 grid size-9 place-items-center rounded-full bg-white text-[13px] font-semibold text-ink tabular-nums shadow-soft">{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <figcaption className="p-5">
                    <h3 className="text-[16px] font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{s.text}</p>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ol>
      </section>

      {/* the factory floor, edge to edge */}
      <section aria-label={band.caption} className="bleed relative mt-sec h-[clamp(360px,62vw,760px)] overflow-hidden">
        <Image src={band.src} alt={band.alt} fill sizes="100vw" className="object-cover" />
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgb(12_13_14/.7),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1440px] px-(--shell-pad) pb-[clamp(24px,4vw,48px)] text-white">
          <p className="text-[12.5px] font-semibold tracking-[0.18em] text-white/75 uppercase">Under one roof</p>
          <p className="mt-2 max-w-[22ch] font-headline text-[clamp(28px,3.6vw,52px)] leading-[1.05] font-semibold tracking-[-0.02em]">
            Cutting, stitching, lasting and packing <em className="font-normal">on one floor.</em>
          </p>
        </div>
      </section>

      {/* the rooms behind the floor */}
      <section aria-labelledby="h-rooms" className="mt-sec">
        <SectionHead id="h-rooms" eyebrow="Inside the factory" title={<>The rooms <em>behind the line.</em></>} />
        <div className="grid gap-3.5 lg:grid-cols-3">
          {ROOMS.map((r) => {
            const [main, ...more] = aboutPhotos(r.group);
            return (
              <article key={r.group} className="flex flex-col overflow-hidden rounded-card bg-tile">
                <span className="relative block aspect-[16/10] overflow-hidden bg-photo">
                  <Image src={main.src} alt={main.alt} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                </span>
                {more.length > 0 && (
                  <ul className="grid grid-cols-3 gap-1.5 px-1.5 pt-1.5">
                    {more.map((p) => (
                      <li key={p.slug} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-photo">
                        <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 11vw, 33vw" className="object-cover" />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="p-5">
                  <h3 className="text-[17px] font-semibold">{r.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{r.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* the floor moving */}
      <section aria-labelledby="h-video" className="mt-sec">
        <SectionHead id="h-video" eyebrow="Walk the floor" title={<>See the line <em>at work.</em></>} />
        <div className="grid items-start gap-3.5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <figure className="overflow-hidden rounded-card bg-ink">
            <AboutVideo src={ABOUT_VIDEOS.factoryWalk.src} poster={ABOUT_VIDEOS.factoryWalk.poster} label="A walk along the assembly line" className="aspect-video w-full object-cover" />
            <figcaption className="bg-tile px-5 py-3.5 text-[14px] text-ink-2">Along the assembly line</figcaption>
          </figure>
          <figure className="overflow-hidden rounded-card bg-ink">
            <AboutVideo src={ABOUT_VIDEOS.sewingLine.src} poster={ABOUT_VIDEOS.sewingLine.poster} label="The sewing floor" className="aspect-[3/4] w-full object-cover" />
            <figcaption className="bg-tile px-5 py-3.5 text-[14px] text-ink-2">The sewing floor</figcaption>
          </figure>
        </div>
      </section>

      {/* everything else from the floor */}
      <section aria-labelledby="h-floor" className="mt-sec">
        <SectionHead id="h-floor" eyebrow="Production" title={<>On the <em>factory floor.</em></>} sub="Lines, machines, packing and the people who run them. Tap a photo to see it large." />
        <AboutGallery photos={aboutPhotos("gallery")} shown={12} />
      </section>

      {/* the showroom */}
      <section aria-labelledby="h-showroom" className="mt-sec">
        <div className="bleed relative h-[clamp(380px,56vw,720px)] overflow-hidden">
          <Image src={wide.src} alt={wide.alt} fill sizes="100vw" className="object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgb(12_13_14/.62),transparent_65%)]" />
          <div className="absolute inset-0 mx-auto flex max-w-[1440px] flex-col justify-center px-(--shell-pad) text-white">
            <p className="text-[12.5px] font-semibold tracking-[0.18em] text-white/75 uppercase">The showroom</p>
            <h2 id="h-showroom" className="mt-2 max-w-[16ch] font-headline text-[clamp(30px,4vw,56px)] leading-[1.04] font-semibold tracking-[-0.02em]">
              Every style on the shelf, <em className="font-normal">in one visit.</em>
            </h2>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-relaxed text-white/85">Handle the range, compare leathers and pick your styles with the trade desk beside you.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <OpenInquiryButton className="btn bg-white text-ink hover:bg-white/90">
                Book a showroom visit <Icon name="arrow" />
              </OpenInquiryButton>
              <Link href="/meet" className="btn text-white ring-1 ring-white/40 hover:bg-white/10">
                Video tours and trade shows
              </Link>
            </div>
          </div>
        </div>
        <AboutGallery photos={aboutPhotos("showroom").filter((p) => p.slug !== "showroom-wide")} shown={8} className="mt-4" />
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
