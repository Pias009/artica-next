import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="ARTICA Wholesale, home" className="flex flex-none items-center gap-2.5 text-ink">
      <svg viewBox="0 0 40 26" aria-hidden="true" className="h-[22px] w-[34px]">
        <path d="M2 22 L16 4 L21 11 L25 6 L38 22 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M10 22 L16 14 L20 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <span className="flex items-baseline gap-2">
        <b className="text-[20px] leading-none font-bold tracking-[0.08em]">ARTICA</b>
        <small className="text-[12px] font-medium text-muted max-sm:hidden">Wholesale</small>
      </span>
    </Link>
  );
}
