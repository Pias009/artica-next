"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/*
 * The admin panel's parts: frosted cards over the blurred room, dark cards for emphasis, and the small animated
 * read-outs (rings, bars, lines, counters). Animation is transform/opacity/stroke only, and the site-wide
 * reduced-motion rule (globals.css) stills all of it.
 */

/** A card. `i` staggers its entrance when a view opens. */
export function Card({ tone = "glass", i = 0, className, children }: { tone?: "glass" | "dark"; i?: number; className?: string; children: ReactNode }) {
  return (
    <section
      style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
      className={clsx(
        "relative min-w-0 rounded-[28px] p-5 motion-safe:animate-[admin-in_.6s_cubic-bezier(.22,1,.36,1)_both] sm:p-6",
        tone === "glass"
          ? "bg-white/55 text-ink shadow-[inset_0_1px_0_rgb(255_255_255/.7),0_24px_48px_-30px_rgb(18_20_22/.35)] ring-1 ring-white/70"
          : "bg-[linear-gradient(160deg,#4a4c4f,#2c2e30)] text-white shadow-[0_24px_48px_-28px_rgb(18_20_22/.6)] ring-1 ring-white/10",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHead({ title, sub, right, dark }: { title: string; sub?: string; right?: ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
        {sub && <p className={clsx("mt-0.5 text-[12.5px]", dark ? "text-white/60" : "text-ink/55")}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** True one frame after mount, so CSS transitions run from their start state. */
export function useEntered() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up to its value. */
export function CountUp({ value, decimals = 0, suffix = "", className }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) {
      const id = requestAnimationFrame(() => setN(value));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setN(value * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={clsx("tabular-nums", className)}>
      {n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** A progress ring with its value in the middle. */
export function Ring({ value, size = 76, stroke = 4, label, dark }: { value: number; size?: number; stroke?: number; label?: string; dark?: boolean }) {
  const on = useEntered();
  const r = (size - stroke) / 2;
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={dark ? "stroke-white/15" : "stroke-ink/10"} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={on ? 100 - value : 100}
            className={clsx("transition-[stroke-dashoffset] duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)]", dark ? "stroke-white" : "stroke-ink")}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-light" style={{ fontSize: size / 4 }}>
          <CountUp value={value} suffix="%" />
        </span>
      </div>
      {label && <figcaption className={clsx("text-center text-[12px]", dark ? "text-white/70" : "text-ink/60")}>{label}</figcaption>}
    </figure>
  );
}

/** A labelled bar: the value as a share of `max`. */
export function Meter({ label, value, max = 100, dark, suffix = "%" }: { label: string; value: number; max?: number; dark?: boolean; suffix?: string }) {
  const on = useEntered();
  return (
    <div>
      <div className={clsx("flex justify-between text-[12px]", dark ? "text-white/70" : "text-ink/60")}>
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className={clsx("mt-1.5 h-1.5 overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-ink/10")}>
        <div
          className={clsx("h-full origin-left rounded-full transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]", dark ? "bg-white" : "bg-ink")}
          style={{ transform: `scaleX(${on ? value / max : 0})` }}
        />
      </div>
    </div>
  );
}

/** The week as standing pins: a thin stem with a knob, tallest day highlighted. */
export function PinBars({ data }: { data: { day: string; n: number }[] }) {
  const on = useEntered();
  const max = Math.max(...data.map((d) => d.n));
  return (
    <div className="flex h-full min-h-36 items-end justify-between gap-2" role="img" aria-label={data.map((d) => `${d.day} ${d.n}`).join(", ")}>
      {data.map((d, i) => {
        const top = d.n === max;
        return (
          <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex w-full flex-1 items-end justify-center">
              <div
                className={clsx("w-[3px] origin-bottom rounded-full transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]", top ? "bg-ink" : "bg-white shadow-[0_0_0_1px_rgb(18_20_22/.06)]")}
                style={{ height: `${(d.n / max) * 100}%`, transform: `scaleY(${on ? 1 : 0})`, transitionDelay: `${i * 50}ms` }}
              />
              <span
                className={clsx("absolute size-2.5 rounded-full ring-2 transition-[bottom] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)]", top ? "bg-ink ring-white" : "bg-white ring-ink/10")}
                style={{ bottom: on ? `calc(${(d.n / max) * 100}% - 5px)` : "-5px", transitionDelay: `${i * 50}ms` }}
              />
            </div>
            <span className={clsx("text-[12px]", top ? "font-semibold" : "text-ink/55")}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A smooth line through the values, drawn in on mount. Optional filled area underneath. */
export function LineChart({ values, labels, dark, area, height = 120, second }: { values: number[]; labels?: string[]; dark?: boolean; area?: boolean; height?: number; second?: number[] }) {
  const id = useId();
  const on = useEntered();
  const W = 300;
  const H = height;
  const all = [...values, ...(second ?? [])];
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.05;
  const pts = (vs: number[]) => vs.map((v, i) => [(i / (vs.length - 1)) * W, H - ((v - min) / (max - min)) * H] as const);
  const smooth = (p: readonly (readonly [number, number])[]) =>
    p.reduce((d, [x, y], i) => {
      if (!i) return `M${x},${y}`;
      const [px, py] = p[i - 1];
      const cx = (px + x) / 2;
      return `${d} C${cx},${py} ${cx},${y} ${x},${y}`;
    }, "");
  const line = smooth(pts(values));
  const stroke = dark ? "stroke-white" : "stroke-ink";
  return (
    <div>
      <svg viewBox={`0 -6 ${W} ${H + 12}`} className="w-full overflow-visible" preserveAspectRatio="none" style={{ height: H }} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={dark ? "#fff" : "#121416"} stopOpacity=".28" />
            <stop offset="1" stopColor={dark ? "#fff" : "#121416"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} className={clsx("transition-opacity delay-300 duration-700", on ? "opacity-100" : "opacity-0")} />}
        {second && (
          <path
            d={smooth(pts(second))}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 4"
            className={clsx(stroke, "opacity-50 transition-opacity delay-500 duration-700", !on && "opacity-0!")}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={line}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={on ? 0 : 1}
          className={clsx(stroke, "transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)]")}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {labels && (
        <div className={clsx("mt-2 flex justify-between text-[11.5px]", dark ? "text-white/55" : "text-ink/50")}>
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** An on/off switch. */
export function Toggle({ checked, onChange, label, dark }: { checked: boolean; onChange: (v: boolean) => void; label: string; dark?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-10 flex-none items-center rounded-full p-0.5 transition-colors duration-300",
        checked ? (dark ? "bg-white" : "bg-ink") : dark ? "bg-white/20" : "bg-ink/15",
      )}
    >
      <span
        className={clsx(
          "size-5 rounded-full shadow-sm transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
          checked ? "translate-x-4" : "translate-x-0",
          checked && dark ? "bg-ink" : "bg-white",
        )}
      />
    </button>
  );
}

/** A row of choices, one selected; the highlight slides between them. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const i = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div role="group" aria-label={label} className="relative inline-grid rounded-full bg-ink/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_1px_3px_rgb(18_20_22/.15)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={clsx("relative min-h-9 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors", o.id === value ? "text-ink" : "text-ink/55 hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A text field with a visible label and an optional character budget. */
export function Field({ label, value, onChange, max, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; max?: number; multiline?: boolean; placeholder?: string }) {
  const id = useId();
  const over = max != null && value.length > max;
  const cls = "w-full rounded-2xl bg-white/80 px-4 py-3 text-[14.5px] ring-1 ring-ink/10 outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12.5px] font-semibold text-ink/70">
          {label}
        </label>
        {max != null && <span className={clsx("text-[12px] tabular-nums", over ? "font-semibold text-danger" : "text-ink/45")}>{`${value.length}/${max}`}</span>}
      </div>
      {multiline ? (
        <textarea id={id} rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={clsx(cls, "resize-none")} aria-invalid={over || undefined} />
      ) : (
        <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} aria-invalid={over || undefined} />
      )}
    </div>
  );
}

/* ---------- icons the site kit doesn't have ---------- */

const ICONS = {
  home: "M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5",
  sparkle: "M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  gear: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4z",
  page: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10.6 10.6 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.6 6.6A17 17 0 002 12s3.6 7 10 7a10 10 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  send: "M4 12l16-8-6 16-2.5-6.5z",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
} as const;
export type AdminIconName = keyof typeof ICONS;

export function AdminIcon({ name, className }: { name: AdminIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx("fill-none stroke-current stroke-[1.7]", className ?? "size-5")} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ---------- the assistant's typing ---------- */

/**
 * Reveals `text` a few words at a time, like a model streaming its answer; a new `run` replays it, and `onDone`
 * receives the whole text at the end. Instant for reduced motion.
 */
export function useStream(text: string | null, run = 0, onDone?: (text: string) => void) {
  const [shown, setShown] = useState("");
  const [busy, setBusy] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!text) return;
    const finish = () => {
      setShown(text);
      setBusy(false);
      done.current?.(text);
    };
    if (reduced()) {
      const id = requestAnimationFrame(finish);
      return () => cancelAnimationFrame(id);
    }
    const words = text.split(/(\s+)/);
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setShown("");
      setBusy(true);
      timer = setInterval(() => {
        i += 3;
        if (i >= words.length) {
          clearInterval(timer);
          finish();
        } else setShown(words.slice(0, i).join(""));
      }, 45);
    }, 380);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [text, run]);
  return { shown, busy };
}

/** Appears when a view has unsaved edits: discard them, or publish. */
export function SaveBar({ count, onDiscard, onSave }: { count: number; onDiscard: () => void; onSave: () => void }) {
  if (!count) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-4 motion-safe:animate-[admin-in_.4s_cubic-bezier(.22,1,.36,1)_both]">
      <div className="flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-[13.5px] text-white shadow-[0_20px_40px_-16px_rgb(18_20_22/.6)]">
        <span>
          {count} unsaved {count === 1 ? "change" : "changes"}
        </span>
        <button type="button" onClick={onDiscard} className="min-h-9 rounded-full px-3.5 font-semibold text-white/70 transition-colors hover:text-white">
          Discard
        </button>
        <button type="button" onClick={onSave} className="min-h-9 rounded-full bg-white px-4 font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-[.98]">
          Publish
        </button>
      </div>
    </div>
  );
}

/** A placeholder line while the assistant is thinking. */
export function Shimmer({ className }: { className?: string }) {
  return <span className={clsx("block h-3 rounded-full bg-[linear-gradient(90deg,rgb(18_20_22/.06),rgb(18_20_22/.14),rgb(18_20_22/.06))] bg-[length:200%_100%] motion-safe:animate-[admin-shimmer_1.2s_linear_infinite]", className)} />;
}

/** A panel that slides in from the right (a native modal dialog: focus stays inside, Escape closes it). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-[520px] bg-transparent p-3 backdrop:bg-ink/25 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[slide-in-r_.45s_cubic-bezier(.22,1,.36,1)_both]"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-[#f4f4f2]/95 shadow-[0_30px_60px_-20px_rgb(18_20_22/.5)] ring-1 ring-white">
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-ink/[0.06]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </dialog>
  );
}
