"use client";

import { useEffectsOn } from "./effects";
import { useReducedMotion, useShownSeason } from "./live";
import { DEFAULT_SEASON, type SeasonId } from "@/lib/season";

/**
 * Normal Polished Background for the entire site.
 * Replaces the heavy 3D landscape with a clean, high-end editorial canvas:
 * 1. A smooth, ambient multi-gradient wash tailored precisely to the active season's palette.
 * 2. Subtle, tasteful seasonal vector graphics (snowflakes for winter, blossom petals for spring,
 *    sunburst & caustics for summer, gentle rain streaks & ripples for monsoon, fluttering leaves
 *    for autumn, and sparkling starbursts for holiday).
 * 3. Smooth transitions when switching seasons; fully respects reduced motion and effects toggle.
 */
export function SeasonBackground() {
  const shownSeason = useShownSeason();
  const season: SeasonId = shownSeason ?? DEFAULT_SEASON;
  const effectsOn = useEffectsOn();
  const reduced = useReducedMotion();
  const animated = effectsOn && !reduced;

  return (
    <aside
      aria-hidden="true"
      data-season-bg={season}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Base smooth ambient color gradient mesh matching the season */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(55% 45% at 90% 12%, var(--aurora-a, rgb(160 196 214 / 0.25)) 0%, transparent 70%),
            radial-gradient(45% 40% at 10% 40%, var(--aurora-b, rgb(232 206 176 / 0.22)) 0%, transparent 70%),
            radial-gradient(50% 45% at 80% 80%, var(--aurora-c, rgb(196 178 220 / 0.18)) 0%, transparent 70%),
            linear-gradient(180deg, #ffffff 0%, var(--color-frost, #f5f8fa) 45%, var(--color-sky, #edf3f7) 100%)
          `,
        }}
      />

      {/* Subtle editorial luminous wash */}
      <div
        className="absolute inset-0 opacity-60 mix-blend-multiply transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 0%, transparent 40%, var(--color-ice, #e5eef3) 100%)`,
        }}
      />

      {/* Seasonal Graphic Theme Layer */}
      <div
        className={`absolute inset-0 size-full transition-opacity duration-700 ${
          animated ? "" : "motion-pause"
        }`}
      >
        {season === "winter" && <WinterGraphics animated={animated} />}
        {season === "spring" && <SpringGraphics animated={animated} />}
        {season === "summer" && <SummerGraphics animated={animated} />}
        {season === "rainy" && <RainyGraphics animated={animated} />}
        {season === "autumn" && <AutumnGraphics animated={animated} />}
        {season === "holiday" && <HolidayGraphics animated={animated} />}
      </div>
    </aside>
  );
}

/* =========================================================================
   1. WINTER: Delicate geometric snowflakes & soft ice crystal sparkles
   ========================================================================= */
function WinterGraphics({ animated }: { animated: boolean }) {
  return (
    <div className="absolute inset-0 size-full">
      {/* Top right crystalline snowflake */}
      <div
        className={`absolute top-[10%] right-[8%] size-11 text-[#78a4be]/45 ${
          animated ? "animate-[season-drift-float_14s_ease-in-out_infinite]" : ""
        }`}
      >
        <SnowflakeSvg />
      </div>

      {/* Mid-left drifting snowflake */}
      <div
        className={`absolute top-[38%] left-[6%] size-8 text-[#6898b4]/35 ${
          animated ? "animate-[season-drift-float_18s_ease-in-out_infinite_reverse]" : ""
        }`}
      >
        <SnowflakeSvg />
      </div>

      {/* Lower right small snowflake */}
      <div
        className={`absolute top-[68%] right-[14%] size-6 text-[#78a4be]/40 ${
          animated ? "animate-[season-drift-float_16s_ease-in-out_infinite_2s]" : ""
        }`}
      >
        <SnowflakeSvg />
      </div>

      {/* Upper left subtle crystal */}
      <div
        className={`absolute top-[22%] left-[16%] size-7 text-[#78a4be]/30 ${
          animated ? "animate-[season-drift-float_20s_ease-in-out_infinite_4s]" : ""
        }`}
      >
        <SnowflakeSvg />
      </div>

      {/* Subtle ice sparkle stars */}
      <span
        className={`absolute top-[28%] right-[26%] block size-3 text-[#2d5d6f]/35 ${
          animated ? "animate-[season-star-twinkle_4s_ease-in-out_infinite]" : ""
        }`}
      >
        <Star4Svg />
      </span>
      <span
        className={`absolute top-[52%] left-[18%] block size-2.5 text-[#2d5d6f]/25 ${
          animated ? "animate-[season-star-twinkle_5s_ease-in-out_infinite_1.5s]" : ""
        }`}
      >
        <Star4Svg />
      </span>
      <span
        className={`absolute top-[82%] right-[35%] block size-2 text-[#2d5d6f]/30 ${
          animated ? "animate-[season-star-twinkle_4.5s_ease-in-out_infinite_3s]" : ""
        }`}
      >
        <Star4Svg />
      </span>
    </div>
  );
}

