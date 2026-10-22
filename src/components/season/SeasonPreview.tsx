"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { EffectsToggle } from "./EffectsToggle";
import { onSeason } from "./live";
import { usePickSeason } from "./pickSeason";
import { isSeason, SEASON_COOKIE, SEASON_IDS, SEASON_PREVIEW, SEASONS } from "@/lib/season";

const snapshot = () => {
  const picked = document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.pick}=([^;]*)`))?.[1];
  return `${document.documentElement.dataset.season ?? ""}|${picked ? "pick" : "auto"}`;
};

/**
 * A floating "Preview seasons" button (bottom left) for checking the six themes: each swatch shows its season's own
 * colours, and a tap dresses the whole site in it at once, products re-sorting a moment later. Auto goes back to the
 * visitor's location. Turned off with NEXT_PUBLIC_SEASON_PREVIEW=off (see SEASON_PREVIEW).
 */
export function SeasonPreview() {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [shown, mode] = useSyncExternalStore(onSeason, snapshot, () => "|auto").split("|");
  const [pickSeason, pending] = usePickSeason();
  const current = isSeason(shown) ? SEASONS[shown] : null;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (id: (typeof SEASON_IDS)[number] | "auto") => {
    setBusy(id);
    pickSeason(id);
  };
  const loading = (id: string) => pending && busy === id;

  if (!SEASON_PREVIEW || !current) return null;
  return (
    <div ref={ref} className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-[clamp(16px,3vw,32px)] z-30">
      {open && (
        <div
          id={`${uid}-panel`}
          role="dialog"
          aria-labelledby={`${uid}-title`}
          className="absolute bottom-full left-0 mb-3 w-[min(calc(100vw-32px),380px)] animate-rise-in rounded-shell bg-white p-4 shadow-float ring-1 ring-ink/8"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={`${uid}-title`} className="text-[16px] font-semibold">
                Preview season themes
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Showing <b className="font-semibold text-ink">{current.name}</b>
                {mode === "auto" ? " (auto, by location)" : " (picked)"}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-tile">
              <Icon name="close" className="size-4!" />
            </button>
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SEASON_IDS.map((id) => {
              const t = SEASONS[id];
              const on = id === shown;
              return (
                <li key={id}>
                  <button
                    type="button"
                    data-season-swatch={id}
                    aria-pressed={on}
                    onClick={() => choose(id)}
                    className={clsx(
                      "bg-season-field flex min-h-[84px] w-full flex-col items-start justify-between rounded-card p-3 text-left ring-1 transition-shadow",
                      on ? "ring-2 ring-ink" : "ring-ink/8 hover:ring-ink/30",
                    )}
                  >
                    <Icon name={t.icon} className="size-5! text-season" />
                    <span className="text-[14px] font-semibold">{loading(id) ? "Loading…" : t.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => choose("auto")}
            className={clsx("mt-2 flex min-h-11 w-full items-center gap-2.5 rounded-card px-3 text-[14px] hover:bg-tile", mode === "auto" && "font-semibold")}
          >
            <Icon name="pin" className="size-4!" />
            <span className="flex-1 text-left">{loading("auto") ? "Loading…" : "Auto, by visitor location"}</span>
            {mode === "auto" && <Icon name="check" className="size-4! text-brand" />}
          </button>
          <EffectsToggle />
          <p className="mt-2 px-1 text-[12px] text-muted">Colours change at once; the products re-sort a moment later.</p>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        onClick={() => setOpen((v) => !v)}
        className="btn h-12! gap-2 bg-white px-4! text-[14px]! text-ink shadow-fab ring-1 ring-ink/8 hover:bg-tile"
      >
        <span data-season-swatch={current.id} className="bg-season-field grid size-7 place-items-center rounded-full ring-1 ring-ink/10">
          <Icon name={current.icon} className="size-4! text-season" />
        </span>
        <span className="max-sm:sr-only">Preview seasons</span>
      </button>
    </div>
  );
}
