"use client";

import { useState } from "react";
import { TIERS, type PriceRow, type TierKey } from "@/lib/admin/prices";

const toText = (row: PriceRow = {}) => Object.fromEntries(TIERS.map((t) => [t.key, row[t.key] ? String(row[t.key]) : ""])) as Record<TierKey, string>;
const toRow = (text: Record<TierKey, string>): PriceRow =>
  Object.fromEntries(TIERS.flatMap((t) => (Number(text[t.key]) > 0 ? [[t.key, Math.round(Number(text[t.key]) * 100) / 100]] : []))) as PriceRow;

/** Three prices per pair, one per order size, and a save button. Used on a style's page and in the bulk bar. */
export function PriceFields({ value, onSave, pending, dark = false, saveLabel = "Save prices" }: { value?: PriceRow; onSave: (row: PriceRow) => void; pending: boolean; dark?: boolean; saveLabel?: string }) {
  const [text, setText] = useState(() => toText(value));
  const row = toRow(text);
  const bad = TIERS.some((t) => text[t.key].trim() && !(Number(text[t.key]) > 0 && Number(text[t.key]) <= 10_000));
  const same = JSON.stringify(row) === JSON.stringify(toRow(toText(value)));
  return (
    <div className="flex flex-wrap items-end gap-2">
      {TIERS.map((t) => (
        <label key={t.key} className="grid gap-1">
          <span className={dark ? "text-[11px] font-semibold text-white/70" : "text-[12px] font-semibold text-ink/60"}>{t.label}</span>
          <span className="flex items-center rounded-full bg-white pl-3 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
            <span className="text-[13px] text-ink/50">$</span>
            <input
              inputMode="decimal"
              aria-label={`Price per pair, ${t.label}`}
              value={text[t.key]}
              onChange={(e) => setText({ ...text, [t.key]: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="0.00"
              className="min-h-9 w-20 bg-transparent px-1.5 text-[13.5px] text-ink tabular-nums outline-none"
            />
          </span>
        </label>
      ))}
      <button
        type="button"
        disabled={pending || bad || same}
        onClick={() => onSave(row)}
        className={dark ? "min-h-9 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-ink disabled:opacity-50" : "min-h-9 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white disabled:opacity-40"}
      >
        {pending ? "Saving…" : saveLabel}
      </button>
      {bad && <span className={dark ? "text-[12px] text-[#ffb4a8]" : "text-[12px] text-danger"}>Prices are numbers up to 10,000.</span>}
    </div>
  );
}
