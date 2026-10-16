import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { inLine, products, type ProductLine } from "@/lib/products";
import hiker from "../../../public/images/hero-boot-hiker-cut.webp";
import leather from "../../../public/images/hero-boot-leather-cut.webp";
import shearling from "../../../public/images/hero-boot-shearling-cut.webp";
import plate from "../../../public/images/hero-gallery-bg.jpg";

/**
 * First view, a sunlit gallery. The room is one photograph (hero-gallery-bg.jpg: the approved mockup with its copy,
 * labels and placeholder shoes removed, see design/hero-concepts/make_plate.py), so the window light, sun beams,
 * boxes and plinth shadows are real. On top: one premium studio boot per line (cut out of public/images/hero-boot-*.jpg,
 * see design/hero-concepts/cut_boots.py) standing on the empty plinths,
 * the plinth labels, and the copy, all live HTML.
 *
 * Everything on the stage is placed in the plate's own pixels (1600 x 875) and converted to cqw, so it stays locked
 * to the photograph at any width. Phones get the copy first, then the stage cropped in on the plinths.
 */

const PW = 1600; // plate width in px; all coordinates below are plate pixels
const u = (px: number) => `${(px / PW) * 100}cqw`;

/** Each plinth: where its top surface is in the plate, the pair that stands on it, and where its label goes. */
const PLINTHS: {
  line: ProductLine;
  n: string;
  shoe: StaticImageData;
  /** mirror the photo so every boot faces the same way */
  flip?: boolean;
  name: string;
  ink: string;
  /** centre x of the pair, the y it stands on, its height */
  stand: { x: number; y: number; h: number };
  label: { x: number; y: number };
  /** the clickable plinth: left, top, right, bottom */
  hit: [number, number, number, number];
}[] = [
  { line: "women", n: "01", shoe: shearling, flip: true, name: "Shearling-cuff suede boot", ink: "#8a5440", stand: { x: 946, y: 504, h: 168 }, label: { x: 856, y: 692 }, hit: [831, 320, 1064, 760] },
  { line: "men", n: "02", shoe: leather, name: "Leather work boot", ink: "#eef0e6", stand: { x: 1186, y: 409, h: 176 }, label: { x: 1102, y: 671 }, hit: [1064, 220, 1232, 740] },
  { line: "kids", n: "03", shoe: hiker, name: "Waterproof winter hiker", ink: "#4b6578", stand: { x: 1356, y: 530, h: 138 }, label: { x: 1282, y: 707 }, hit: [1232, 380, 1488, 775] },
];
const LABEL: Record<ProductLine, string> = { women: "WOMEN", men: "MEN", kids: "KIDS" };

