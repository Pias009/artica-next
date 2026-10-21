import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Page opening: breadcrumb, a calm sentence-case title and one supporting line.
 * `eyebrow` is accepted for existing pages but intentionally not rendered (the title carries the page).
 * `tone="clear"` drops the sky band so the intro sits on a page-wide colour field (the glass catalog).
 * `aside` fills the right-hand side on wide screens; `children` sit under the text.
 */
export function PageIntro({
  crumbs,
  title,
  text,
  tone = "sky",
  aside,
  children,
}: {
  crumbs: { href?: string; label: string }[];
  eyebrow?: string;
  title: string;
  text?: string;
  tone?: "sky" | "clear";
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`bleed px-(--shell-pad) pt-10 md:pt-14 ${tone === "sky" ? "mb-12 bg-sky pb-14 md:pb-20" : "mb-8 pb-2 md:pb-4"}`}>
      <div className={`wrap ${aside ? "grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-12" : ""}`}>
        <div>
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
          {children}
        </div>
        {aside}
      </div>
    </div>
  );
}
