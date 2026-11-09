"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

/*
 * Real-visitor speed (Core Web Vitals) and JavaScript errors, for Vela's Engineering team in the admin panel
 * (api/health, lib/vela/health.ts). Sends only the page path, the reading and an error's message: no cookie, nothing
 * stored in the browser, and nothing at all from browsers that send Global Privacy Control or Do Not Track. Half of
 * the visits report speed; every visit reports errors, at most 5 per page.
 */

type Item = { n: string; v?: number; r?: string; p: string; msg?: string; src?: string };

const SAMPLE = 0.5;
const MAX_ERRORS = 5;
const queue: Item[] = [];
let sampled: boolean | null = null;
const seen = new Set<string>();

const optedOut = () => {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1";
};

function flush() {
  if (!queue.length) return;
  const body = JSON.stringify({ m: queue.splice(0, 20) });
  try {
    if (!navigator.sendBeacon?.("/api/health", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/health", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch {}
}

const push = (i: Item) => {
  if (optedOut()) return;
  queue.push(i);
  if (queue.length >= 10) flush();
};

// a stable reference: the hook calls a new function with every reading so far
const onVital = (metric: { name: string; value: number; rating?: string }) => {
  sampled ??= Math.random() < SAMPLE;
  if (!sampled) return;
  const n = metric.name.toLowerCase();
  if (!["lcp", "inp", "cls", "fcp", "ttfb"].includes(n)) return;
  push({ n, v: n === "cls" ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value), r: metric.rating, p: location.pathname });
};

export function SiteHealth() {
  const path = usePathname();
  useReportWebVitals(onVital);

  useEffect(() => {
    const report = (msg: string, src?: string) => {
      const key = `${msg}|${location.pathname}`;
      if (seen.has(key) || seen.size >= MAX_ERRORS) return;
      seen.add(key);
      push({ n: "js_error", p: location.pathname, msg: msg.slice(0, 300), src: (src ?? "").slice(0, 200) });
      flush();
    };
    const onError = (e: ErrorEvent) => {
      // cross-origin "Script error." from third-party tags says nothing useful
      if (e.message && e.message !== "Script error.") report(e.message, e.filename);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg = r instanceof Error ? r.message : typeof r === "string" ? r : "";
      if (msg) report(`Unhandled promise rejection: ${msg}`);
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // a new page: its errors count afresh; send what's waiting
  useEffect(() => {
    seen.clear();
    flush();
  }, [path]);

  return null;
}
