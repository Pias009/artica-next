"use client";

import clsx from "clsx";
import { useState } from "react";
import { describe, STATUS_LABEL, type Availability } from "@/lib/availability";

const STATUSES = Object.keys(STATUS_LABEL) as Availability["status"][];

/** Status, the date or days that go with it, and a note; with how it will read to buyers. */
export function AvailabilityFields({ value, onSave, pending, dark = false, saveLabel = "Save availability" }: { value?: Availability; onSave: (a: Availability) => void; pending: boolean; dark?: boolean; saveLabel?: string }) {
  const [a, setA] = useState<Availability>(() => value ?? { status: "order" });
  const field = clsx("min-h-9 rounded-full px-3 text-[13px] outline-none", dark ? "bg-white text-ink" : "bg-white ring-1 ring-ink/10 focus:ring-2 focus:ring-ink");
  const label = dark ? "text-[11px] font-semibold text-white/70" : "text-[12px] font-semibold text-ink/60";
  const clean: Availability = {
    status: a.status,
    ...(a.status === "production" && a.shipsFrom && { shipsFrom: a.shipsFrom }),
    ...((a.status === "stock" || a.status === "order") && a.days && { days: a.days }),
    ...(a.note?.trim() && { note: a.note.trim() }),
  };
  const same = JSON.stringify(clean) === JSON.stringify(value ?? { status: "order" });
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">
          <span className={label}>Status</span>
          <select aria-label="Availability" value={a.status} onChange={(e) => setA({ ...a, status: e.target.value as Availability["status"] })} className={field}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        {a.status === "production" && (
          <label className="grid gap-1">
            <span className={label}>Ships from</span>
            <input type="date" aria-label="Ships from" value={a.shipsFrom ?? ""} onChange={(e) => setA({ ...a, shipsFrom: e.target.value || undefined })} className={field} />
          </label>
        )}
        {(a.status === "stock" || a.status === "order") && (
          <label className="grid gap-1">
            <span className={label}>{a.status === "stock" ? "Ships in (days)" : "Lead time (days, if not the usual)"}</span>
            <input
              inputMode="numeric"
              aria-label={a.status === "stock" ? "Ships in days" : "Lead time in days"}
              value={a.days ?? ""}
              placeholder={a.status === "stock" ? "7" : "45"}
              onChange={(e) => setA({ ...a, days: Number(e.target.value.replace(/\D/g, "")) || undefined })}
              className={clsx(field, "w-24 tabular-nums")}
            />
          </label>
        )}
        <label className="grid min-w-48 flex-1 gap-1">
          <span className={label}>Note for buyers (optional)</span>
          <input aria-label="Availability note" maxLength={120} value={a.note ?? ""} placeholder="e.g. Black only until March" onChange={(e) => setA({ ...a, note: e.target.value })} className={field} />
        </label>
        <button
          type="button"
          disabled={pending || same}
          onClick={() => onSave(clean)}
          className={dark ? "min-h-9 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-ink disabled:opacity-50" : "min-h-9 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white disabled:opacity-40"}
        >
          {pending ? "Saving…" : saveLabel}
        </button>
      </div>
      <p className={dark ? "text-[12px] text-white/70" : "text-[12.5px] text-ink/55"}>Buyers see: “{describe(clean).text}”</p>
    </div>
  );
}
