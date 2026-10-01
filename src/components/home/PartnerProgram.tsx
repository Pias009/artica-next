import { Icon, type IconName } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { Reveal } from "../Reveal";

const PERKS: [IconName, string, string][] = [
  ["percent", "Tier pricing", "from 1,000 pairs"],
  ["bolt", "Priority", "production slots"],
  ["tag", "Private label", "and custom boxes"],
  ["chat", "Dedicated", "account manager"],
];

export function PartnerProgram() {
  return (
    <Reveal
      as="section"
      id="partner"
      aria-labelledby="h-partner"
      className="relative mt-[clamp(28px,4vw,44px)] grid scroll-mt-6 items-center gap-3.5 overflow-hidden rounded-shell border border-line/60 bg-linear-100 from-tile to-chip-hover p-[22px] shadow-soft md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[260px_minmax(0,1fr)_auto] lg:py-7 lg:pr-9 lg:pl-6"
    >
      <div data-reveal className="relative grid h-[150px] place-items-center md:h-[190px]" aria-hidden="true">
        <Carton />
      </div>
      <div data-reveal>
        <div className="flex items-center gap-2 mb-1">
          <span className="mono-label rounded-md bg-accent/10 px-2 py-0.5 text-[9.5px] font-bold text-accent">
            TIER 1 RETAILER ALLIANCE
          </span>
          <span className="mono-label text-[10px] text-muted hidden sm:inline">[ PRIORITY SLOTS ]</span>
        </div>
        <h2 id="h-partner" className="text-[clamp(20px,2.2vw,28px)] font-extrabold tracking-[-.02em] uppercase">
          Join the ARTICA Partner Program
        </h2>
        <p className="mt-1 text-sm text-ink-2">Exclusive volume tiers, dedicated capacity, and pre-season sampling for trade partners.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {PERKS.map(([icon, a, b]) => (
            <div key={a} className="flex items-center gap-2.5 rounded-xl border border-line/60 bg-surface/80 px-3 py-2 text-xs leading-tight text-ink shadow-xs">
              <i className="grid size-[28px] flex-none place-items-center rounded-lg bg-accent/10 text-accent">
                <Icon name={icon} className="size-[14px]" />
              </i>
              <span>
                <b>{a}</b>
                <span className="block text-[11px] text-muted">{b}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div data-reveal className="flex flex-col items-stretch gap-2 md:col-span-full lg:col-span-1 lg:items-center">
        <OpenInquiryButton buyerType="Private label brand" className="btn btn-dark shadow-sm">
          Become a partner
        </OpenInquiryButton>
        <small className="text-center font-mono text-[10.5px] text-muted">VERIFIED TRADE BUYERS ONLY</small>
      </div>
    </Reveal>
  );
}

function Carton() {
  return (
    <svg viewBox="0 0 260 180" className="h-auto w-[200px] -rotate-6 drop-shadow-[0_16px_18px_rgb(29_30_25/.2)] md:w-[250px]">
      <path d="M20 58 L130 22 L240 58 L130 94 Z" fill="var(--color-kraft)" />
      <path d="M20 58 L130 94 L130 172 L20 136 Z" fill="var(--color-kraft-d)" />
      <path d="M130 94 L240 58 L240 136 L130 172 Z" fill="var(--color-kraft)" />
      <path d="M75 40 L185 76" stroke="#8F7049" strokeWidth="7" opacity=".45" />
      <g transform="translate(146 92) skewY(-18)">
        <rect width="78" height="46" rx="3" fill="var(--color-label)" />
        <text x="7" y="13" fontFamily="var(--font-manrope),Arial" fontSize="8" fontWeight="800" fill="#1D1E19" letterSpacing="1.2">
          ARTICA
        </text>
        <text x="7" y="22" fontFamily="var(--font-manrope),Arial" fontSize="5.5" fontWeight="600" fill="#55564E">
          12 PRS · US 7–13
        </text>
        <g fill="#1D1E19">
          {[
            [7, 1.2], [10, 2.4], [14, 1], [16.5, 1.8], [20, 1], [22.5, 2.6], [27, 1.2],
            [30, 1], [32.5, 2], [36, 1.2], [39, 2.6], [43, 1], [45.5, 1.6], [49, 1],
          ].map(([x, w]) => (
            <rect key={x} x={x} y="28" width={w} height="12" />
          ))}
        </g>
      </g>
      <g transform="translate(36 102) skewY(18)" opacity=".85">
        <text x="0" y="0" fontFamily="var(--font-manrope),Arial" fontSize="7" fontWeight="800" fill="#5E4830" letterSpacing="1.5">
          THIS SIDE UP ↑
        </text>
      </g>
    </svg>
  );
}
