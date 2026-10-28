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
  const breadcrumb = (
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
  );
  const heading = <h1 className="max-w-[18ch] font-headline text-[clamp(40px,5.4vw,72px)] leading-[1.04] font-semibold tracking-[-0.02em]">{title}</h1>;

  return (
    <div data-deco={tone === "sky" ? "band" : undefined} className={`bleed relative isolate px-(--shell-pad) pt-10 md:pt-14 ${tone === "sky" ? "mb-12 overflow-hidden bg-sky pb-14 md:pb-20" : "mb-8 pb-2 md:pb-4"}`}>
      {aside ? (
        <div className="wrap grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-12">
          <div>
            {breadcrumb}
            {heading}
            {text && <p className="mt-5 max-w-[52ch] text-[18px] text-ink-2">{text}</p>}
            {children}
          </div>
          {aside}
        </div>
      ) : (
        // No picture: the title on the left and its line at the bottom right, so the band has no empty half.
        <div className="wrap">
          {breadcrumb}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
            {heading}
            {(text || children) && (
              <div className="lg:pb-2">
                {text && <p className="max-w-[46ch] text-[18px] text-ink-2">{text}</p>}
                {children}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
