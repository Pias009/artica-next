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
import { COMPANY, tel } from "@/lib/company";
import { inLine, MOQ_PAIRS, stylesIn, type ProductLine } from "@/lib/products";
import { useUI } from "@/lib/store";

type NavItem = { href: string; label: string; line?: ProductLine; opt?: boolean };

const NAV: NavItem[] = [
  { href: "/catalog?line=men", label: "Men", line: "men" },
  { href: "/catalog?line=women", label: "Women", line: "women" },
  { href: "/catalog?line=kids", label: "Kids", line: "kids" },
  { href: "/catalog", label: "All products" },
  { href: "/shipping", label: "Shipping", opt: true },
  { href: "/about", label: "About", opt: true },
];

/** Mobile menu: the lines as photo tiles, then the pages as a list. */
const LINE_ITEMS = NAV.filter((n): n is NavItem & { line: ProductLine } => !!n.line);
const PAGE_ITEMS: NavItem[] = [
  ...NAV.filter((n) => !n.line && !n.opt),
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

/** Underline under a nav link, inset to the link's text. */
type Mark = { left: number; width: number; on: boolean };
type Panel = { kind: "line"; line: ProductLine } | { kind: "search" } | null;

const MARK_INSET = 14;
const markAt = (a: HTMLElement): Mark => ({ left: a.offsetLeft + MARK_INSET, width: a.offsetWidth - MARK_INSET * 2, on: true });
/** Where the underline rests when nothing is pointed at: the open line preview, else the current page. */
const restingMark = (nav: HTMLElement | null) => {
  const a = nav?.querySelector<HTMLElement>("a[data-open]") ?? nav?.querySelector<HTMLElement>('a[aria-current="page"]');
  return a ? markAt(a) : null;
};

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
  const markTo = (e: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    if (a) setMark(markAt(a));
  };
  const markRest = () => setMark((m) => restingMark(navRef.current) ?? { ...m, on: false });

  // Re-seat the resting underline on navigation, when a preview opens or closes, and when the nav reflows.
  const openLine = panel?.kind === "line" ? panel.line : null;
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(() => setMark((m) => restingMark(nav) ?? { ...m, on: false }));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [pathname, openLine]);

  const floating = scrolled && !menuOpen;
  const tucked = hidden && !menuOpen && !panel;

  return (
    <>
      <p className="bg-ink px-(--shell-pad) py-2.5 text-center text-[13px] font-medium text-white">
        Samples in 10 days <span className="mx-2 text-white/40">·</span> Door-to-door to the US and Canada
        <span className="max-sm:hidden">
          <span className="mx-2 text-white/40">·</span> From 300 pairs per style
        </span>
        <span className="max-lg:hidden">
          <span className="mx-2 text-white/40">·</span> Trade buyers only
        </span>
      </p>

      <header
        ref={headerRef}
        onPointerLeave={() => panel?.kind === "line" && later(closePanel, CLOSE_DELAY)}
        onPointerEnter={() => panel?.kind === "line" && clearTimeout(timer.current)}
        className={clsx(
          "sticky top-0 z-30 transition-[translate,background-color,box-shadow] duration-500 ease-soft focus-within:translate-y-0!",
          floating ? "bg-white/85 shadow-[0_1px_0_var(--color-line),0_12px_32px_-20px_rgb(18_20_22/0.25)] backdrop-blur-xl backdrop-saturate-150" : "bg-white",
          tucked && "-translate-y-full",
        )}
      >
        {/* reading progress along the bottom edge, drawn in once the bar compacts */}
        <span
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden transition-opacity duration-500",
            floating ? "opacity-100" : "opacity-0",
          )}
        >
          <span ref={progress} className="absolute inset-0 origin-left bg-brand" style={{ scale: "0 1" }} />
        </span>

        <div
          className={clsx(
            "wrap grid grid-cols-[1fr_auto] items-center gap-x-4 px-(--shell-pad) transition-[height] duration-500 ease-soft md:grid-cols-[1fr_auto_1fr]",
            floating ? "h-[58px]" : "h-[72px]",
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
                "pointer-events-none absolute bottom-0.5 h-[2px] rounded-full bg-brand transition-[left,width,opacity] duration-300 ease-soft",
                mark.on ? "opacity-100" : "opacity-0",
              )}
              style={{ left: mark.left, width: mark.width }}
            />
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
                    "relative items-center gap-1 rounded-md px-3.5 py-2.5 whitespace-nowrap text-ink-2 transition-colors hover:text-ink focus-visible:text-ink aria-[current=page]:text-ink",
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
                "flex h-11 items-center gap-2 rounded-xl text-ink transition-colors",
                "max-xl:w-11 max-xl:justify-center max-xl:hover:bg-chip xl:w-[200px] xl:bg-chip xl:pr-2 xl:pl-3.5 xl:text-ink-2 xl:hover:bg-chip-hover",
                panel?.kind === "search" && "max-xl:bg-chip xl:ring-2 xl:ring-ink",
              )}
            >
              <Icon name="search" className="size-5 xl:size-4" />
              <span className="flex-1 text-left text-[14px] max-xl:hidden">Search styles</span>
              <kbd className="rounded-md bg-white px-1.5 text-[12px] font-medium text-muted ring-1 ring-line max-xl:hidden">/</kbd>
            </button>
            <button
              type="button"
              onClick={() => openDrawer()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink pr-2 pl-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover lg:pl-4"
            >
              <span className="max-lg:sr-only">Inquiry list</span>
              <Icon name="list" className="size-4 lg:hidden" />
              <CartCount />
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-xl text-ink hover:bg-chip md:hidden"
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

        {/* line preview or search, dropping from the bar */}
        {panel && (
          <div id="nav-panel" className="absolute inset-x-0 top-full px-(--shell-pad) pt-2" onClick={(e) => (e.target as HTMLElement).closest("a") && closePanel()}>
            <div
              key={panel.kind === "line" ? panel.line : "search"}
              role={panel.kind === "search" ? "dialog" : "region"}
              aria-label={panel.kind === "search" ? "Search styles" : "Line preview"}
              className={clsx(
                "mx-auto max-h-[calc(100dvh-110px)] animate-rise-in overflow-y-auto overscroll-contain rounded-shell bg-white shadow-float ring-1 ring-line",
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
