"use client";

import clsx from "clsx";
import { useId, useState, type ReactNode } from "react";
import { addDays, fmt, seasonName, windowKey, type CashMonth, type Timed, type Verdict } from "@/lib/planner";

/* The business planner's building blocks: numbered steps, number fields, the season timeline and the cash chart. */

export const VERDICT: Record<Verdict, { label: string; tone: string; dot: string }> = {
  "on-time": { label: "On time", tone: "text-[#24734a]", dot: "bg-[#2f8f5b]" },
  tight: { label: "Tight", tone: "text-[#8a5a0b]", dot: "bg-[#c98a1b]" },
  late: { label: "Too late", tone: "text-danger", dot: "bg-danger" },
};

export function VerdictTag({ v, className }: { v: Verdict; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap", VERDICT[v].tone, className)}>
      <span aria-hidden="true" className={clsx("size-2 rounded-full", VERDICT[v].dot)} />
      {VERDICT[v].label}
    </span>
  );
}

/** One step of the plan: a number, a title and a line on what it's for. */
export function Step({ n, id, title, sub, children }: { n: number; id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-36 border-t border-line pt-8 first:border-t-0 first:pt-0 print:break-inside-avoid">
      <div className="flex items-baseline gap-3">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white tabular-nums">
          {n}
        </span>
        <div>
          <h2 id={`${id}-h`} className="font-headline text-[clamp(22px,2.4vw,28px)] leading-tight font-semibold tracking-[-0.015em]">
            {title}
          </h2>
          {sub && <p className="mt-1 max-w-[62ch] text-[15px] text-ink-2">{sub}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * A number with a visible label, an optional prefix ($) or suffix (%), and a hint. What's typed is kept as-is until
 * it's a valid number in range, so "1500" isn't clamped at its first digit; leaving the field tidies it up.
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1e9,
  step = 1,
  prefix,
  suffix,
  hint,
  placeholder,
  className,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  hint?: ReactNode;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shown = draft ?? (value || value === 0 ? (placeholder && !value ? "" : String(Math.round(value * 100) / 100)) : "");
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[14px] font-semibold">
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-xl border border-ink/12 bg-white transition-colors focus-within:border-ink">
        {prefix && <span className="pl-3.5 text-[15px] text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={shown}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() && Number.isFinite(n) && n >= min && n <= max) onChange(n);
            if (!e.target.value.trim() && placeholder) onChange(0);
          }}
          onBlur={() => {
            if (draft !== null && draft.trim()) onChange(clamp(Number(draft) || min));
            setDraft(null);
          }}
          className={clsx(
            "w-full min-w-0 bg-transparent py-3 text-base outline-none tabular-nums placeholder:text-muted sm:text-[15px]",
            prefix ? "pl-1.5" : "pl-3.5",
            suffix ? "pr-1" : "pr-3.5",
          )}
        />
        {suffix && <span className="pr-3.5 text-[15px] text-muted">{suffix}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] leading-snug text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** A pill group: one choice (radio) or several (checkbox). */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  multi = false,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multi?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id])}
              className={clsx(
                "min-h-11 rounded-full px-4 text-[14px] font-semibold transition-colors",
                on ? "bg-ink text-white" : "bg-chip text-ink hover:bg-chip-hover",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const Track = ({ children, className }: { children?: ReactNode; className?: string }) => <div className={clsx("relative h-9", className)}>{children}</div>;
const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });

/**
 * The next 14 months: each selling season as a bar, coloured by whether stock ordered today makes it, with its
 * order-by date. Lines mark today and when an order placed today would be on the shelf. Rows are buttons: picking
 * one plans for that season.
 */
