import Image from "next/image";
import Link from "next/link";
import { Icon } from "../Icon";
import { OpenInquiryButton } from "../OpenInquiryButton";
import { ArrowLink } from "../ui/SectionHead";
import { byId, PRIVATE_LABEL_MIN } from "@/lib/products";

const POINTS = ["Your logo on the zip pull, insole and box", "Choose from proven lasts and outsoles", "Tier pricing from 1,000 pairs"];

/** Private label: the boot wears your tag, the carton carries your name. */
export function PrivateLabel() {
  const p = byId.p05;
  return (
    <section id="partner" aria-labelledby="h-partner" className="mt-sec scroll-mt-24">
      <div className="grid items-center gap-10 overflow-hidden rounded-shell bg-sand md:grid-cols-2">
        <div className="px-[clamp(24px,5vw,72px)] pt-12 md:py-16">
          <h2 id="h-partner" className="type-section max-w-[14ch]">
            Your brand on our boots.
          </h2>
          <p className="mt-4 max-w-[40ch] text-[17px] text-ink-2">
            Private label from {PRIVATE_LABEL_MIN} pairs per style, made on the same lines as the ARTICA range.
          </p>
          <ul className="mt-8 grid gap-3">
            {POINTS.map((t) => (
              <li key={t} className="flex items-start gap-3 text-[16px]">
                <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-white text-ink">
                  <Icon name="check" className="size-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <OpenInquiryButton buyerType="Private label brand" className="btn btn-dark">
              Start a private-label brief
            </OpenInquiryButton>
            <Link href="/private-label">
              <ArrowLink>How it works</ArrowLink>
            </Link>
          </div>
        </div>

        <div data-reveal className="relative aspect-[1.1/1] md:h-full md:min-h-[520px]" aria-hidden="true">
          <Carton className="absolute bottom-[8%] left-[6%] w-[46%] -rotate-6" />
          <span className="absolute top-[10%] right-[6%] bottom-[22%] left-[30%]">
            <Image src={p.outer.src} alt="" fill sizes="(max-width: 864px) 70vw, 460px" className="object-contain drop-shadow-hero" />
          </span>
          <span className="absolute top-[24%] right-[16%] -rotate-[8deg] rounded-md bg-white px-3 py-2 text-[12px] font-bold tracking-[0.16em] shadow-float before:absolute before:top-1/2 before:-left-3 before:h-px before:w-3 before:bg-ink">
            YOUR LOGO
          </span>
        </div>
      </div>
    </section>
  );
}

function Carton({ className }: { className?: string }) {
  const bars = [
    [7, 1.2], [10, 2.4], [14, 1], [16.5, 1.8], [20, 1], [22.5, 2.6], [27, 1.2],
    [30, 1], [32.5, 2], [36, 1.2], [39, 2.6], [43, 1], [45.5, 1.6], [49, 1],
  ];
  return (
    <svg viewBox="0 0 260 180" className={className} style={{ filter: "drop-shadow(0 18px 18px rgb(18 20 22 / .16))" }}>
      <path d="M20 58 L130 22 L240 58 L130 94 Z" fill="var(--color-kraft)" />
      <path d="M20 58 L130 94 L130 172 L20 136 Z" fill="var(--color-kraft-d)" />
      <path d="M130 94 L240 58 L240 136 L130 172 Z" fill="var(--color-kraft)" />
      <path d="M75 40 L185 76" stroke="#8F7049" strokeWidth="7" opacity=".4" />
      <g transform="translate(146 92) skewY(-18)">
        <rect width="78" height="46" rx="3" fill="#fff" />
        <text x="7" y="14" fontFamily="var(--font-hanken),Arial" fontSize="7.5" fontWeight="700" fill="#121416" letterSpacing="0.6">
          YOUR BRAND
        </text>
        <text x="7" y="23" fontFamily="var(--font-hanken),Arial" fontSize="5.5" fontWeight="600" fill="#4B5157">
          12 PRS · US 7–13
        </text>
        <g fill="#121416">
          {bars.map(([x, w]) => (
            <rect key={x} x={x} y="28" width={w} height="12" />
          ))}
        </g>
      </g>
    </svg>
  );
}
