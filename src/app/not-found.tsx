import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";

/** Unmatched addresses and notFound() on the public site. It sits outside (site)/, so it brings the site chrome itself. */
export default function NotFound() {
  return (
    <SiteChrome>
      <div className="bg-studio grid place-items-center rounded-shell px-6 py-24 text-center">
        <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">404</p>
        <h1 className="mt-2 font-headline text-[clamp(28px,4vw,44px)] leading-tight font-semibold tracking-[-0.015em]">Page not found</h1>
        <p className="mt-2 max-w-[40ch] text-ink-2">This page or style may have moved. Browse the current line sheet instead.</p>
        <Link href="/catalog" className="btn btn-dark mt-6">
          View catalog
        </Link>
      </div>
    </SiteChrome>
  );
}
