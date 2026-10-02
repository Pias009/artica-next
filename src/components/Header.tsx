"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const openDrawer = useUI((s) => s.openDrawer);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          "sticky top-0 z-30 bg-white/95 backdrop-blur-md transition-shadow duration-300",
          scrolled && "shadow-[0_1px_0_rgb(18_20_22/.08)]",
        )}
      >
        <div className="wrap flex h-[68px] items-center gap-6 px-(--shell-pad)">
          <Logo />
          <nav aria-label="Main" className="hidden flex-1 items-center gap-7 text-[15px] font-medium md:flex">
            {NAV.map((n) => {
              const active = n.href === "/catalog" ? pathname === "/catalog" : pathname === n.href;
              return (
                <Link
                  key={n.label}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "relative py-2 text-ink-2 transition-colors hover:text-ink",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:text-ink aria-[current=page]:after:scale-x-100",
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
