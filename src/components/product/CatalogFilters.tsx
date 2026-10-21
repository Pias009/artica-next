"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { FEATURES, LINES, type CatalogState, type Facets, type Feature } from "@/lib/catalog-filters";

type Toggle = (key: "features" | "cats" | "colors", value: string) => void;

function Group({ title, picked, onClear, children }: { title: string; picked: number; onClear: () => void; children: ReactNode }) {
  return (
    <section className="min-w-0 border-t border-white/70 pt-5 first:border-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold tracking-[0.16em] text-ink-2 uppercase">
          {title}
          {picked > 0 && <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[10.5px] tracking-normal text-white tabular-nums">{picked}</span>}
        </h3>
        {picked > 0 && (
          <button type="button" onClick={onClear} className="hit-44 relative text-[12.5px] font-semibold text-brand hover:text-brand-deep">
            Clear
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

const Count = ({ n, on }: { n: number; on?: boolean }) => (
  <span className={clsx("ml-auto text-[12px] font-semibold tabular-nums", on ? "text-white/80" : "text-muted")}>{n}</span>
);

const None = () => <p className="text-[13px] text-muted">Nothing here matches the search.</p>;

/** Line, features, category and colour facets. Used in the desktop sidebar and the mobile sheet. */
export function FilterPanel({
  s,
  f,
  onLine,
  onToggle,
  onSet,
  showLine,
}: {
  s: CatalogState;
  f: Facets;
  onLine: (line: CatalogState["line"]) => void;
  onToggle: Toggle;
  onSet: (patch: Partial<CatalogState>) => void;
  showLine?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-5">
      {showLine && (
        <Group title="Line" picked={s.line === "all" ? 0 : 1} onClear={() => onLine("all")}>
          <LineSwitch value={s.line} counts={f.lines} onChange={onLine} className="w-full" />
        </Group>
      )}

      <Group title="Built for" picked={s.features.length} onClear={() => onSet({ features: [] })}>
        <div className="grid grid-cols-1 gap-2">
          {FEATURES.map((x) => {
            const on = s.features.includes(x.id);
            const n = f.features.get(x.id) ?? 0;
            return (
              <button
                key={x.id}
                type="button"
                role="switch"
                aria-checked={on}
                disabled={!on && n === 0}
                onClick={() => onToggle("features", x.id)}
                className={clsx(
                  "flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left transition-[background-color,box-shadow,opacity] duration-300 disabled:opacity-40",
                  on ? "bg-white shadow-[0_8px_20px_-12px_rgb(152_64_128/0.5)] ring-1 ring-brand/35" : "bg-white/45 hover:bg-white/80",
                )}
              >
                <span className={clsx("grid size-9 flex-none place-items-center rounded-xl", on ? "bg-brand text-white" : "bg-white/80 text-ink-2")}>
                  <Icon name={x.icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{x.label}</span>
                  <span className="block truncate text-[12px] text-muted">{x.hint}</span>
                </span>
                {/* switch track */}
                <span aria-hidden className={clsx("relative ml-auto h-6 w-10 flex-none rounded-full transition-colors", on ? "bg-brand" : "bg-ink/12")}>
                  <span className={clsx("absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform duration-300 ease-soft", on && "translate-x-4")} />
                </span>
                <span className="sr-only">{n} styles</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Category" picked={s.cats.length} onClear={() => onSet({ cats: [] })}>
        {!f.cats.length && <None />}
        <div className="flex flex-wrap gap-1.5">
          {f.cats.map((c) => {
            const on = s.cats.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={on}
                disabled={!on && c.count === 0}
                onClick={() => onToggle("cats", c.name)}
                className={clsx(
                  "inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-300",
                  on ? "bg-ink text-white shadow-soft" : "bg-white/55 text-ink-2 ring-1 ring-white/80 hover:bg-white hover:text-ink",
                )}
              >
                {on && <Icon name="check" className="size-3.5" />}
                {c.name}
                <Count n={c.count} on={on} />
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Colour" picked={s.colors.length} onClear={() => onSet({ colors: [] })}>
        {!f.colors.length && <None />}
        <div className="grid grid-cols-2 gap-1.5">
          {f.colors.map((c) => {
            const on = s.colors.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={on}
                disabled={!on && c.count === 0}
                onClick={() => onToggle("colors", c.name)}
                className={clsx(
                  "flex h-11 items-center gap-2 rounded-xl px-2.5 text-[13px] font-semibold transition-[background-color,box-shadow] duration-300",
                  on ? "bg-white shadow-soft ring-2 ring-brand/60" : "bg-white/45 hover:bg-white/85",
                )}
              >
                <span className="relative size-5 flex-none rounded-full inset-ring inset-ring-ink/15" style={{ background: c.hex }}>
                  {on && <Icon name="check" className="absolute inset-0 m-auto size-3 stroke-[2.4] text-white mix-blend-difference" />}
                </span>
                <span className="truncate">{c.name}</span>
                <Count n={c.count} />
              </button>
            );
          })}
        </div>
      </Group>
    </div>
  );
}

/** Segmented All / Women / Men / Kids control with live counts. */
export function LineSwitch({
  value,
  counts,
  onChange,
  className,
}: {
  value: CatalogState["line"];
  counts: Map<string, number>;
  onChange: (line: CatalogState["line"]) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Product line" className={clsx("flex gap-1 rounded-full bg-white/45 p-1 ring-1 ring-white/80", className)}>
      {LINES.map((l) => {
        const on = value === l.id;
        const n = counts.get(l.id) ?? 0;
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={on}
            disabled={!on && n === 0}
            onClick={() => onChange(l.id)}
            className={clsx(
              "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-300 disabled:opacity-40",
              on ? "bg-ink text-white shadow-soft" : "text-ink-2 hover:bg-white/80 hover:text-ink",
            )}
          >
            <Icon name={l.icon} className="size-4 max-sm:hidden" />
            {l.label}
            <span className={clsx("text-[11.5px] tabular-nums", on ? "text-white/70" : "text-muted")}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Removable chips for everything narrowing the list. */
export function ActiveChips({
  s,
  onLine,
  onToggle,
  onSet,
}: {
  s: CatalogState;
  onLine: (line: CatalogState["line"]) => void;
  onToggle: Toggle;
  onSet: (patch: Partial<CatalogState>) => void;
}) {
  const chips: { key: string; label: ReactNode; remove: () => void }[] = [
    ...(s.q.trim() ? [{ key: "q", label: <>“{s.q.trim()}”</>, remove: () => onSet({ q: "" }) }] : []),
    ...(s.line !== "all" ? [{ key: "line", label: LINES.find((l) => l.id === s.line)?.label, remove: () => onLine("all") }] : []),
    ...s.features.map((x: Feature) => ({ key: x, label: FEATURES.find((f) => f.id === x)?.label, remove: () => onToggle("features", x) })),
    ...s.cats.map((x) => ({ key: `c:${x}`, label: x, remove: () => onToggle("cats", x) })),
    ...s.colors.map((x) => ({ key: `k:${x}`, label: x, remove: () => onToggle("colors", x) })),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          aria-label={`Remove filter ${typeof c.label === "string" ? c.label : s.q.trim()}`}
          className="glass inline-flex h-9 items-center gap-1.5 rounded-full pr-2 pl-3.5 text-[13px] font-semibold text-ink transition-colors hover:text-brand"
        >
          {c.label}
          <Icon name="close" className="size-3.5" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => onSet({ q: "", line: "all", features: [], cats: [], colors: [] })}
          className="h-9 px-2 text-[13px] font-semibold text-brand underline-offset-4 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
