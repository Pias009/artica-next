"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { live } from "@/lib/content/live";
import { TRACKERS, type TrackerId } from "@/lib/marketing/model";
import { CONSENT_KEY, CONSENT_OPEN, loadTags, optedOut } from "@/lib/marketing/tags";

/*
 * The cookie banner and the tracking tags behind it (Admin → Social). With no tag switched on, nothing renders and
 * nothing loads: the site stays cookie-free, as the privacy policy says. With tags on, the visitor is asked once; only
 * "Accept" loads them. The choice is kept in this browser (localStorage) and can be changed from the footer's
 * "Cookie settings", which reopens this banner. Browsers sending Global Privacy Control or Do Not Track are never
 * asked and never tracked.
 */

type Choice = "granted" | "denied";
const read = (): Choice | null => {
  try {
    const v = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as { c?: string } | null;
    return v?.c === "granted" || v?.c === "denied" ? v.c : null;
  } catch {
    return null;
  }
};
const write = (c: Choice) => {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ c, at: new Date().toISOString() }));
  } catch {
    // storage blocked: the choice holds for this page only
  }
};

export const trackingTags = () => (live()?.tracking?.tags ?? {}) as Partial<Record<TrackerId, string>>;

export function MarketingTags() {
  const cfg = live()?.tracking;
  const tags = trackingTags();
  const vendors = TRACKERS.filter((t) => tags[t.id]).map((t) => t.name);
  const any = vendors.length > 0;
  // "pending" until mounted: the server can't know the choice, so the banner never flashes on hydration
  const [choice, setChoice] = useState<Choice | null | "pending">("pending");

  useEffect(() => {
    if (!any) return;
    const id = requestAnimationFrame(() => setChoice(optedOut() ? "denied" : read()));
    const open = () => !optedOut() && setChoice(null);
    window.addEventListener(CONSENT_OPEN, open);
    return () => (cancelAnimationFrame(id), window.removeEventListener(CONSENT_OPEN, open));
  }, [any]);

  useEffect(() => {
    if (choice === "granted" && any) loadTags(tags, cfg?.events ?? true);
    // tags and cfg come from the page's printed content and don't change while it's open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, any]);

  if (!any || choice !== null) return null;

  const decide = (c: Choice) => {
    const before = read();
    write(c);
    // tags already running can't be unloaded: start the page fresh without them
    if (c === "denied" && before === "granted") location.reload();
    else setChoice(c);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-3 z-[70] rounded-[22px] bg-white p-5 text-ink shadow-[0_24px_60px_-20px_rgb(18_20_22/.45)] ring-1 ring-line md:right-auto md:bottom-5 md:left-5 md:max-w-[420px]"
    >
      <p className="text-[15px] font-semibold">Can we measure our ads?</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
        With your OK we use cookies from {vendors.join(", ")} to see which ads and posts bring buyers here. Nothing loads unless you agree.{" "}
        <Link href="/privacy" className="font-semibold text-brand underline-offset-4 hover:underline">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => decide("denied")} className="min-h-11 flex-1 rounded-full bg-chip px-4 text-[14px] font-semibold transition-colors hover:bg-chip-hover">
          No thanks
        </button>
        <button type="button" onClick={() => decide("granted")} className="min-h-11 flex-1 rounded-full bg-accent px-4 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent-hover">
          Accept
        </button>
      </div>
    </div>
  );
}

/** The footer's "Cookie settings": reopens the banner. Shown only while some tag is switched on. */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!Object.keys(trackingTags()).length) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN))} className={className}>
      Cookie settings
    </button>
  );
}
