"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { InquiryPanel } from "./InquiryForm";
import { MOQ_CASES, MOQ_PAIRS } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

export function InquiryDrawer() {
  const open = useUI((s) => s.drawerOpen);
  const close = useUI((s) => s.closeDrawer);
  const count = useInquiry((s) => s.lines.length);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const lastFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Keep keyboard and screen-reader focus inside the dialog.
    const page = document.getElementById("page");
    page?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeBtn.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      page?.removeAttribute("inert");
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      lastFocus?.focus();
    };
  }, [open, close]);

  return (
    <>
      <div
        onClick={close}
        className={clsx(
          "fixed inset-0 z-40 bg-[rgb(15_16_13/.45)] backdrop-blur-[2px] transition-opacity duration-300 ease-soft",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="d-title"
        inert={!open}
        className={clsx(
          "fixed inset-y-0 right-0 z-[41] flex w-[min(460px,100%)] flex-col bg-surface pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-drawer transition-transform duration-500 ease-soft",
          open ? "translate-x-0" : "translate-x-[104%]",
        )}
      >
        <div className="flex items-center justify-between px-6 pt-[22px] pb-3.5">
          <h2 id="d-title" className="text-[20px] font-semibold tracking-[-0.02em]">
            Inquiry list
            <small className="mt-0.5 block text-xs font-medium text-muted">
              {count ? `Minimum ${MOQ_CASES} cases (${MOQ_PAIRS} pairs) per style` : "Add styles, set cases, send once"}
            </small>
          </h2>
          <button ref={closeBtn} type="button" onClick={close} aria-label="Close" className="grid size-11 place-items-center rounded-full bg-chip transition-colors hover:bg-chip-hover">
            <Icon name="close" />
          </button>
        </div>
        <InquiryPanel variant="drawer" onNavigate={close} />
      </aside>
    </>
  );
}
