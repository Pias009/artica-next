"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartCount } from "./CartCount";
import { InDock, useCompactDock } from "./Dock";
import { Icon } from "./Icon";
import { AskInquiryButton } from "./inquiry/AskInquiry";
import { prefersReducedMotion } from "@/lib/gsap";
import { useInquiry, useUI } from "@/lib/store";

/** Seconds each face of the button shows before it turns over. */
const FLIP_EVERY = 4;

/**
 * Floating inquiry button, in the dock (components/Dock.tsx). On desktop it appears once the hero (or the top of the
 * page) scrolls away; where the dock is one compact row it stays in that row, which tucks itself away instead. Its label
 * turns over between "Send inquiry" and "Ask inquiry" on a slow loop (still while hovered, focused or open, and for
 * reduced motion); it opens the small "Ask inquiry" box (inquiry/AskInquiry.tsx), the list (its count) going along.
 */
export function Fab() {
  const [visible, setVisible] = useState(false);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const asking = useUI((s) => s.ask !== null);
  const listed = useInquiry((s) => s.lines.length) > 0;
  const [face, setFace] = useState<0 | 1>(0);
  const [held, setHeld] = useState(false);
  const pathname = usePathname();
  const compact = useCompactDock();

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

  const shown = (visible || compact) && !drawerOpen;
  const still = held || asking || !shown;

  // turn the label over every few seconds while the button is on screen and nobody is pointing at it
  useEffect(() => {
    if (still || prefersReducedMotion()) return;
    const id = setInterval(() => setFace((f) => (f ? 0 : 1)), FLIP_EVERY * 1000);
    return () => clearInterval(id);
  }, [still]);

  if (pathname === "/inquiry" || pathname === "/send-inquiry") return null;

  return (
    <InDock slot="inquiry">
      <AskInquiryButton
        tabIndex={shown ? 0 : -1}
        aria-hidden={!shown}
        aria-label={listed ? "Ask inquiry about your list" : "Ask inquiry"}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className={clsx(
          "btn btn-dark shadow-fab transition-[translate,background-color] duration-500 ease-soft compact-dock:h-[54px] compact-dock:gap-2 compact-dock:px-5",
          shown ? "translate-y-0" : "translate-y-[120px]",
        )}
      >
        <span aria-hidden="true" className="grid [perspective:300px] [&>*]:col-start-1 [&>*]:row-start-1">
          {(
            [
              ["mail", "Send inquiry"],
              ["chat", "Ask inquiry"],
            ] as const
          ).map(([icon, label], i) => (
            <span
              key={label}
              className={clsx(
                "flip-face flex items-center gap-2 whitespace-nowrap",
                face === i ? "[transform:rotateX(0deg)] opacity-100" : i ? "[transform:rotateX(-90deg)] opacity-0" : "[transform:rotateX(90deg)] opacity-0",
              )}
            >
              <Icon name={icon} />
              {label}
            </span>
          ))}
        </span>
        <CartCount />
      </AskInquiryButton>
    </InDock>
  );
}
