"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartCount } from "./CartCount";
import { Icon } from "./Icon";
import { useUI } from "@/lib/store";

/** Floating inquiry button: appears once the hero (or the top of the page) scrolls away. */
export function Fab() {
  const [visible, setVisible] = useState(false);
  const openDrawer = useUI((s) => s.openDrawer);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const pathname = usePathname();

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (hero) {
      const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting));
      io.observe(hero);
      return () => io.disconnect();
    }
    const onScroll = () => setVisible(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      Inquiry
      <CartCount />
    </button>
  );
}