export function HeroGallery() {
  return (
    <section id="hero" aria-labelledby="hero-title" className="bleed relative isolate overflow-hidden bg-[#efe3d4]">
      {/* past the plate's width the room carries on as a soft blur of itself, so nothing ends in a hard edge */}
      <Image src={plate} alt="" fill sizes="100vw" quality={40} aria-hidden="true" className="scale-110 object-cover blur-2xl max-md:hidden" />

      <div className="@container relative mx-auto w-full max-w-[1920px]">
        {/* the copy: its own block on phones, over the empty wall on larger screens */}
        <div className="relative z-[3] px-(--shell-pad) pt-8 pb-2 md:absolute md:top-[5.4cqw] md:left-[6.9cqw] md:p-0">
          <p className="animate-rise-in text-[12px] font-medium tracking-[0.2em] text-[#6b5f63] motion-reduce:animate-none md:text-[max(11px,1.12cqw)]">
            FW26 WHOLESALE COLLECTION
          </p>
          <h1
            id="hero-title"
            className="mt-3 animate-rise-in font-headline text-[clamp(34px,9vw,44px)] leading-[1.06] font-semibold tracking-[-0.012em] text-[#1d1a1b] [animation-delay:70ms] motion-reduce:animate-none md:mt-[1.15cqw] md:text-[max(30px,4.7cqw)] md:leading-[1.07]"
          >
            Factory-direct footwear
            <br className="max-md:hidden" /> built for your <em className="text-brand">shelves.</em>
          </h1>
          <div className="mt-6 flex animate-rise-in flex-wrap items-center gap-x-7 gap-y-2 [animation-delay:140ms] motion-reduce:animate-none md:mt-[1.7cqw] md:gap-x-[1.7cqw]">
            <OpenInquiryButton className="inline-flex h-12 items-center gap-2.5 rounded-[6px] bg-brand px-6 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgb(110_45_95/.7)] transition-colors hover:bg-brand-deep md:h-[max(44px,3.75cqw)] md:px-[max(20px,1.8cqw)] md:text-[max(14px,1.3cqw)]">
              Get wholesale pricing <Icon name="arrow" className="size-4" />
            </OpenInquiryButton>
            <Link href="/catalog" className="text-[15px] font-semibold text-[#1d1a1b] underline-offset-4 hover:underline md:text-[max(14px,1.3cqw)]">
              Browse {products.length} styles
            </Link>
          </div>
          <p className="mt-5 animate-rise-in text-[13px] text-[#6b5f63] [animation-delay:210ms] motion-reduce:animate-none md:mt-[1.5cqw] md:text-[max(12px,1.2cqw)]">
            From 300 pairs per style · Samples in 10 days · Door-to-door US &amp; Canada
          </p>
        </div>

        {/* the stage: on phones a window onto the plinth side of the room */}
        <div className="relative overflow-hidden max-md:aspect-[16/12]">
          <div className="@container relative w-full max-md:absolute max-md:right-0 max-md:bottom-0 max-md:w-[178%]">
            <Image src={plate} alt="" preload sizes="(min-width: 1920px) 1920px, (min-width: 54rem) 100vw, 178vw" className="block h-auto w-full" />

            <nav aria-label="Shop by line" className="absolute inset-0">
              {PLINTHS.map((pl, i) => (
                <Plinth key={pl.line} pl={pl} i={i} />
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

function Plinth({ pl, i }: { pl: (typeof PLINTHS)[number]; i: number }) {
  const { line, n, shoe, flip, name, ink, stand, label, hit } = pl;
  const w = (stand.h * shoe.width) / shoe.height;
  return (
    <Link
      href={`/catalog?line=${line}`}
      aria-label={`${LABEL[line]}: ${inLine(line).length} styles`}
      className="group absolute block outline-none"
      style={{ left: u(hit[0]), top: u(hit[1]), width: u(hit[2] - hit[0]), height: u(hit[3] - hit[1]) }}
    >
      {/* the pair, positioned in plate pixels relative to this link box */}
      <span
        className="absolute block animate-rise-in transition-transform duration-500 ease-soft group-hover:-translate-y-[0.45cqw] group-focus-visible:-translate-y-[0.45cqw] motion-reduce:animate-none"
        style={{ left: u(stand.x - w / 2 - hit[0]), top: u(stand.y - stand.h - hit[1]), width: u(w), height: u(stand.h), animationDelay: `${260 + i * 110}ms` }}
      >
        {/* contact shadow where it rests on the plinth, and a soft cast shadow falling left, away from the window */}
        <span aria-hidden="true" className="absolute right-[6%] -bottom-[0.18cqw] left-[4%] h-[0.5cqw] rounded-[50%] bg-[rgb(45_30_18/.45)] blur-[0.18cqw]" />
        <span aria-hidden="true" className="absolute right-[18%] -bottom-[0.35cqw] left-[-14%] h-[1.1cqw] rounded-[50%] bg-[rgb(60_40_22/.18)] blur-[0.5cqw]" />
        <Image
          src={shoe}
          alt=""
          fill
          quality={90}
          sizes="(min-width: 54rem) 20vw, 40vw"
          // a mirrored photo mirrors its shadow too, so it gets the opposite offset to still fall left
          className={`object-contain object-bottom ${flip ? "-scale-x-100 drop-shadow-[0.45cqw_0.25cqw_0.4cqw_rgb(55_38_22/.28)]" : "drop-shadow-[-0.45cqw_0.25cqw_0.4cqw_rgb(55_38_22/.28)]"}`}
        />
      </span>
      {/* label on the plinth face */}
      <span className="absolute block" style={{ left: u(label.x - hit[0]), top: u(label.y - hit[1]), color: ink }}>
        <span className="block text-[max(10px,1.2cqw)] leading-tight tracking-[0.02em] underline-offset-4 group-hover:underline group-focus-visible:underline">
          {n} / {LABEL[line]}
        </span>
        <span className="mt-[0.2cqw] block text-[0.92cqw] leading-tight opacity-90 max-md:hidden">{name}</span>
      </span>
    </Link>
  );
}