function SnowflakeSvg() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="size-full">
      {/* 6 radial main arms */}
      <line x1="50" y1="10" x2="50" y2="90" />
      <line x1="15.36" y1="30" x2="84.64" y2="70" />
      <line x1="15.36" y1="70" x2="84.64" y2="30" />
      {/* Central ring */}
      <circle cx="50" cy="50" r="8" strokeWidth="2" />
      {/* Arm 1 branches (top & bottom) */}
      <path d="M42 22 L50 30 L58 22" />
      <path d="M42 78 L50 70 L58 78" />
      {/* Arm 2 branches */}
      <path d="M24 38 L32 43 L29 52" />
      <path d="M76 62 L68 57 L71 48" />
      {/* Arm 3 branches */}
      <path d="M29 48 L32 57 L24 62" />
      <path d="M71 52 L68 43 L76 38" />
    </svg>
  );
}

/* =========================================================================
   2. SPRING: Cherry blossom petal drift & delicate botanical sprig
   ========================================================================= */
function SpringGraphics({ animated }: { animated: boolean }) {
  return (
    <div className="absolute inset-0 size-full">
      {/* Subtle cherry blossom corner branch in upper right */}
      <div className="absolute -top-3 right-0 w-[clamp(140px,18vw,260px)] opacity-55">
        <svg viewBox="0 0 160 120" fill="none" className="size-full">
          {/* Gentle curved branch */}
          <path
            d="M160 10 C125 15 95 35 60 70"
            stroke="#8a6850"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* Leaves */}
          <path d="M120 22 C125 15 132 18 131 27 C125 28 121 26 120 22Z" fill="#88b56f" opacity="0.65" />
          <path d="M85 45 C78 40 73 45 76 52 C82 52 86 49 85 45Z" fill="#9ec985" opacity="0.65" />
          {/* Flower 1 */}
          <g transform="translate(60 70)">
            <circle cx="0" cy="-6" r="5" fill="#f4bcc9" opacity="0.75" />
            <circle cx="5.7" cy="-1.8" r="5" fill="#f4bcc9" opacity="0.75" />
            <circle cx="3.5" cy="4.8" r="5" fill="#f4bcc9" opacity="0.75" />
            <circle cx="-3.5" cy="4.8" r="5" fill="#f4bcc9" opacity="0.75" />
            <circle cx="-5.7" cy="-1.8" r="5" fill="#f4bcc9" opacity="0.75" />
            <circle cx="0" cy="0" r="2.5" fill="#e67e9b" opacity="0.8" />
            <circle cx="0" cy="0" r="1" fill="#fff4cf" />
          </g>
          {/* Flower 2 */}
          <g transform="translate(105 28) scale(0.75)">
            <circle cx="0" cy="-6" r="5" fill="#f7c8d3" opacity="0.75" />
            <circle cx="5.7" cy="-1.8" r="5" fill="#f7c8d3" opacity="0.75" />
            <circle cx="3.5" cy="4.8" r="5" fill="#f7c8d3" opacity="0.75" />
            <circle cx="-3.5" cy="4.8" r="5" fill="#f7c8d3" opacity="0.75" />
            <circle cx="-5.7" cy="-1.8" r="5" fill="#f7c8d3" opacity="0.75" />
            <circle cx="0" cy="0" r="2.5" fill="#e67e9b" opacity="0.8" />
          </g>
        </svg>
      </div>

      {/* Floating sakura petals with gentle fluttering sway */}
      <div
        className={`absolute top-[16%] right-[22%] size-5 text-[#f2b3c2]/60 ${
          animated ? "animate-[season-petal-flutter_12s_ease-in-out_infinite]" : ""
        }`}
      >
        <PetalSvg />
      </div>
      <div
        className={`absolute top-[38%] right-[10%] size-4 text-[#f0a9bb]/50 ${
          animated ? "animate-[season-petal-flutter_15s_ease-in-out_infinite_2.5s]" : ""
        }`}
      >
        <PetalSvg />
      </div>
      <div
        className={`absolute top-[56%] left-[8%] size-4.5 text-[#f2b3c2]/55 ${
          animated ? "animate-[season-petal-flutter_14s_ease-in-out_infinite_5s]" : ""
        }`}
      >
        <PetalSvg />
      </div>
      <div
        className={`absolute top-[75%] right-[25%] size-3.5 text-[#f0a9bb]/45 ${
          animated ? "animate-[season-petal-flutter_17s_ease-in-out_infinite_1s]" : ""
        }`}
      >
        <PetalSvg />
      </div>
      <div
        className={`absolute top-[26%] left-[18%] size-3 text-[#f2b3c2]/40 ${
          animated ? "animate-[season-petal-flutter_19s_ease-in-out_infinite_3.5s]" : ""
        }`}
      >
        <PetalSvg />
      </div>
    </div>
  );
}

