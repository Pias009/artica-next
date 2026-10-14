import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { categoryOf, groupOf, inLine, LINE_LABEL, products, stylesIn, type Product, type ProductLine } from "@/lib/products";

/** The pair each plinth shows, by the kind that reads best for its line; falls back to the line's first style. */
const PICK: Record<ProductLine, string[]> = {
  women: ["Ankle boots", "Chelsea boots"],
  kids: ["Snow boots", "Ankle boots"],
  men: ["Lace-up boots", "Hiker boots"],
};
const sharpest = (p: Product) => groupOf(p).reduce((a, b) => (b.outer.w > a.outer.w ? b : a));
const pick = (line: ProductLine) => {
  const leads = stylesIn(line);
  const lead = PICK[line].map((c) => leads.find((p) => categoryOf(p) === c)).find(Boolean) ?? leads[0];
  return sharpest(lead);
};

/**
 * Left to right, three white marble blocks, the centre one taller. `grain` shifts the veining so no two blocks match; `view` is where the eye stands relative to each block, so the
 * left block shows its right side, the right block its left side, and all three show their tops.
 */
const PLINTHS: { line: ProductLine; tall?: boolean; view: string; grain: string }[] = [
  { line: "women", view: "300%", grain: "0 0" },
  { line: "kids", tall: true, view: "50%", grain: "-140px -60px" },
  { line: "men", view: "-200%", grain: "-260px -150px" },
];

/**
 * The headline as plum letters (the logo's colour) in a signage serif, mounted on the wall. The face carries a per-line
 * gradient (lit top, deeper base); the depth sits on a copy behind it: a thin plum edge in three steps, then a soft
 * shadow on the wall. In em, so the depth stays in proportion from phone to desktop.
 */
const HEADLINE = "Factory-direct footwear for your shelves.";
const PLUM_DEPTH = [
  "0 0.012em 0 #7c3a6a",
  "0 0.024em 0 #6d325d",
  "0 0.036em 0 #5e2a50",
  "0 0.08em 0.06em rgb(90 40 75 / .2)",
  "0 0.2em 0.28em rgb(90 40 75 / .12)",
].join(", ");

/** Five rows of the wall behind, filled from the whole range so it looks stocked. */
const WALL: Product[][] = [0, 1, 2, 3, 4].map((r) => products.filter((_, i) => i % 5 === r).slice(0, 13));

/**
 * The wall bends into a shallow concave curve: 13 vertical strips set on an arc of ARC degrees, each turned to face
 * the middle, so the shelves bow toward the viewer at the ends. Sizes are fractions of the wall's width (cqw), so the
 * curve holds at any screen size.
 */
const ARC = 40;
const COLS = WALL[0].length;
const arcRad = (ARC * Math.PI) / 180;
const STRIPS = Array.from({ length: COLS }, (_, c) => {
  const phi = ((c + 0.5) / COLS - 0.5) * arcRad;
  return {
    pairs: WALL.map((row) => row[c]).filter(Boolean),
    // centre position on the arc, and how far the strip comes forward, as shares of the wall width
    x: Math.sin(phi) / arcRad,
    z: (1 - Math.cos(phi)) / arcRad,
    turn: (-phi * 180) / Math.PI,
    /** light falls off a little toward the ends */
    shade: Math.abs(phi / (arcRad / 2)) * 0.07,
  };
});
const STRIP_W = (2 * Math.sin(arcRad / COLS / 2)) / arcRad;

/* Light on each face of a block, layered over the marble: top catches the ceiling spots, sides sit in shade. */
const LIGHT = {
  front: "bg-[linear-gradient(180deg,rgb(255_255_255/.3),rgb(255_255_255/0)_30%,rgb(40_42_48/0)_70%,rgb(40_42_48/.07))]",
  top: "bg-[linear-gradient(180deg,rgb(255_255_255/.25),rgb(255_255_255/.6))]",
  side: "bg-[linear-gradient(180deg,rgb(40_42_48/.12),rgb(40_42_48/.2))]",
};

