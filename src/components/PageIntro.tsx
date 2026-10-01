import Link from "next/link";
import { Fragment } from "react";

export function PageIntro({
  crumbs,
  eyebrow,
  title,
  text,
}: {
  crumbs: { href?: string; label: string }[];
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="bg-studio mb-6 rounded-shell px-[clamp(20px,4vw,44px)] py-[clamp(24px,4vw,40px)]">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-studio-ink-2">
        {crumbs.map((c, i) => (
          <Fragment key={c.label}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {c.label}
              </span>
            )}
          </Fragment>
        ))}
      </nav>
      {eyebrow && (
        <span className="glass mb-3 inline-block rounded-full px-3.5 py-2 text-[11px] font-bold tracking-[.14em] text-studio-ink-2 uppercase">
          {eyebrow}
        </span>
      )}
      <h1 className="text-[clamp(30px,5vw,52px)] leading-none font-extrabold tracking-[-.02em] uppercase">{title}</h1>
      {text && <p className="mt-3 max-w-[52ch] text-[15px] text-studio-ink-2">{text}</p>}
    </div>
  );
}
