"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartCount } from "./CartCount";
import { Icon } from "./Icon";
import { useInquiry, useUI } from "@/lib/store";

/**
 * Floating inquiry button: appears once the hero (or the top of the page) scrolls away. Once styles are on the list
 * it says what it will do with them ("Get pricing"), a quiet reminder of the list the buyer has already built.
 */
export function Fab() {
  const [visible, setVisible] = useState(false);
  const openDrawer = useUI((s) => s.openDrawer);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const listed = useInquiry((s) => s.lines.length) > 0;
  const pathname = usePathname();

  // Shown once the page's opening (the hero, or the first 280px) is behind you, and tucked away again over the footer,
  // which has its own contact details and would otherwise sit under the button.
  useEffect(() => {
    const hero = document.getElementById("hero");
    const footer = document.getElementById("footer");
    let pastTop = false;
    let atFooter = false;
    const sync = () => setVisible(pastTop && !atFooter);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastTop = !e.isIntersecting;
        if (e.target === footer) atFooter = e.isIntersecting;
      }
      sync();
    });
    if (hero) io.observe(hero);
    if (footer) io.observe(footer);
    const onScroll = () => {
      pastTop = window.scrollY > 280;
      sync();
    };
    if (!hero) {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  if (pathname === "/inquiry") return null;

  return (
    <button
      type="button"
      onClick={() => openDrawer()}
      tabIndex={visible && !drawerOpen ? 0 : -1}
      aria-hidden={!visible || drawerOpen}
      className={clsx(
        "btn btn-dark fixed right-[clamp(16px,3vw,32px)] bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-30 shadow-fab transition-[translate,background-color] duration-500 ease-soft",
        visible && !drawerOpen ? "translate-y-0" : "translate-y-[120px]",
      )}
    >
      <Icon name="list" />
      {listed ? "Get pricing" : "Inquiry"}
      <CartCount />
    </button>
  );
}
