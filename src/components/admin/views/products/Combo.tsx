"use client";

import clsx from "clsx";
import { useId, useState } from "react";
import { matchOptions, type Option } from "@/lib/admin/product-draft";

/** Marks a value the form worked out, until the admin changes it. */
export const SuggestedTag = () => <span className="rounded-full bg-[#2f8f5b]/12 px-2 py-0.5 text-[11px] font-semibold text-[#21734a]">Suggested</span>;

export const fieldLabel = "text-[12.5px] font-semibold text-ink/70";
export const fieldInput =
  "w-full rounded-2xl bg-white/80 px-4 py-3 text-[14.5px] ring-1 ring-ink/10 outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink";

/**
 * A text field that suggests as you type, from what the catalogue already says. Arrow keys and Enter pick a suggestion,
 * Escape closes the list, and anything else can still be typed.
 */
export function Combo({
  label,
  value,
  options,
  onChange,
  onPick,
  max,
  placeholder,
  suggested,
  error,
  hint,
}: {
  label?: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  /** A suggestion was chosen (onChange runs too). */
  onPick?: (o: Option) => void;
  max?: number;
  placeholder?: string;
  suggested?: boolean;
  error?: string | null;
  hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = matchOptions(options, value);
  const showing = open && list.length > 0;
  const over = max != null && value.length > max;
  const pick = (o: Option) => {
    onChange(o.value);
    onPick?.(o);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative min-w-0">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor={id} className={clsx(fieldLabel, "flex items-center gap-2")}>
            {label} {suggested && <SuggestedTag />}
          </label>
          {max != null && <span className={clsx("text-[12px] tabular-nums", over ? "font-semibold text-danger" : "text-ink/45")}>{`${value.length}/${max}`}</span>}
        </div>
      )}
      <input
        id={id}
        role="combobox"
        aria-label={label ? undefined : placeholder}
        aria-expanded={showing}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showing && active >= 0 ? `${id}-${active}` : undefined}
        aria-invalid={over || !!error || undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && showing) {
            e.preventDefault();
            setOpen(false);
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!showing) return setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + step + list.length) % list.length);
          } else if (e.key === "Enter" && showing && active >= 0) {
            e.preventDefault();
            pick(list[active]);
          }
        }}
        className={clsx(fieldInput, error && "ring-danger")}
      />
      {error && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-[12px] text-ink/50">{hint}</p>}
      {showing && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={label ?? placeholder}
          className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-14px_rgb(18_20_22/.4)] ring-1 ring-ink/10"
        >
          {list.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              // not onClick: the field would lose focus first and close the list
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              className={clsx("flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[14px]", i === active && "bg-ink/[0.06]")}
            >
              {o.hex && <span className="size-3.5 flex-none rounded-full ring-1 ring-ink/15" style={{ background: o.hex }} />}
              <span className="min-w-0 flex-1 truncate">{o.value}</span>
              {o.note && <span className="flex-none text-[12px] text-ink/45 tabular-nums">{o.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A short list of values (tags, sizes) as removable chips: Enter or a comma adds what's typed. */
export function Chips({
  label,
  values,
  onChange,
  options = [],
  placeholder,
  suggested,
  ideas = [],
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  options?: Option[];
  placeholder?: string;
  suggested?: boolean;
  /** One-tap additions, shown under the field. */
  ideas?: string[];
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setDraft("");
  };
  const list = matchOptions(options, draft, 6).filter((o) => !values.includes(o.value));
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={clsx(fieldLabel, "mb-1.5 flex items-center gap-2")}>
        {label} {suggested && <SuggestedTag />}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/80 p-2 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-ink/[0.07] py-1 pr-1 pl-3 text-[13px] font-medium">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="grid size-5 place-items-center rounded-full hover:bg-ink/10">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3 fill-none stroke-current stroke-[2.4]">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
          onBlur={() => add(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          className="min-h-8 min-w-24 flex-1 bg-transparent px-2 text-[14px] outline-none placeholder:text-ink/35"
        />
      </div>
      {(ideas.length > 0 || (draft && list.length > 0)) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[...new Set([...ideas.filter((v) => !values.includes(v)), ...(draft ? list.map((o) => o.value) : [])])].map((v) => (
            <button
              key={v}
              type="button"
              // not onClick: leaving the field would add the half-typed word first
              onMouseDown={(e) => {
                e.preventDefault();
                add(v);
              }}
              className="min-h-7 rounded-full px-2.5 text-[12.5px] font-medium text-ink/65 ring-1 ring-ink/15 transition-colors hover:bg-white hover:text-ink"
            >
              + {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
