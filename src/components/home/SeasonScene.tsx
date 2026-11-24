import Image from "next/image";
import type { CSSProperties } from "react";
import type { Product } from "@/lib/products";
import type { SeasonId } from "@/lib/season";

/** How many bits of weather each card has (petals, drops, leaves, flakes, sparkles). */
const BITS = 14;

/**
 * A spread that looks random but is the same on the server and every render (React wants render pure): where each
 * bit starts, how big it is, how long it takes and when it begins.
 */
function bits(seed: number) {
  return Array.from({ length: BITS }, (_, i) => {
    const r = (n: number) => ((i * 9301 + seed * 49297 + n * 233280) % 1000) / 1000;
    return {
      x: Math.round(r(1) * 100),
      size: 0.6 + r(2) * 0.8,
      dur: 5 + r(3) * 6,
      delay: -r(4) * 11,
      turn: Math.round(r(5) * 360),
      tone: i % 3,
    };
  });
}

/**
 * The top of a season card without a photo: the season's own sky, its weather moving across it (petals, sun and
 * heat, rain, leaves, snow, holiday lights and sparkles) and its shoes riding slowly along a thin shelf line. All of
 * it is CSS (globals.css, "Season scenes"): it pauses off screen and stands still for reduced motion.
 */
export function SeasonScene({ id, picks, index }: { id: SeasonId; picks: Product[]; index: number }) {
  const list = bits(index + 1);
  // the shoes twice over, so the row loops without a gap
  const row = [...picks, ...picks];
  return (
    <span data-scene={id} className="season-scene">
      {id === "summer" && <span aria-hidden="true" className="sp-sun sp-anim" />}
      {id === "holiday" && (
        <span aria-hidden="true" className="sp-lights">
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i} className="sp-light sp-anim" style={{ "--d": `${-(i * 0.37) % 1.6}s`, "--i": i } as CSSProperties} />
          ))}
        </span>
      )}
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {list.map((b, i) => (
          <span
            key={i}
            className="sp-bit sp-anim"
            data-tone={b.tone}
            style={{ "--x": `${b.x}%`, "--s": b.size, "--t": `${b.dur}s`, "--d": `${b.delay}s`, "--r": `${b.turn}deg` } as CSSProperties}
          />
        ))}
      </span>
      {/* the season's shoes on a shelf line, moving slowly; each card at its own pace so they never march in step */}
      <span aria-hidden="true" className="sp-shelf">
        <span className="sp-track sp-anim" style={{ "--dur": `${26 + index * 3}s` } as CSSProperties}>
          {row.map((p, i) => (
            <span key={`${p.id}-${i}`} className="relative h-[52px] w-[74px] shrink-0 sm:h-[58px] sm:w-[82px]">
              <Image src={p.outer.src} alt="" fill sizes="82px" className="object-contain mix-blend-multiply drop-shadow-[0_6px_6px_rgb(18_20_22/.18)]" />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
