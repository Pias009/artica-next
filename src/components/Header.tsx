"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { CartCount } from "./CartCount";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { useUI } from "@/lib/store";

const NAV = [
  { href: "/catalog?line=men", label: "Men" },
  { href: "/catalog?line=women", label: "Women" },
  { href: "/catalog?line=kids", label: "Kids" },
  { href: "/catalog", label: "All styles" },
  { href: "/private-label", label: "Private label" },
  { href: "/shipping", label: "Shipping", opt: true },
  { href: "/about", label: "About", opt: true },
];

const MOBILE = [
  { href: "/catalog?line=men", label: "Men" },
  { href: "/catalog?line=women", label: "Women" },
  { href: "/catalog?line=kids", label: "Kids" },
  { href: "/catalog", label: "All styles" },
  { href: "/private-label", label: "Private label" },
  { href: "/shipping", label: "Shipping" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

/** Below this the bar always shows; past it, scrolling down hides it and scrolling up brings it back. */
const REVEAL_ZONE = 140;
/** Pixels of travel in one direction before the bar reacts, so trackpad jitter doesn't flicker it. */
const SCROLL_SLACK = 8;

type Pill = { left: number; width: number; on: boolean };

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, on: false });
  const progress = useRef<HTMLSpanElement>(null);
  const openDrawer = useUI((s) => s.openDrawer);
  const pathname = usePathname();

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

  // Slide the hover pill under whichever link is pointed at or focused.
  const pillTo = (e: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    setPill({ left: a.offsetLeft, width: a.offsetWidth, on: true });
  };
  const pillOff = () => setPill((p) => ({ ...p, on: false }));

  const floating = scrolled && !menuOpen;
  const tucked = hidden && !menuOpen;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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
        className={clsx(
          "sticky top-0 z-30 transition-[translate,padding,background-color] duration-500 ease-soft focus-within:translate-y-0!",
          floating ? "px-(--shell-pad) pt-3" : "bg-white/95 backdrop-blur-md",
          tucked && "-translate-y-[calc(100%+12px)]",
        )}
      >
        <div
          className={clsx(
            "wrap relative flex items-center gap-6 transition-[height,padding,border-radius,background-color,box-shadow,max-width] duration-500 ease-soft",
            floating
              ? "h-[60px] max-w-[1280px] rounded-full bg-white/80 pr-2 pl-5 shadow-float ring-1 ring-line backdrop-blur-xl backdrop-saturate-150"
              : "h-[68px] px-(--shell-pad)",
          )}
        >
          {/* reading progress, clipped to the pill */}
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <span
              ref={progress}
              className={clsx(
                "absolute inset-x-0 bottom-0 h-[2px] origin-left bg-brand transition-opacity duration-500",
                floating ? "opacity-100" : "opacity-0",
              )}
              style={{ scale: "0 1" }}
            />
          </span>

          <Logo />
          <nav
            aria-label="Main"
            onPointerOver={pillTo}
            onFocus={pillTo}
            onPointerLeave={pillOff}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && pillOff()}
            className="relative hidden flex-1 items-center gap-1 text-[15px] font-medium md:flex"
          >
            <span
              aria-hidden
              className={clsx(
                "pointer-events-none absolute top-1/2 h-10 -translate-y-1/2 rounded-full bg-chip transition-[left,width,opacity] duration-300 ease-soft",
                pill.on ? "opacity-100" : "opacity-0",
              )}
              style={{ left: pill.left, width: pill.width }}
            />
            {NAV.map((n) => {
              const active = n.href === "/catalog" ? pathname === "/catalog" : pathname === n.href;
              return (
                <Link
                  key={n.label}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "relative rounded-full px-3.5 py-2.5 text-ink-2 transition-colors hover:text-ink focus-visible:text-ink",
                    "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:scale-0 after:rounded-full after:bg-brand after:transition-transform after:duration-300 aria-[current=page]:text-ink aria-[current=page]:after:scale-100",
                    n.opt && "hidden lg:inline",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/catalog" aria-label="Search styles" className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-chip">
              <Icon name="search" className="size-5" />
            </Link>
            <button
              type="button"
              onClick={() => openDrawer()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink pr-1.5 pl-4 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <span className="max-sm:sr-only">Inquiry list</span>
              <Icon name="list" className="size-4 sm:hidden" />
              <CartCount />
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full text-ink hover:bg-chip md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mnav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? "close" : "menu"} className="size-5" />
            </button>
          </div>
        </div>

        <nav
          id="mnav"
          aria-label="Mobile"
          className={clsx(
            "absolute inset-x-0 top-full z-30 h-[calc(100dvh-68px)] overflow-y-auto border-t border-line bg-white px-(--shell-pad) pt-2 pb-10 md:hidden",
            !menuOpen && "hidden",
          )}
          onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
        >
          <ul className="divide-y divide-line">
            {MOBILE.map((n) => (
              <li key={n.label}>
                <Link href={n.href} className="flex items-center justify-between py-4 text-[22px] font-medium tracking-[-0.02em]">
                  {n.label}
                  <Icon name="arrow" className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
