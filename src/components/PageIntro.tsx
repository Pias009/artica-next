import Link from "next/link";
import { Fragment } from "react";

/**
 * Page opening: breadcrumb, a calm sentence-case title and one supporting line.
 * `eyebrow` is accepted for existing pages but intentionally not rendered (the title carries the page).
 */
export function PageIntro({
  crumbs,
  title,
  text,
}: {
  crumbs: { href?: string; label: string }[];
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="bleed mb-12 bg-sky px-(--shell-pad) pt-10 pb-14 md:pt-14 md:pb-20">
      <div className="wrap">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
          {crumbs.map((c, i) => (
            <Fragment key={c.label}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.href ? (
                <Link href={c.href} className="hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-ink">
                  {c.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
        <h1 className="max-w-[18ch] text-[clamp(40px,5.4vw,72px)] leading-[1.02] font-semibold tracking-[-0.04em]">{title}</h1>
        {text && <p className="mt-5 max-w-[52ch] text-[18px] text-ink-2">{text}</p>}
      </div>
    </div>
  );
}
