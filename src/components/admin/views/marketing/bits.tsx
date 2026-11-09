"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { CountUp, flash } from "../../ui";
import type { SaveResult } from "@/app/admin/content-actions";
import type { Priority } from "@/lib/marketing/model";

/* The small parts the Marketing and Social views share, in the panel's frosted style. */

/**
 * Runs a server action: pending while it runs, its error if it refuses, and on success a confirmation and a fresh read
 * of the page's data (router.refresh), so every list shows what the database now holds.
 */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = <R extends SaveResult>(fn: () => Promise<R>, done?: string | ((r: R) => string), after?: (r: R) => void) =>
    new Promise<R | null>((resolve) =>
      start(async () => {
        try {
          const r = await fn();
          if (r.ok) {
            setError(null);
            if (done) flash(typeof done === "string" ? done : done(r));
            after?.(r);
            router.refresh();
          } else setError(r.error);
          resolve(r);
        } catch {
          setError("Couldn't reach the server. Check your connection and try again.");
          resolve(null);
        }
      }),
    );
  return { run, pending, error, clearError: () => setError(null) };
}

export function Btn({
  children,
  onClick,
  tone = "dark",
  disabled,
  type = "button",
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "dark" | "light" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold whitespace-nowrap transition-[transform,background-color,color] hover:scale-[1.03] active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
        tone === "dark" && "bg-ink text-white",
        tone === "light" && "bg-white/85 text-ink ring-1 ring-ink/10 hover:bg-white",
        tone === "ghost" && "text-ink/65 hover:bg-ink/[0.06] hover:text-ink",
        tone === "danger" && "bg-danger/[0.08] text-danger hover:bg-danger/[0.14]",
        className,
      )}
    >
      {children}
    </button>
  );
}

const PRIORITY_TONE: Record<Priority, string> = {
  vip: "bg-ink text-white",
  high: "bg-[#2d5d6f] text-white",
  normal: "bg-ink/[0.08] text-ink",
  low: "bg-ink/[0.04] text-ink/55",
};
export function Pill({ children, tone = "soft", className }: { children: ReactNode; tone?: "soft" | "dark" | "ok" | "warn" | "bad" | Priority; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        tone === "soft" && "bg-ink/[0.06] text-ink/75",
        tone === "dark" && "bg-ink text-white",
        tone === "ok" && "bg-[#2f8f5b]/[0.12] text-[#1f6e43]",
        tone === "warn" && "bg-[#c98a1b]/[0.14] text-[#8a5a00]",
        tone === "bad" && "bg-danger/[0.1] text-danger",
        tone in PRIORITY_TONE && PRIORITY_TONE[tone as Priority],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
  className,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={clsx("mb-1.5 block text-[12.5px] font-semibold text-ink/70", hideLabel && "sr-only")}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-11 w-full rounded-2xl bg-white/80 px-3.5 text-[14px] ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled input of any type (date, datetime-local, search…), styled like Field. */
export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hideLabel,
  className,
  invalid,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hideLabel?: boolean;
  className?: string;
  invalid?: boolean;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={clsx("mb-1.5 block text-[12.5px] font-semibold text-ink/70", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={clsx(
          "min-h-11 w-full rounded-2xl bg-white/80 px-4 text-[14px] ring-1 outline-none transition-shadow placeholder:text-ink/35 focus:ring-2",
          invalid ? "ring-danger focus:ring-danger" : "ring-ink/10 focus:ring-ink",
        )}
      />
      {hint && <p className={clsx("mt-1 text-[12px]", invalid ? "text-danger" : "text-ink/50")}>{hint}</p>}
    </div>
  );
}

/** A big number with its label, for a view's top row. */
export function Stat({ label, value, sub, dark, suffix }: { label: string; value: number; sub?: string; dark?: boolean; suffix?: string }) {
  return (
    <div>
      <p className={clsx("text-[13px] font-semibold", dark ? "text-white/70" : "text-ink/60")}>{label}</p>
      <CountUp value={value} suffix={suffix} className="mt-2 block text-[40px] leading-none font-light" />
      {sub && <p className={clsx("mt-1 text-[12.5px]", dark ? "text-white/55" : "text-ink/50")}>{sub}</p>}
    </div>
  );
}

/** A server action's refusal, inline. */
export function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger/[0.08] px-4 py-2.5 text-[13px] font-medium text-danger">
      {error}
    </p>
  );
}

/** An empty list's message. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl bg-white/50 px-5 py-8 text-center text-[13.5px] text-ink/55">{children}</p>;
}

/** Tabs across the top of a view: the highlight is the panel's Segmented, but scrollable on a phone. */
export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; n?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-full bg-white/55 p-1 ring-1 ring-white/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={clsx(
            "flex min-h-10 flex-none items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
            o.id === value ? "bg-ink text-white" : "text-ink/60 hover:bg-white/70 hover:text-ink",
          )}
        >
          {o.label}
          {o.n != null && (
            <span className={clsx("rounded-full px-1.5 text-[11px] tabular-nums", o.id === value ? "bg-white/20" : "bg-ink/[0.07]")}>{o.n.toLocaleString("en-US")}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Keeps the open tab in the address (?tab=), so a reload or a shared link opens the same tab. */
export function useTab<T extends string>(initial: T, valid: readonly T[]) {
  const [tab, setTab] = useState<T>(valid.includes(initial) ? initial : valid[0]);
  const change = (t: T) => {
    setTab(t);
    const url = new URL(location.href);
    url.searchParams.set("tab", t);
    history.replaceState(history.state, "", url);
  };
  return [tab, change] as const;
}

/** A local date-time input's value ("2026-11-08T09:30") for an ISO time, in this browser's time zone. */
export const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not set";

/** Saves rows as a CSV file (the admin panel runs in a normal browser tab, so a download is fine here). */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v);
    // a leading = + - @ would run as a formula in a spreadsheet
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
