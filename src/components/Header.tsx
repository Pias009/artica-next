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
  { href: "/catalog", label: "Catalog" },
  { href: "/catalog?line=men", label: "Men" },
  { href: "/catalog?line=women", label: "Women" },
  { href: "/catalog?line=kids", label: "Kids" },
  { href: "/#partner", label: "Private label" },
  { href: "/#new", label: "New", opt: "lg" },
  { href: "/#stores", label: "Stores", opt: "lg" },
  { href: "/#materials", label: "Materials", opt: "xl" },
  { href: "/#service", label: "Shipping", opt: "xl" },
  { href: "#footer", label: "About", opt: "xl" },
];

const MOBILE = [
  { href: "/catalog", label: "Catalog" },
  { href: "/catalog?line=men", label: "Men" },
  { href: "/catalog?line=women", label: "Women" },
  { href: "/catalog?line=kids", label: "Kids" },
  { href: "/#partner", label: "Private label" },
  { href: "/#new", label: "New" },
  { href: "/#stores", label: "Stores" },
  { href: "/#materials", label: "Materials" },
  { href: "/#service", label: "Shipping" },
  { href: "/inquiry", label: "Inquiry list" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openDrawer = useUI((s) => s.openDrawer);
  const pathname = usePathname();
  const inCatalog = pathname.startsWith("/catalog") || pathname.startsWith("/products");

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      {/* Top showroom micro-ticker */}
      <div className="hidden items-center justify-between border-b border-line/60 py-1 px-3 text-[11px] font-medium text-ink-2 md:flex">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <span className="mono-label text-[10px] text-ink font-semibold">FW26 B2B Direct Atelier</span>
          <span className="text-line">•</span>
          <span>Sample Orders Dispatched in 10 Days</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>MOQ 300 pr (25 Cases)</span>
          <span className="text-line">•</span>
          <span className="font-semibold text-accent">DDP US & Canada Available</span>
        </div>
      </div>

      <header className="sticky top-2 z-30 my-2 flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-surface/90 px-4 py-2.5 backdrop-blur-xl shadow-[0_8px_30px_rgb(29_30_25/0.05)] md:gap-6">
        <Logo />
        <nav aria-label="Main" className="mx-auto hidden gap-1 text-[13px] font-medium md:flex lg:gap-2">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              aria-current={n.href === "/catalog" && inCatalog ? "page" : undefined}
              className={clsx(
                "relative rounded-full px-3.5 py-1.5 text-ink-2 transition-all hover:bg-chip hover:text-ink aria-[current=page]:bg-chip-hover aria-[current=page]:font-bold aria-[current=page]:text-ink",
                n.opt === "lg" && "hidden lg:inline-flex",
                n.opt === "xl" && "hidden xl:inline-flex",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link href="#footer" className="btn btn-line hidden text-xs md:inline-flex h-9 px-4">
            <Icon name="user" className="size-3.5" />
            Buyer portal
          </Link>
          <button type="button" className="btn btn-dark h-9 px-4 text-xs max-sm:px-3" onClick={() => openDrawer()}>
            <Icon name="list" className="size-3.5" />
            <span className="max-sm:sr-only">Inquiry list</span>
            <CartCount />
          </button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full bg-chip md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mnav"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} className="size-4" />
          </button>
        </div>
      </header>

      <nav
        id="mnav"
        aria-label="Mobile"
        className={clsx("grid gap-1 pt-1.5 pb-4 md:hidden", !menuOpen && "hidden")}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
      >
        {MOBILE.map((n) => (
          <Link key={n.label} href={n.href} className="rounded-xl bg-chip px-3.5 py-3 text-sm font-semibold">
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
