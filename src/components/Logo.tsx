import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex flex-none items-center gap-2.5">
      <svg viewBox="0 0 40 26" aria-hidden="true" className="h-[26px] w-10">
        <path d="M2 22 L16 4 L21 11 L25 6 L38 22 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 22 L16 14 L20 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span>
        <b className="block text-[19px] leading-none font-extrabold tracking-[.06em]">ARTICA</b>
        <small className="mt-1 block text-[8.5px] font-bold tracking-[.24em] text-muted">WHOLESALE FOOTWEAR</small>
      </span>
    </Link>
  );
}