function PetalSvg() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className="size-full">
      <path d="M16 2 C22 8, 28 14, 24 22 C20 28, 12 28, 8 22 C4 14, 10 8, 16 2 Z" opacity="0.8" />
    </svg>
  );
}

/* =========================================================================
   3. SUMMER: Minimalist luxury solar burst, orbit lines & warm caustics
   ========================================================================= */
function SummerGraphics({ animated }: { animated: boolean }) {
  return (
    <div className="absolute inset-0 size-full">
      {/* Geometric sunburst arc in the upper right corner */}
      <div
        className={`absolute -top-16 -right-16 size-[clamp(260px,34vw,440px)] text-[#cf9640]/25 ${
          animated ? "animate-[season-sun-rotate_70s_linear_infinite]" : ""
        }`}
      >
        <svg viewBox="0 0 400 400" fill="none" stroke="currentColor" className="size-full">
          {/* Concentric solar orbit circles */}
          <circle cx="200" cy="200" r="60" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
          <circle cx="200" cy="200" r="110" strokeWidth="1.2" opacity="0.4" />
          <circle cx="200" cy="200" r="160" strokeWidth="0.8" strokeDasharray="6 8" opacity="0.35" />
          {/* Radiating fine solar rays (12 rays) */}
          {Array.from({ length: 12 }, (_, i) => {
            const deg = i * 30;
            return (
              <line
                key={deg}
                x1="200"
                y1="75"
                x2="200"
                y2="45"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${deg} 200 200)`}
                opacity="0.7"
              />
            );
          })}
        </svg>
      </div>

      {/* Gentle solar ripple caustics in bottom left */}
      <div className="absolute bottom-[10%] left-[4%] size-[clamp(160px,22vw,280px)] text-[#9ec4c8]/25">
        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="size-full">
          <ellipse cx="100" cy="100" rx="80" ry="40" strokeWidth="1" strokeDasharray="4 8" opacity="0.4" />
          <ellipse cx="100" cy="100" rx="50" ry="25" strokeWidth="1" opacity="0.5" />
          <ellipse cx="100" cy="100" rx="20" ry="10" strokeWidth="1.2" opacity="0.6" />
        </svg>
      </div>

      {/* Floating warm solar motes */}
      <span
        className={`absolute top-[24%] right-[32%] block size-2.5 rounded-full bg-[#f2be6b]/40 blur-[0.5px] ${
          animated ? "animate-[season-star-twinkle_5s_ease-in-out_infinite]" : ""
        }`}
      />
      <span
        className={`absolute top-[48%] left-[14%] block size-2 rounded-full bg-[#f2be6b]/30 blur-[0.5px] ${
          animated ? "animate-[season-star-twinkle_6s_ease-in-out_infinite_2s]" : ""
        }`}
      />
      <span
        className={`absolute top-[72%] right-[22%] block size-3 rounded-full bg-[#9fd0d4]/35 blur-[0.5px] ${
          animated ? "animate-[season-star-twinkle_5.5s_ease-in-out_infinite_3.5s]" : ""
        }`}
      />
    </div>
  );
}

/* =========================================================================
   4. RAINY: Minimalist angled rain streak accents & soft water ripple rings
   ========================================================================= */
function RainyGraphics({ animated }: { animated: boolean }) {
  return (
    <div className="absolute inset-0 size-full">
      {/* Subtle angled minimalist rain streaks */}
      <div
        className={`absolute inset-0 text-[#3d7a82]/28 ${
          animated ? "animate-[season-rain-dash_6s_linear_infinite]" : ""
        }`}
      >
        <svg viewBox="0 0 800 600" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="size-full">
          <line x1="120" y1="40" x2="105" y2="90" strokeDasharray="8 16" />
          <line x1="280" y1="110" x2="265" y2="160" strokeDasharray="10 18" />
          <line x1="680" y1="70" x2="665" y2="120" strokeDasharray="8 20" />
          <line x1="450" y1="210" x2="435" y2="260" strokeDasharray="10 16" />
          <line x1="180" y1="340" x2="165" y2="390" strokeDasharray="8 18" />
          <line x1="620" y1="360" x2="605" y2="410" strokeDasharray="10 20" />
          <line x1="340" y1="450" x2="325" y2="500" strokeDasharray="8 16" />
          <line x1="720" y1="480" x2="705" y2="530" strokeDasharray="10 18" />
        </svg>
      </div>

      {/* Gentle expanding water ripple ring in bottom-left */}
      <div
        className={`absolute bottom-[14%] left-[10%] size-28 text-[#2a6266]/30 ${
          animated ? "animate-[season-ripple-expand_5s_ease-out_infinite]" : ""
        }`}
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="size-full">
          <circle cx="50" cy="50" r="38" strokeWidth="1.2" opacity="0.4" />
          <circle cx="50" cy="50" r="22" strokeWidth="1.4" opacity="0.6" />
          <circle cx="50" cy="50" r="6" strokeWidth="1.6" opacity="0.8" />
        </svg>
      </div>

      {/* Gentle expanding water ripple ring in upper-right */}
      <div
        className={`absolute top-[18%] right-[16%] size-24 text-[#2a6266]/25 ${
          animated ? "animate-[season-ripple-expand_5.5s_ease-out_infinite_2.5s]" : ""
        }`}
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="size-full">
          <circle cx="50" cy="50" r="36" strokeWidth="1.2" opacity="0.4" />
          <circle cx="50" cy="50" r="20" strokeWidth="1.4" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}

/* =========================================================================
   5. AUTUMN: Fluttering golden maple/oak leaves & wind breeze arcs
   ========================================================================= */
function AutumnGraphics({ animated }: { animated: boolean }) {
  return (
    <div className="absolute inset-0 size-full">
      {/* Maple Leaf 1 - top right */}
      <div
        className={`absolute top-[12%] right-[12%] size-9 text-[#bd6a2c]/50 ${
          animated ? "animate-[season-leaf-sway_14s_ease-in-out_infinite]" : ""
        }`}
      >
        <MapleLeafSvg />
      </div>

      {/* Oak Leaf 2 - mid left */}
      <div
        className={`absolute top-[36%] left-[8%] size-8 text-[#d48e35]/45 ${
          animated ? "animate-[season-leaf-sway_17s_ease-in-out_infinite_reverse_2s]" : ""
        }`}
      >
        <OakLeafSvg />
      </div>

      {/* Maple Leaf 3 - mid right */}
      <div
        className={`absolute top-[58%] right-[18%] size-7 text-[#a64828]/45 ${
          animated ? "animate-[season-leaf-sway_16s_ease-in-out_infinite_4s]" : ""
        }`}
      >
        <MapleLeafSvg />
      </div>

      {/* Small Leaf 4 - bottom left */}
      <div
        className={`absolute top-[78%] left-[14%] size-6 text-[#bd6a2c]/40 ${
          animated ? "animate-[season-leaf-sway_18s_ease-in-out_infinite_reverse_1s]" : ""
        }`}
      >
        <OakLeafSvg />
      </div>

      {/* Subtle wind curve in upper corner */}
      <div className="absolute top-[8%] right-[22%] w-48 text-[#8f431b]/20">
        <svg viewBox="0 0 180 60" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="size-full">
          <path d="M10 40 C60 10, 110 50, 160 20" strokeDasharray="5 7" />
        </svg>
      </div>
    </div>
  );
}

function MapleLeafSvg() {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className="size-full">
      <path
        d="M32 4 L36 18 L46 12 L42 24 L56 26 L46 34 L54 44 L40 42 L34 56 L30 56 L32 42 L18 44 L26 34 L16 26 L30 24 L26 12 L36 18 Z"
        opacity="0.8"
      />
      <line x1="32" y1="12" x2="32" y2="60" stroke="#682c0f" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function OakLeafSvg() {
  return (
    <svg viewBox="0 0 48 64" fill="currentColor" className="size-full">
      <path
        d="M24 4 C28 10, 38 12, 34 20 C38 24, 40 32, 34 38 C38 42, 36 50, 28 54 L24 60 L20 54 C12 50, 10 42, 14 38 C8 32, 10 24, 14 20 C10 12, 20 10, 24 4 Z"
        opacity="0.8"
      />
      <line x1="24" y1="8" x2="24" y2="60" stroke="#78421b" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* =========================================================================
   6. HOLIDAY: Twinkling 8-point starbursts & festive champagne sparkle lights
   ========================================================================= */
function HolidayGraphics({ animated }: { animated: boolean }) {
  return (
    <div className="absolute inset-0 size-full">
      {/* Elegant draped festive golden lights/ribbon along upper edge */}
      <div className="absolute top-0 right-0 w-[clamp(180px,26vw,360px)] opacity-60">
        <svg viewBox="0 0 240 80" fill="none" className="size-full">
          <path d="M0 10 Q60 55 120 18 Q180 50 240 10" stroke="#cf9c48" strokeWidth="1.2" opacity="0.6" />
          {/* Light baubles */}
          <circle cx="45" cy="34" r="3" fill="#e8bb58" />
          <circle cx="85" cy="38" r="3.2" fill="#c44360" />
          <circle cx="150" cy="36" r="3" fill="#e8bb58" />
          <circle cx="195" cy="34" r="3.2" fill="#c44360" />
        </svg>
      </div>

      {/* Twinkling 8-pointed starbursts */}
      <div
        className={`absolute top-[14%] right-[16%] size-9 text-[#d8a846]/55 ${
          animated ? "animate-[season-star-twinkle_3.8s_ease-in-out_infinite]" : ""
        }`}
      >
        <Star8Svg />
      </div>

      <div
        className={`absolute top-[34%] left-[10%] size-7 text-[#c24862]/45 ${
          animated ? "animate-[season-star-twinkle_4.4s_ease-in-out_infinite_1.4s]" : ""
        }`}
      >
        <Star8Svg />
      </div>

      <div
        className={`absolute top-[56%] right-[12%] size-8 text-[#d8a846]/50 ${
          animated ? "animate-[season-star-twinkle_4.8s_ease-in-out_infinite_2.8s]" : ""
        }`}
      >
        <Star8Svg />
      </div>

      <div
        className={`absolute top-[76%] left-[18%] size-6 text-[#d8a846]/40 ${
          animated ? "animate-[season-star-twinkle_4.2s_ease-in-out_infinite_0.8s]" : ""
        }`}
      >
        <Star4Svg />
      </div>
    </div>
  );
}

function Star8Svg() {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" className="size-full">
      <path d="M20 0 L22.5 14 L36.5 10 L26 20 L36.5 30 L22.5 26 L20 40 L17.5 26 L3.5 30 L14 20 L3.5 10 L17.5 14 Z" opacity="0.85" />
    </svg>
  );
}

function Star4Svg() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className="size-full">
      <path d="M16 0 L18.5 12 L30 16 L18.5 20 L16 32 L13.5 20 L2 16 L13.5 12 Z" opacity="0.85" />
    </svg>
  );
}
