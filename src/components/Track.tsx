"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useInquiry, useUI } from "@/lib/store";

/*
 * The visitor log (src/lib/analytics/visits.ts): one beacon per page view, search and opened inquiry form. Nothing is
 * stored in the browser (no cookie, no storage): the server makes an anonymous id that changes daily. Skipped for
 * browsers that send Global Privacy Control or Do Not Track.
 */

const optedOut = () => {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1";
};

let first = true;
export function track(k: "view" | "search" | "inquiry" | "add", extra: { q?: string; n?: number; id?: string } = {}) {
  if (typeof window === "undefined" || optedOut()) return;
  const body = JSON.stringify({
    k,
    p: location.pathname + location.search,
    w: innerWidth,
    ...(first && k === "view" && { r: document.referrer }),
    ...extra,
  });
  if (k === "view") first = false;
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
    void fetch("/api/track", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    }).catch(() => {});
  }
}

export function Track() {
  const path = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    track("view");
  }, [path, search]);

  // an opened inquiry form: the funnel's "started an inquiry" step
  const open = useUI((s) => s.drawerOpen);
  const was = useRef(open);
  useEffect(() => {
    if (open && !was.current) track("inquiry");
    was.current = open;
  }, [open]);

  // a style put on the inquiry list (from a card, its page, Kai or the planner): the step between looking and asking
  useEffect(
    () =>
      useInquiry.subscribe((s, prev) => {
        // the saved list loading from storage isn't the buyer adding anything
        if (!useInquiry.persist.hasHydrated()) return;
        for (const l of s.lines) if (!prev.lines.some((p) => p.id === l.id)) track("add", { id: l.id });
      }),
    [],
  );
  return null;
}
