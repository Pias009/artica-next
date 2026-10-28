"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { CartCount } from "./CartCount";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { LinePeek } from "./nav/LinePeek";
import { NavSearch } from "./nav/NavSearch";
import { SeasonSwitcher } from "./season/SeasonSwitcher";
import { COMPANY, tel } from "@/lib/company";
import { inLine, MOQ_PAIRS, stylesIn, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

type NavItem = { href: string; label: string; line?: ProductLine; opt?: boolean };

const NAV: NavItem[] = [
  { href: "/catalog?line=men", label: "Men", line: "men" },
  { href: "/catalog?line=women", label: "Women", line: "women" },
  { href: "/catalog?line=kids", label: "Kids", line: "kids" },
  { href: "/catalog", label: "All products" },
  { href: "/buyer-desk", label: "Buyer desk", opt: true },
  { href: "/shipping", label: "Shipping", opt: true },
  { href: "/about", label: "About", opt: true },
];

/** Mobile menu: the lines as photo tiles, then the pages as a list. */
const LINE_ITEMS = NAV.filter((n): n is NavItem & { line: ProductLine } => !!n.line);
const PAGE_ITEMS: NavItem[] = [
  ...NAV.filter((n) => !n.line && !n.opt),
  { href: "/buyer-desk", label: "Buyer desk" },
  { href: "/shipping", label: "Shipping" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

/** Below this the bar always shows; past it, scrolling down hides it and scrolling up brings it back. */
const REVEAL_ZONE = 140;
/** Pixels of travel in one direction before the bar reacts, so trackpad jitter doesn't flicker it. */
const SCROLL_SLACK = 8;
/** Hover intent: how long the pointer rests on a line before its preview opens, and the grace period on leaving. */
const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;

/** The raised glass pill that slides under the pointed-at nav link. */
type Mark = { left: number; width: number; on: boolean };
type Panel = { kind: "line"; line: ProductLine } | { kind: "search" } | null;

const MARK_INSET = 2;
const markAt = (a: HTMLElement): Mark => ({ left: a.offsetLeft + MARK_INSET, width: a.offsetWidth - MARK_INSET * 2, on: true });
/** Where the underline rests when nothing is pointed at: the open line preview, else the current page. */
const restingMark = (nav: HTMLElement | null) => {
  const a = nav?.querySelector<HTMLElement>("a[data-open]") ?? nav?.querySelector<HTMLElement>('a[aria-current="page"]');
  return a ? markAt(a) : null;
};

/** Tilt the floating bar a touch toward the pointer and move its sheen with it (mouse only, never under reduced motion). */
const TILT = ["--nrx", "--nry", "--nsx", "--nsy"];
function tiltBar(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--nrx", `${(-py * 3).toFixed(2)}deg`);
  el.style.setProperty("--nry", `${(px * 2.4).toFixed(2)}deg`);
  el.style.setProperty("--nsx", `${((px + 0.5) * 100).toFixed(1)}%`);
  el.style.setProperty("--nsy", `${((py + 0.5) * 100).toFixed(1)}%`);
}
function untiltBar(e: PointerEvent<HTMLElement>) {
  for (const v of TILT) e.currentTarget.style.removeProperty(v);
}

const isTyping = (el: Element | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mark, setMark] = useState<Mark>({ left: 0, width: 0, on: false });
  const [panel, setPanel] = useState<Panel>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const searchBtn = useRef<HTMLButtonElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openDrawer = useUI((s) => s.openDrawer);
  const pathname = usePathname();

  /* ---- scroll: float, hide on the way down, return on the way up ---- */
  useEffect(() => {
    let anchor = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current?.style.setProperty("scale", `${max > 0 ? Math.min(1, y / max) : 0} 1`);
      setScrolled(y > 8);
      if (y < REVEAL_ZONE) {
        setHidden(false);
        anchor = y;
      } else if (Math.abs(y - anchor) > SCROLL_SLACK) {
        setHidden(y > anchor);
        anchor = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ---- panels: line previews and search ---- */
  const later = (fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };
  const closePanel = () => {
    clearTimeout(timer.current);
    setPanel(null);
  };
  const openSearch = () => {
    clearTimeout(timer.current);
    setMenuOpen(false);
    setPanel({ kind: "search" });
  };
  const closeSearch = () => {
    closePanel();
    searchBtn.current?.focus({ preventScroll: true });
  };
  // Hovering another nav item swaps (or drops) the preview; search stays put until dismissed.
  const hoverItem = (n: NavItem) => {
    if (panel?.kind === "search") return;
    if (n.line) {
      const line = n.line;
      later(() => setPanel({ kind: "line", line }), panel ? 0 : OPEN_DELAY);
    } else if (panel) later(closePanel, CLOSE_DELAY);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // A new page closes everything.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setPanel(null);
    setMenuOpen(false);
  }

  // "/" or Ctrl/⌘+K opens search from anywhere; Esc closes whatever is open.
  const panelNow = useRef<Panel>(null);
  useEffect(() => {
    panelNow.current = panel;
  }, [panel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTyping(document.activeElement))) {
        e.preventDefault();
        clearTimeout(timer.current);
        setMenuOpen(false);
        setPanel({ kind: "search" });
      } else if (e.key === "Escape") {
        if (panelNow.current?.kind === "search") searchBtn.current?.focus({ preventScroll: true });
        clearTimeout(timer.current);
        setPanel(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Clicking outside the header closes an open panel.
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) closePanel();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [panel]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Slide the underline under whichever link is pointed at or focused; let it settle back when the pointer leaves.
  const pointing = useRef(false);
  const markTo = (e: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    if (a) setMark(markAt(a));
    if (e.type === "pointerover") pointing.current = true;
  };
  const markRest = () => {
    pointing.current = false;
    setMark((m) => restingMark(navRef.current) ?? { ...m, on: false });
  };

  // Re-seat the resting pill on navigation, when a preview opens or closes, and when the nav reflows (but never while
  // the pointer is on a link: the pill stays under it).
  const openLine = panel?.kind === "line" ? panel.line : null;
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(() => !pointing.current && setMark((m) => restingMark(nav) ?? { ...m, on: false }));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [pathname, openLine]);

  const floating = scrolled && !menuOpen;
  const tucked = hidden && !menuOpen && !panel;

  return (
    <>
      {/* the promise in the middle, the season the site is dressed for on the right */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-ink px-(--shell-pad) py-1 text-[13px] font-medium text-white max-sm:grid-cols-[1fr_auto]">
        <span aria-hidden="true" className="max-sm:hidden" />
        <p className="py-1.5 text-center max-sm:text-left">
          Samples in 10 days
          <span className="max-sm:hidden">
            <span className="mx-2 text-white/40">·</span> Door-to-door worldwide
          </span>
          <span className="max-md:hidden">
            <span className="mx-2 text-white/40">·</span> From 300 pairs per style
          </span>
          <span className="max-xl:hidden">
            <span className="mx-2 text-white/40">·</span> Trade buyers only
          </span>
        </p>
        <div className="justify-self-end">
          <SeasonSwitcher />
        </div>
      </div>

      <header
        ref={headerRef}
        data-deco="bar"
        data-floating={floating || undefined}
        onPointerLeave={() => panel?.kind === "line" && later(closePanel, CLOSE_DELAY)}
        onPointerEnter={() => panel?.kind === "line" && clearTimeout(timer.current)}
        className={clsx(
          "sticky top-0 z-30 [perspective:1400px] transition-[translate,padding] duration-500 ease-soft focus-within:translate-y-0!",
          floating ? "pt-2.5" : "pt-0",
          tucked && "-translate-y-[calc(100%+16px)]",
        )}
      >
        {/*
          The bar: a full-width sheet of frosted glass at the top of the page; once you scroll it lifts into a floating
          glass capsule (lit top edge, bevelled shadow) that leans a touch toward the pointer with a sheen following it.
        */}
        <div
          onPointerMove={floating ? tiltBar : undefined}
          onPointerLeave={untiltBar}
          className={clsx(
            "group/bar relative mx-auto overflow-hidden backdrop-blur-2xl backdrop-saturate-[1.8] transition-[max-width,border-radius,background-color,box-shadow,transform] duration-500 ease-soft [transform:rotateX(var(--nrx,0deg))_rotateY(var(--nry,0deg))]",
            floating
              ? "max-w-[min(1240px,calc(100%-24px))] rounded-[22px] bg-[linear-gradient(180deg,rgb(255_255_255/.82),rgb(255_255_255/.58))] shadow-[inset_0_1px_0_rgb(255_255_255/.95),inset_0_-1px_0_rgb(18_20_22/.06),0_0_0_1px_rgb(255_255_255/.55),0_2px_4px_rgb(18_20_22/.05),0_20px_44px_-20px_rgb(18_20_22/.38),0_44px_90px_-44px_rgb(122_52_112/.3)]"
              : "max-w-[2400px] rounded-none bg-white/72 shadow-[0_1px_0_var(--color-line)]",
          )}
        >
          {/* the sheen that follows the pointer across the glass */}
          <span
            aria-hidden
            className={clsx(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500",
              floating && "group-hover/bar:opacity-100",
            )}
            style={{ background: "radial-gradient(240px 120px at var(--nsx,50%) var(--nsy,0%), rgb(255 255 255/.75), transparent 70%)" }}
          />
          {/* reading progress along the bottom edge, drawn in once the bar floats */}
          <span
            aria-hidden
            className={clsx(
              "pointer-events-none absolute inset-x-5 bottom-0 h-[2px] overflow-hidden rounded-full transition-opacity duration-500",
              floating ? "opacity-100" : "opacity-0",
            )}
          >
            <span ref={progress} className="absolute inset-0 origin-left bg-[linear-gradient(90deg,var(--color-brand),#c58fbf)]" style={{ scale: "0 1" }} />
          </span>

          <div
            className={clsx(
              "wrap relative grid grid-cols-[1fr_auto] items-center gap-x-4 transition-[height,padding] duration-500 ease-soft md:grid-cols-[1fr_auto_1fr]",
              floating ? "h-[62px] px-3 sm:px-4" : "h-[72px] px-(--shell-pad)", // + the header's 10px float padding: it keeps its height, the page never shifts
            )}
          >
            <div className={clsx("justify-self-start transition-transform duration-500 ease-soft origin-left", floating && "scale-[0.86]")}>
              <Logo />
            </div>

            <nav
              ref={navRef}
              aria-label="Main"
              onPointerOver={markTo}
              onFocus={markTo}
              onPointerLeave={markRest}
              onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && markRest()}
              className="relative hidden items-center text-[15px] font-medium md:flex"
            >
              <span
                aria-hidden
                className={clsx(
                  "pointer-events-none absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#ffffff,rgb(255_255_255/.72))] shadow-[inset_0_1px_0_#fff,inset_0_-1px_0_rgb(18_20_22/.05),0_0_0_1px_rgb(18_20_22/.05),0_8px_18px_-8px_rgb(18_20_22/.3)] transition-[left,width,opacity,scale] duration-400 ease-[cubic-bezier(.34,1.4,.5,1)]",
                  mark.on ? "scale-100 opacity-100" : "scale-90 opacity-0",
                )}
                style={{ left: mark.left, width: mark.width }}
              >
                <span className="absolute bottom-1 left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full bg-brand" />
              </span>
              {NAV.map((n) => {
                const active = n.href === "/catalog" ? pathname === "/catalog" : pathname === n.href;
                return (
                  <Link
                    key={n.label}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    data-open={openLine === n.line || undefined}
                    onPointerEnter={() => hoverItem(n)}
                    onFocus={() => (n.line ? setPanel({ kind: "line", line: n.line }) : panel?.kind === "line" && closePanel())}
                    className={clsx(
                      "relative z-[1] items-center gap-1 rounded-full px-4 py-2.5 whitespace-nowrap text-ink-2 transition-[color,translate] duration-300 ease-soft hover:-translate-y-px hover:text-ink focus-visible:text-ink aria-[current=page]:text-ink",
                      openLine && openLine === n.line && "text-ink",
                      n.opt ? "hidden 2xl:inline-flex" : "inline-flex",
                    )}
                  >
                    {n.label}
                    {n.line && (
                      <svg
                        viewBox="0 0 12 12"
                        aria-hidden="true"
                        className={clsx(
                          "size-2.5 fill-none stroke-current stroke-[1.6] text-muted transition-transform duration-300 ease-soft",
                          openLine === n.line && "rotate-180 text-ink",
                        )}
                      >
                        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5 justify-self-end">
              <button
                ref={searchBtn}
                type="button"
                onClick={() => (panel?.kind === "search" ? closeSearch() : openSearch())}
                aria-expanded={panel?.kind === "search"}
                aria-controls="nav-panel"
                aria-label="Search styles"
                onPointerEnter={() => panel?.kind === "line" && later(closePanel, CLOSE_DELAY)}
                className={clsx(
                  "flex h-11 items-center gap-2 rounded-full text-ink transition-[background-color,box-shadow]",
                  "max-xl:w-11 max-xl:justify-center max-xl:hover:bg-white/70 xl:w-[210px] xl:bg-ink/[0.04] xl:pr-2 xl:pl-4 xl:text-ink-2 xl:shadow-[inset_0_1px_2px_rgb(18_20_22/.1),inset_0_0_0_1px_rgb(18_20_22/.06),0_1px_0_rgb(255_255_255/.8)] xl:hover:bg-white/60",
                  panel?.kind === "search" && "max-xl:bg-white/70 xl:bg-white/80 xl:shadow-[inset_0_0_0_2px_var(--color-ink)]",
                )}
              >
                <Icon name="search" className="size-5 xl:size-4" />
                <span className="flex-1 text-left text-[14px] max-xl:hidden">Search styles</span>
                <kbd className="rounded-full bg-white px-2 text-[12px] font-medium text-muted shadow-[0_1px_2px_rgb(18_20_22/.12)] max-xl:hidden">/</kbd>
              </button>
              <button
                type="button"
                onClick={() => openDrawer()}
                data-inquiry-target
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full whitespace-nowrap bg-[linear-gradient(180deg,#34352f,#121314)] pr-1.5 pl-4 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/.22),inset_0_-2px_0_rgb(0_0_0/.35),0_1px_1px_rgb(0_0_0/.25),0_10px_22px_-10px_rgb(18_20_22/.7)] transition-[background,box-shadow,translate] duration-300 ease-soft hover:-translate-y-px hover:bg-[linear-gradient(180deg,#a5479a,var(--color-brand))] active:translate-y-px active:shadow-[inset_0_2px_4px_rgb(0_0_0/.4),0_2px_6px_-2px_rgb(18_20_22/.5)] lg:pl-5"
              >
                <span className="max-lg:sr-only">Inquiry list</span>
                <Icon name="list" className="size-4 lg:hidden" />
                <CartCount />
              </button>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-white/70 md:hidden"
                aria-expanded={menuOpen}
                aria-controls="mnav"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => {
                  closePanel();
                  setMenuOpen((v) => !v);
                }}
              >
                <Icon name={menuOpen ? "close" : "menu"} className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* line preview or search, dropping from the bar */}
        {panel && (
          <div id="nav-panel" className="absolute inset-x-0 top-full px-(--shell-pad) pt-2" onClick={(e) => (e.target as HTMLElement).closest("a") && closePanel()}>
            <div
              key={panel.kind === "line" ? panel.line : "search"}
              role={panel.kind === "search" ? "dialog" : "region"}
              aria-label={panel.kind === "search" ? "Search styles" : "Line preview"}
              className={clsx(
                "mx-auto max-h-[calc(100dvh-110px)] origin-top animate-[nav-drop_.45s_cubic-bezier(.22,1,.36,1)_both] overflow-y-auto overscroll-contain rounded-shell bg-white/90 shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgb(255_255_255/.6),0_30px_60px_-24px_rgb(18_20_22/.35)] ring-1 ring-ink/5 backdrop-blur-2xl backdrop-saturate-150 motion-reduce:animate-none",
                panel.kind === "search" ? "max-w-[720px]" : "max-w-[1280px]",
              )}
            >
              {panel.kind === "search" ? <NavSearch onDone={closeSearch} /> : <LinePeek line={panel.line} />}
            </div>
          </div>
        )}

        <nav
          id="mnav"
          aria-label="Mobile"
          className={clsx(
            "absolute inset-x-0 top-full z-30 h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-t border-line bg-white px-(--shell-pad) pt-4 pb-[calc(env(safe-area-inset-bottom)+48px)] md:hidden",
            !menuOpen && "hidden",
          )}
          onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
        >
          {/* the three lines as photo tiles, so the menu opens on product */}
          <ul className="grid grid-cols-3 gap-2">
            {LINE_ITEMS.map((n, i) => {
              const cover = stylesIn(n.line)[0];
              return (
                <li key={n.label} className="animate-rise-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <Link href={n.href} className="group block rounded-card bg-tile p-2 pb-3 transition-colors active:bg-chip-hover">
                    <span className="relative block aspect-square">
                      {cover && <Image src={cover.outer.src} alt="" fill sizes="120px" className="object-contain p-1.5 drop-shadow-boot transition-transform duration-500 ease-soft group-active:scale-95" />}
                    </span>
                    <span className="mt-1 block px-1 text-[17px] leading-tight font-semibold tracking-[-0.01em]">{n.label}</span>
                    <span className="block px-1 text-[13px] text-muted tabular-nums">{inLine(n.line).length} styles</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="mt-4 divide-y divide-line">
            {PAGE_ITEMS.map((n, i) => (
              <li key={n.label} className="animate-rise-in" style={{ animationDelay: `${150 + i * 35}ms` }}>
                <Link href={n.href} className="flex items-center justify-between py-3.5 text-[20px] font-medium tracking-[-0.02em]">
                  {n.label}
                  <Icon name="arrow" className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 animate-rise-in rounded-shell bg-brand-soft p-5 [animation-delay:400ms]">
            <p className="text-[18px] leading-snug font-semibold tracking-[-0.01em] text-brand-deep">Tier pricing within 24 hours.</p>
            <p className="mt-1 text-[14px] text-ink-2">From {MOQ_PAIRS} pairs per style, samples in 10 days.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openDrawer();
                }}
                className="btn btn-dark h-11! px-5! text-[14px]!"
              >
                Get wholesale pricing <Icon name="arrow" className="size-4" />
              </button>
              <a href={tel(COMPANY.phone)} className="btn h-11! bg-white px-4! text-[14px]! text-ink">
                <Icon name="phone" className="size-4" /> Call us
              </a>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
