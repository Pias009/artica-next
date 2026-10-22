"use client";

import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { ActiveChips, FilterPanel, LineSwitch } from "./CatalogFilters";
import { EmptyResults } from "./EmptyResults";
import { ProductCard } from "./ProductCard";
import { activeCount, applyCatalog, EMPTY, facets, SORTS, toSearch, type CatalogState, type Sort } from "@/lib/catalog-filters";
import { Flip, gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { collapse, MOQ_PAIRS, PACK } from "@/lib/products";
import { SEASONS, type SeasonId } from "@/lib/season";

/**
 * Catalog: a sticky glass toolbar (search, line, sort, view), faceted filters with live counts in a glass sidebar
 * (a bottom sheet on small screens), and a grid that animates cards to their new spots with GSAP Flip.
 * Every choice is mirrored in the URL so a filtered view can be shared.
 */
export function CatalogView({ initial, season = null }: { initial: CatalogState; season?: SeasonId | null }) {
  const [s, setS] = useState(initial);
  const gridRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  // `season` is the visitor's: their in-season styles lead the featured order
  const { searched, matches } = useMemo(() => applyCatalog(s, season), [s, season]);
  const f = useMemo(() => facets(searched, s), [searched, s]);
  const cards = s.view === "grouped" ? collapse(matches) : matches;
  const filters = activeCount(s);

  const update = (patch: Partial<CatalogState>) => {
    if (gridRef.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(gridRef.current.querySelectorAll("[data-card]"));
    }
    const next = { ...s, ...patch };
    setS(next);
    // keep the URL shareable without a server navigation
    window.history.replaceState(null, "", `/catalog${toSearch(next)}`);
  };
  const toggle = (key: "features" | "cats" | "colors", value: string) => {
    const list = s[key] as string[];
    update({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };
  const onLine = (line: CatalogState["line"]) => update({ line });

  useGSAP(
    () => {
      const state = flipState.current;
      if (!state) return;
      flipState.current = null;
      Flip.from(state, {
        targets: gridRef.current!.querySelectorAll("[data-card]"),
        duration: 0.55,
        ease: "power3.inOut",
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out" }),
        onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.94, duration: 0.25, ease: "power2.in" }),
      });
    },
    { dependencies: [s], scope: gridRef },
  );

  const panel = { s, f, onLine, onToggle: toggle, onSet: update };
  const summary = (
    <>
      <b className="font-semibold text-ink tabular-nums">{matches.length}</b> style{matches.length === 1 ? "" : "s"}
      {s.view === "grouped" && (
        <>
          {" "}
          in <b className="font-semibold text-ink tabular-nums">{cards.length}</b> {cards.length === 1 ? "category" : "categories"}
        </>
      )}
    </>
  );

  return (
    // snow tiles go translucent here too, so every surface reads as glass over the colour field
    <div className="relative [--color-tile:rgb(255_255_255/0.55)]">
      {/* toolbar */}
      <div className="glass-strong sticky top-[70px] z-20 flex flex-wrap items-center gap-2 rounded-[26px] p-2">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex h-12 min-w-0 flex-[1_1_260px] items-center gap-2 rounded-full bg-white/70 pr-1 pl-4 ring-1 ring-white focus-within:ring-2 focus-within:ring-brand/40">
          <Icon name="search" className="size-4 text-muted" />
          <label htmlFor="catalog-q" className="sr-only">
            Search styles
          </label>
          <input
            id="catalog-q"
            type="search"
            value={s.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search style, material, colour or code…"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-muted sm:text-[14px] [&::-webkit-search-cancel-button]:hidden"
          />
          {s.q && (
            <button type="button" onClick={() => update({ q: "" })} aria-label="Clear search" className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-white">
              <Icon name="close" className="size-4" />
            </button>
          )}
        </form>

        <LineSwitch value={s.line} counts={f.lines} onChange={onLine} className="max-md:order-last max-md:w-full" />

        <label className="relative flex h-12 items-center gap-2 rounded-full bg-white/70 pr-3 pl-4 text-[13px] font-semibold ring-1 ring-white">
          <span className="text-muted max-sm:sr-only">Sort</span>
          <select
            value={s.sort}
            onChange={(e) => update({ sort: e.target.value as Sort })}
            className="cursor-pointer appearance-none bg-transparent pr-5 font-semibold text-ink outline-none"
          >
            {SORTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="arrow" className="pointer-events-none absolute right-3 size-3.5 rotate-90 text-ink-2" />
        </label>

        <div role="group" aria-label="Show" className="flex h-12 items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-white">
          {(
            [
              ["grouped", "layers", "Categories"],
              ["styles", "grid", "Every style"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={s.view === id}
              onClick={() => update({ view: id })}
              title={label}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-white"
            >
              <Icon name={icon} className="size-4" />
              <span className="max-xl:sr-only">{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => sheetRef.current?.showModal()}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white lg:hidden"
        >
          <Icon name="rows" className="size-4" />
          Filters
          {filters > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] tabular-nums">{filters}</span>}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
        {/* desktop filters */}
        <aside aria-label="Filters" className="glass scrollbar-soft sticky top-[150px] max-h-[calc(100dvh-170px)] self-start overflow-y-auto rounded-[26px] p-5 max-lg:hidden">
          <FilterPanel {...panel} />
        </aside>

        <section aria-label="Results" className="min-w-0">
          {/* the visitor's season leads the featured order; one tap narrows to it */}
          {season && !s.season && s.sort === "featured" && (
            <div className="bg-season-field mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card px-4 py-3">
              <p className="flex items-center gap-2.5 text-[14px] text-ink-2">
                <Icon name={SEASONS[season].icon} className="size-5! text-season" />
                <span>
                  <b className="font-semibold text-ink">{SEASONS[season].name} styles first</b>, picked for this time of year where you are.
                </span>
              </p>
              <button
                type="button"
                onClick={() => update({ season })}
                className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand"
              >
                Only {SEASONS[season].name.toLowerCase()} styles <Icon name="arrow" className="size-4" />
              </button>
            </div>
          )}
          <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-ink-2" aria-live="polite">
              {summary}
              <span className="text-muted max-sm:hidden">
                {" "}
                · MOQ {MOQ_PAIRS} pairs · {PACK} per case
              </span>
            </p>
            <ActiveChips {...panel} />
          </div>

          <div ref={gridRef} className="relative grid grid-cols-1 gap-4 min-[26rem]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
            {cards.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                variant="glass"
                single={s.view === "styles"}
                sizes="(max-width: 864px) 50vw, (max-width: 1536px) 30vw, 300px"
              />
            ))}
            {!cards.length && <EmptyResults onReset={() => update({ ...EMPTY, sort: s.sort, view: s.view })} />}
          </div>
        </section>
      </div>

      {/* mobile filters: a frosted bottom sheet (native dialog: focus trap, Esc, backdrop) */}
      <dialog
        ref={sheetRef}
        aria-label="Filters"
        onClick={(e) => e.target === e.currentTarget && sheetRef.current?.close()}
        className={clsx(
          "glass-strong m-0 mt-auto max-h-[86dvh] w-full max-w-none overflow-hidden rounded-t-[28px] p-0 text-ink [--glass-bg:rgb(255_255_255/0.86)]",
          "backdrop:bg-ink/30 backdrop:backdrop-blur-sm open:flex open:flex-col open:animate-rise-in lg:hidden",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="text-[17px] font-semibold">Filters</p>
          <button type="button" onClick={() => sheetRef.current?.close()} aria-label="Close filters" className="grid size-11 place-items-center rounded-full bg-white/70">
            <Icon name="close" className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <FilterPanel {...panel} showLine />
        </div>
        <div className="flex gap-2 border-t border-white/80 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">
          <button type="button" disabled={!filters} onClick={() => update({ line: "all", features: [], cats: [], colors: [], season: null })} className="btn btn-line flex-1">
            Clear all
          </button>
          <button type="button" onClick={() => sheetRef.current?.close()} className="btn btn-dark flex-[1.4]">
            Show {matches.length} style{matches.length === 1 ? "" : "s"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
