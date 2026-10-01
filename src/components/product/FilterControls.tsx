"use client";

import clsx from "clsx";
import type { FormEventHandler } from "react";
import { Icon } from "../Icon";
import { FILTERS, type Filter } from "@/lib/products";

export function SearchBox({
  value,
  onChange,
  onSubmit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  className?: string;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
      className={clsx("flex h-14 items-center gap-2 rounded-full border border-line bg-surface pr-1.5 pl-5 shadow-soft", className)}
    >
      <label htmlFor="q" className="sr-only">
        Search styles
      </label>
      <input
        id="q"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by style, material or code…"
        autoComplete="off"
        className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-muted sm:text-sm"
      />
      <button type="submit" aria-label="Search" className="grid size-11 place-items-center rounded-full bg-accent text-on-accent">
        <Icon name="search" />
      </button>
    </form>
  );
}

export function FilterPills({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-0.5 py-1">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={value === f.id}
          onClick={() => onChange(f.id)}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-chip px-[18px] text-[13.5px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:bg-chip-hover hover:text-ink aria-pressed:bg-accent aria-pressed:text-on-accent"
        >
          <Icon name={f.icon} className="size-4" />
          {f.label}
        </button>
      ))}
    </div>
  );
}