/**
 * First view: one headline and one action over a stocked store wall; the wall stands on a tiled floor and three solid
 * blocks on that floor carry one pair per line (women, kids, men), each a direct way into that line. The wall is the
 * real catalogue photographed small, so nothing here is a stock picture.
 */
export function HeroStore() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="bleed relative isolate h-[calc(100svh-112px)] max-h-[960px] min-h-[640px] overflow-hidden max-md:h-[calc((100svh-112px)*.7)] max-md:min-h-[448px] bg-[linear-gradient(180deg,#f7f3ed_0%,#f2e8db_60%,#efe4d5_100%)] [--floor:69%] [--k:1] max-md:[--floor:73%] max-md:[--k:.7]"
    >
      {/* ceiling spots washing the wall */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(16%_45%_at_14%_6%,rgb(255_255_255/.75),rgb(255_255_255/0)),radial-gradient(16%_45%_at_38%_6%,rgb(255_255_255/.75),rgb(255_255_255/0)),radial-gradient(16%_45%_at_62%_6%,rgb(255_255_255/.75),rgb(255_255_255/0)),radial-gradient(16%_45%_at_86%_6%,rgb(255_255_255/.75),rgb(255_255_255/0))]"
      />

      {/* the stocked wall: an oak-lined recess with five shelves, sharp, bent into a gentle curve */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[6%] top-[27%] max-md:top-[34%] bottom-[calc(100%-var(--floor)+1.2%)] [container-type:inline-size] [perspective:1400px]"
      >
        <div className="absolute inset-0 [transform-style:preserve-3d]">
          {STRIPS.map((st, c) => (
            <div
              key={c}
              className="absolute top-0 left-1/2 h-full"
              style={{
                width: `calc(${(STRIP_W * 100).toFixed(4)}cqw + 1px)`,
                transform: `translateX(-50%) translate3d(calc(${(st.x * 100).toFixed(4)}cqw), 0, calc(${(st.z * 100).toFixed(4)}cqw)) rotateY(${st.turn.toFixed(3)}deg)`,
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#efd9bc,#e8d0b0)] shadow-[inset_0_14px_26px_rgb(110_75_35/.16),inset_0_-6px_14px_rgb(110_75_35/.08)]" />
              <div className="absolute inset-0 bg-[rgb(110_75_35)]" style={{ opacity: st.shade }} />
              <div className="relative flex h-full flex-col justify-around pt-[0.5%]">
                {st.pairs.map((p) => (
                  <div key={p.id}>
                    <div className="flex h-[clamp(12px,min(calc(4.6vh*var(--k)),4.2cqw),52px)] items-end justify-center">
                      <span className="relative block h-full" style={{ aspectRatio: `${p.outer.w} / ${p.outer.h}` }}>
                        <Image src={p.outer.src} alt="" fill sizes="140px" className="object-contain object-bottom drop-shadow-[0_3px_2px_rgb(60_40_15/.2)]" />
                      </span>
                    </div>
                    {/* oak shelf with a warm strip light beneath */}
                    <div className="h-[7px] bg-[linear-gradient(180deg,#f4e6cd_0_2px,#dbc19a_2px,#c9a97d)] shadow-[0_2px_2px_rgb(80_55_20/.25),0_12px_20px_rgb(255_210_150/.6)]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* the floor: the same white marble as the blocks, laid in large slabs receding to the wall, lit from the ceiling */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-(--floor) bottom-0 overflow-hidden bg-[#efeeeb] [perspective:520px] [perspective-origin:50%_-40%]">
        <span className="absolute -inset-x-[60%] top-0 h-[260%] origin-top [transform:rotateX(70deg)]">
          <span className="absolute inset-0 marble" />
          {/* slab joints */}
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgb(60_62_68/.1)_0_1px,transparent_1px),linear-gradient(180deg,rgb(60_62_68/.09)_0_1px,transparent_1px)] bg-[size:300px_300px] bg-[position:center_top]" />
        </span>
        {/* soft depth: dimmer toward the wall, a gloss of the ceiling spots on the polish */}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(120_105_85/.12),rgb(120_105_85/0)_45%)]" />
        <span className="absolute inset-0 bg-[radial-gradient(12%_70%_at_38%_0%,rgb(255_255_255/.55),rgb(255_255_255/0)),radial-gradient(12%_70%_at_62%_0%,rgb(255_255_255/.55),rgb(255_255_255/0))]" />
        {/* where the wall meets the floor */}
        <span className="absolute inset-x-0 top-0 h-5 bg-[linear-gradient(180deg,rgb(90_65_30/.16),rgb(90_65_30/0))]" />
      </div>

      {/* a clean light band for the headline, stopping above the shelves so they stay crisp */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[27%] max-md:h-[34%] bg-[linear-gradient(180deg,rgb(255_255_255/.8),rgb(255_255_255/.3)_70%,rgb(255_255_255/0))]" />

      {/* headline and the one action */}
      <div className="relative z-[2] flex flex-col items-center px-(--shell-pad) pt-[clamp(24px,calc(4.6vh*var(--k)),64px)] text-center">
        <h1
          id="hero-title"
          className="relative max-w-[20ch] animate-rise-in font-headline text-[clamp(34px,4.9vw,76px)] leading-[1.08] font-semibold tracking-[-0.015em] text-balance motion-reduce:animate-none max-md:leading-[0.98] max-md:tracking-[-0.025em]"
        >
          {/* depth: a plum copy behind the face, carrying the edge and the wall shadow */}
          <span aria-hidden="true" className="absolute inset-0 text-[#8a3f76]" style={{ textShadow: PLUM_DEPTH }}>
            {HEADLINE}
          </span>
          {/* face: plum, lit from the ceiling, one gradient per line */}
          <span className="relative block bg-[linear-gradient(180deg,#b0609a_0%,#984080_55%,#7e3369_100%)] bg-[length:100%_1.08em] bg-clip-text text-transparent max-md:bg-[length:100%_0.98em]">
            {HEADLINE}
          </span>
        </h1>
        <OpenInquiryButton className="btn mt-[clamp(20px,calc(3.6vh*var(--k)),34px)] animate-rise-in max-md:mt-3.5 max-md:h-10 max-md:gap-2 max-md:px-5 max-md:text-[14px] bg-[#984080] text-white shadow-[0_3px_0_#6a2c59,0_14px_26px_-12px_rgb(110_45_95/.55)] transition-[background-color,box-shadow,translate] [animation-delay:90ms] hover:-translate-y-px hover:bg-[#87386f] active:translate-y-[2px] active:shadow-[0_1px_0_#6a2c59,0_8px_16px_-8px_rgb(110_45_95/.5)] motion-reduce:animate-none">
          Get wholesale pricing <Icon name="arrow" className="size-4" />
        </OpenInquiryButton>
      </div>

      {/* three blocks on the floor, one pair per line */}
      <nav aria-label="Shop by line" className="absolute inset-x-0 bottom-[clamp(12px,calc(2.6vh*var(--k)),32px)] z-[2] px-(--shell-pad)">
        <ul className="flex items-end justify-center gap-x-[clamp(14px,13vw,240px)]">
          {PLINTHS.map(({ line, tall, view, grain }, i) => {
            const p = pick(line);
            // the centre block stands further back on the floor (mb), so the side blocks come forward
            const size = {
              "--w": tall ? "clamp(66px,11vw,168px)" : "clamp(72px,12.5vw,190px)",
              "--d": "clamp(54px,7.5vw,112px)",
              "--h": tall ? "clamp(96px,calc(22vh*var(--k)),206px)" : "clamp(72px,calc(17vh*var(--k)),160px)",
              "--s": tall ? "clamp(70px,calc(15.5vh*var(--k)),150px)" : "clamp(66px,calc(16vh*var(--k)),156px)",
            } as CSSProperties;
            return (
              <li key={line} className={`animate-rise-in motion-reduce:animate-none ${tall ? "mb-[clamp(16px,calc(5vh*var(--k)),48px)] max-md:mb-1.5" : ""}`} style={{ animationDelay: `${180 + i * 100}ms` }}>
                <Link href={`/catalog?line=${line}`} className="group flex flex-col items-center outline-offset-8" style={size}>
                  <Block view={view} grain={grain}>
                    <Image
                      src={p.outer.src}
                      alt=""
                      fill
                      preload
                      sizes="(min-width: 54rem) 240px, 32vw"
                      className="object-contain object-bottom drop-shadow-[0_8px_6px_rgb(40_28_14/.25)]"
                    />
                  </Block>
                  {/* the way in, on the floor in front */}
                  <span className="mt-[clamp(14px,calc(2.6vh*var(--k)),26px)] text-[clamp(16px,1.6vw,22px)] font-semibold tracking-[-0.02em] text-[#3a2433]">{LINE_LABEL[line]}</span>
                  <span className="mt-0.5 inline-flex items-center gap-1.5 text-[clamp(13px,1.05vw,15px)] text-[#6f5a67] transition-colors group-hover:text-[#984080]">
                    {inLine(line).length} styles
                    <Icon name="arrow" className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}

/**
 * A solid marble block drawn in CSS 3D: front at the layout box, top and sides folding back by --d. The pair
 * stands halfway back on the top face, so perspective seats it on the block rather than in front of it.
 */
function Block({ view, grain, children }: { view: string; grain: string; children: ReactNode }) {
  const face = (light: string) => (
    <>
      <span className="absolute inset-0 marble" style={{ backgroundPosition: grain }} />
      <span className={`absolute inset-0 ${light}`} />
    </>
  );
  return (
    <span className="relative block [perspective:900px]" style={{ width: "var(--w)", height: "var(--h)", perspectiveOrigin: `${view} -160%` }}>
      {/* contact shadow on the floor, and a soft cast shadow falling back and right, away from the light */}
      <span aria-hidden="true" className="absolute -inset-x-[10%] -bottom-2.5 h-5 rounded-[50%] bg-[rgb(60_42_20/.32)] blur-[7px]" />
      <span aria-hidden="true" className="absolute right-[-26%] bottom-0 left-[18%] h-[38%] origin-bottom skew-x-[38deg] bg-[linear-gradient(0deg,rgb(60_42_20/.14),rgb(60_42_20/0))] blur-[6px]" />
      <span className="absolute inset-0 [transform-style:preserve-3d]">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 origin-left overflow-hidden" style={{ width: "var(--d)", transform: "rotateY(90deg)" }}>
          {face(LIGHT.side)}
        </span>
        <span aria-hidden="true" className="absolute inset-y-0 right-0 origin-right overflow-hidden" style={{ width: "var(--d)", transform: "rotateY(-90deg)" }}>
          {face(LIGHT.side)}
        </span>
        <span aria-hidden="true" className="absolute inset-x-0 top-0 origin-top overflow-hidden" style={{ height: "var(--d)", transform: "rotateX(-90deg)" }}>
          {face(LIGHT.top)}
          {/* where the pair rests on the top */}
          <span className="absolute inset-x-[16%] top-[42%] h-[22%] rounded-[50%] bg-[rgb(40_28_14/.3)] blur-[6px]" />
        </span>
        <span aria-hidden="true" className="absolute inset-0 overflow-hidden shadow-[inset_0_1px_0_rgb(255_255_255/.75),inset_1px_0_0_rgb(255_255_255/.3),inset_-1px_0_0_rgb(70_50_25/.12)]">
          {face(LIGHT.front)}
        </span>
        {/* the pair, standing halfway back on the top face */}
        <span
          className="absolute bottom-full left-1/2 block w-[132%] -translate-x-1/2 transition-[translate] duration-500 ease-soft group-hover:-translate-y-2"
          style={{ height: "var(--s)", transform: "translateZ(calc(var(--d) * -0.5))" }}
        >
          {children}
        </span>
      </span>
    </span>
  );
}