export function Timeline({
  windows,
  today,
  arrival,
  target,
  recommended,
  onPick,
}: {
  windows: Timed[];
  today: Date;
  arrival: Date;
  target: string;
  recommended?: string;
  onPick: (key: string) => void;
}) {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 14, 1);
  const span = end.getTime() - start.getTime();
  const x = (d: Date) => Math.min(1, Math.max(0, (d.getTime() - start.getTime()) / span));
  const months = Array.from({ length: 14 }, (_, i) => new Date(today.getFullYear(), today.getMonth() + i, 1));
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className="rounded-shell bg-tile p-[clamp(14px,2.4vw,28px)]">
      <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="hidden sm:block" />
        <Track className="h-6">
          {months.map((m, i) => (
            <span key={i} className={clsx("absolute top-0 text-[12px] text-muted", i % 2 && "max-sm:hidden")} style={{ left: pct(x(m)) }}>
              {m.getMonth() === 0 ? m.getFullYear() : month(m)}
            </span>
          ))}
        </Track>
      </div>
      <ul className="relative mt-1 grid gap-1.5" aria-label="Selling seasons in the next 14 months">
        {windows.map((w) => {
          const key = windowKey(w);
          const on = key === target;
          const v = VERDICT[w.verdict];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onPick(key)}
                aria-pressed={on}
                className={clsx(
                  "grid w-full grid-cols-1 items-center gap-x-5 gap-y-1 rounded-[14px] px-3 py-2 text-left transition-colors sm:grid-cols-[200px_minmax(0,1fr)]",
                  on ? "bg-white shadow-[0_1px_0_rgb(18_20_22/0.06),0_0_0_1.5px_var(--color-ink)]" : "hover:bg-white/70",
                )}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="text-[15px] font-semibold">
                      {seasonName(w.season)} {w.start.getFullYear() !== today.getFullYear() && w.start.getFullYear()}
                    </span>
                    {recommended === key && <span className="rounded-full bg-ink px-2 py-0.5 text-[11.5px] font-semibold text-white">Buy for this</span>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
                    <VerdictTag v={w.verdict} />
                    <span className="tabular-nums">{w.verdict === "late" ? "Order date passed" : `Order by ${fmt.date(w.orderBy)}`}</span>
                  </span>
                </span>
                <Track>
                  <span aria-hidden="true" className="absolute inset-y-3 right-0 left-0 rounded-full bg-ink/[0.05]" />
                  <span
                    aria-hidden="true"
                    className={clsx("absolute inset-y-1.5 rounded-full", v.dot, w.verdict === "late" ? "opacity-35" : "opacity-85")}
                    style={{ left: pct(x(w.start)), width: pct(Math.max(0.01, x(addDays(w.end, 1)) - x(w.start))) }}
                  />
                  {w.verdict !== "late" && w.orderBy >= today && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-ink"
                      style={{ left: pct(x(w.orderBy)) }}
                      title={`Order by ${fmt.date(w.orderBy)}`}
                    />
                  )}
                </Track>
              </button>
            </li>
          );
        })}
        <li aria-hidden="true" className="pointer-events-none absolute inset-0 hidden grid-cols-[200px_minmax(0,1fr)] gap-x-5 px-3 sm:grid">
          <span />
          <span className="relative">
            <span className="absolute -top-1 bottom-0 w-0 border-l border-ink/60" style={{ left: pct(x(today)) }}>
              <span className="absolute -top-5 -translate-x-1/2 rounded bg-ink px-1.5 text-[11px] font-semibold text-white">Today</span>
            </span>
            {arrival < end && (
              <span className="absolute -top-1 bottom-0 w-0 border-l-2 border-brand/70" style={{ left: pct(x(arrival)) }}>
                <span className="absolute -bottom-6 -translate-x-1/2 rounded bg-brand px-1.5 text-[11px] font-semibold whitespace-nowrap text-white">
                  Ordered today, lands
                </span>
              </span>
            )}
          </span>
        </li>
      </ul>
      <p className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <span>
          <span aria-hidden="true" className="mr-1.5 inline-block h-3 w-0 border-l-2 border-dashed border-ink align-middle" />
          Order-by date
        </span>
        <span className="hidden sm:inline">
          <span aria-hidden="true" className="mr-1.5 inline-block h-3 w-0 border-l-2 border-brand/70 align-middle" />
          Stock ordered today on your shelf: {fmt.date(arrival)}
        </span>
        <span className="sm:hidden">Ordered today, on your shelf {fmt.date(arrival)}</span>
      </p>
    </div>
  );
}

/** Month by month: money out (below the line), money in (above) and the running balance; the numbers in a table. */
export function CashChart({ months, peak }: { months: CashMonth[]; peak: number }) {
  const W = Math.max(56, Math.round(760 / Math.max(1, months.length)));
  const PAD = 12;
  const H = 180;
  const top = Math.max(1, ...months.map((m) => Math.max(m.in, m.balance)));
  const bottom = Math.max(1, ...months.map((m) => Math.max(m.out, -m.balance)));
  const zero = PAD + (H * top) / (top + bottom);
  const y = (v: number) => zero - (v / (top + bottom)) * H;
  const line = months.map((m, i) => `${i * W + W / 2},${y(m.balance).toFixed(1)}`).join(" ");
  const label = (m: CashMonth) => m.month.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  const bar = Math.min(40, W - 20);
  return (
    <figure className="rounded-shell bg-tile p-[clamp(14px,2.4vw,28px)]">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${months.length * W} ${H + PAD * 2 + 22}`}
          className="h-[220px] min-w-[480px] w-full"
          role="img"
          aria-label={`Cash by month. The most tied up at once is ${fmt.usd(peak)}; the table below has every month.`}
        >
          <line x1="0" x2={months.length * W} y1={zero} y2={zero} className="stroke-ink/25" />
          {months.map((m, i) => (
            <g key={i}>
              {m.in > 0 && <rect x={i * W + (W - bar) / 2} width={bar} y={y(m.in)} height={zero - y(m.in)} rx="3" className="fill-[#2f8f5b]/75" />}
              {m.out > 0 && <rect x={i * W + (W - bar) / 2} width={bar} y={zero} height={y(-m.out) - zero} rx="3" className="fill-ink/70" />}
              <text x={i * W + W / 2} y={H + PAD * 2 + 16} textAnchor="middle" className="fill-muted text-[11px]">
                {label(m)}
              </text>
            </g>
          ))}
          <polyline points={line} fill="none" strokeWidth="2.5" strokeLinejoin="round" className="stroke-brand" />
          {months.map((m, i) => (
            <circle key={i} cx={i * W + W / 2} cy={y(m.balance)} r="3.5" className="fill-white stroke-brand" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <span>
          <span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-sm bg-ink/70 align-middle" />
          Paid out
        </span>
        <span>
          <span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-sm bg-[#2f8f5b]/75 align-middle" />
          Sales in
        </span>
        <span>
          <span aria-hidden="true" className="mr-1.5 inline-block h-0.5 w-4 bg-brand align-middle" />
          Running balance
        </span>
      </figcaption>
      <details className="mt-3 text-[14px]">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold">Show the numbers</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[420px] text-left tabular-nums">
            <thead className="text-[13px] text-muted">
              <tr>
                <th className="py-1 font-normal">Month</th>
                <th className="py-1 font-normal">Paid out</th>
                <th className="py-1 font-normal">Sales in</th>
                <th className="py-1 font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1.5">{label(m)}</td>
                  <td className="py-1.5">{m.out ? fmt.usd(m.out) : "–"}</td>
                  <td className="py-1.5">{m.in ? fmt.usd(m.in) : "–"}</td>
                  <td className={clsx("py-1.5 font-semibold", m.balance < 0 && "text-danger")}>{fmt.usd(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
