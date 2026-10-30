"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../Icon";
import { submitInquiry, type InquiryResult } from "@/app/actions";
import type { Card, draftInquiry } from "@/lib/assistant/skills";
import { MOQ_CASES, PACK, STEP_CASES } from "@/lib/products";
import { useInCart, useInquiry, useUI } from "@/lib/store";

/** Styles Kai shows: a row that scrolls sideways in the panel, a grid on the full page. */
export function KaiCards({ cards, wide }: { cards: Card[]; wide?: boolean }) {
  if (!cards.length) return null;
  return (
    <ul className={clsx("gap-2.5", wide ? "grid grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-4" : "-mx-1 flex snap-x overflow-x-auto px-1 pb-1")}>
      {cards.map((c, i) => (
        <li key={c.id} className={clsx("kai-rise snap-start", !wide && "w-[150px] shrink-0")} style={{ "--i": i } as CSSProperties}>
          <StyleCard c={c} />
        </li>
      ))}
    </ul>
  );
}

function StyleCard({ c }: { c: Card }) {
  const listed = useInCart(c.id);
  const toggle = useInquiry((s) => s.toggle);
  const openQuickView = useUI((s) => s.openQuickView);
  return (
    <div className="kai-pane kai-tilt flex h-full flex-col overflow-hidden rounded-[18px]">
      <button type="button" onClick={() => openQuickView(c.id)} className="relative block aspect-[4/3] bg-[radial-gradient(circle_at_50%_70%,rgb(255_255_255/0.9),rgb(255_255_255/0.35)_70%)]" aria-label={`Quick view: ${c.name}`}>
        <Image src={c.image.src} alt="" fill sizes="160px" className="object-contain p-2 drop-shadow-[0_10px_10px_rgb(18_20_22/0.18)]" />
        {c.badge && <span className="absolute top-1.5 left-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[12px] font-semibold">{c.badge}</span>}
      </button>
      <div className="flex flex-1 flex-col p-2.5">
        <Link href={c.url} className="text-[13.5px] leading-tight font-semibold hover:underline">
          {c.name}
        </Link>
        <span className="mt-0.5 mb-2 line-clamp-2 text-[12px] leading-snug text-muted">
          {c.type} · {c.color}
        </span>
        <button
          type="button"
          onClick={() => toggle(c.id)}
          aria-pressed={listed}
          className={clsx(
            "mt-auto inline-flex h-11 items-center justify-center gap-1 rounded-full text-[13px] font-semibold md:h-9 md:text-[12px]",
            listed ? "bg-white/80 text-ink ring-1 ring-ink/10" : "kai-ink text-white",
          )}
        >
          <Icon name={listed ? "check" : "plus"} className="size-3.5" />
          {listed ? "On your list" : "Add to inquiry"}
        </button>
      </div>
    </div>
  );
}

type Draft = ReturnType<typeof draftInquiry>;

/** 16px on phones so iOS doesn't zoom into the field. */
const INPUT = "field h-11 text-[16px] md:h-10 md:text-[13.5px]";

/** A labelled field: the label stays visible while typing, the error sits right under the input. */
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[12px] font-semibold text-ink-2">
      {label}
      {children}
      {error && <span className="font-medium text-danger">{error}</span>}
    </label>
  );
}
const INTENT: Record<Draft["intent"], string> = { quote: "Quote", sample: "Samples", visit: "Factory visit", private_label: "Private label", shipping: "Shipping quote" };

/**
 * The inquiry Kai prepared. The buyer checks the quantities, then adds it to their inquiry list or sends it right
 * here: sending goes through the same server action and checks as the inquiry form, and only this click sends.
 */
export function DraftCard({ draft }: { draft: Draft }) {
  const [cases, setCases] = useState<Record<string, number>>(() => Object.fromEntries(draft.lines.map((l) => [l.id, l.cases])));
  const [step, setStep] = useState<"review" | "send">("review");
  const [result, setResult] = useState<InquiryResult>({ status: "idle" });
  const [key] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : ""));
  const [pending, start] = useTransition();
  const setListCases = useInquiry((s) => s.setCases);
  const showToast = useUI((s) => s.showToast);
  const pairs = draft.lines.reduce((a, l) => a + (cases[l.id] ?? l.cases) * PACK, 0);
  const form = useRef<HTMLFormElement>(null);

  // the form opens below the fold of the panel: bring it into view and start in the first field
  useEffect(() => {
    if (step !== "send" || !form.current) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    form.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    form.current.querySelector<HTMLInputElement>("input[name=company]")?.focus({ preventScroll: true });
  }, [step]);

  if (result.status === "success") {
    return (
      <div className="kai-pane kai-rise rounded-[20px] p-4 text-[13.5px]">
        <p className="flex items-center gap-1.5 font-semibold">
          <Icon name="check" className="size-4" /> Inquiry sent{result.ref ? ` · ${result.ref}` : ""}
        </p>
        <p className="mt-1 text-ink-2">{result.summary}</p>
        {!result.delivered && <p className="mt-1 text-[12px] text-muted">Demo mode: email isn&rsquo;t connected yet, so it wasn&rsquo;t delivered.</p>}
      </div>
    );
  }

  const lines = JSON.stringify(draft.lines.map((l) => ({ id: l.id, cases: cases[l.id] ?? l.cases })));
  const errors = result.status === "error" ? result.errors : {};

  return (
    <div className="kai-pane kai-rise rounded-[20px] p-4 text-[13.5px]">
      <p className="text-[12px] font-bold tracking-[.12em] text-muted uppercase">Inquiry draft · {INTENT[draft.intent]}</p>
      {draft.lines.length ? (
        <ul className="mt-2 grid gap-1.5">
          {draft.lines.map((l) => {
            const n = cases[l.id] ?? l.cases;
            return (
              <li key={l.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  <b className="font-semibold">{l.name}</b> <span className="text-muted">{l.color}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={`Fewer cases of ${l.name}`} disabled={n <= MOQ_CASES} onClick={() => setCases((c) => ({ ...c, [l.id]: Math.max(MOQ_CASES, n - STEP_CASES) }))} className="grid size-11 place-items-center rounded-full bg-white/80 ring-1 ring-ink/10 hover:bg-white disabled:opacity-40 md:size-8">
                    <Icon name="minus" className="size-3" />
                  </button>
                  <span className="w-16 text-center tabular-nums">{n} cases</span>
                  <button type="button" aria-label={`More cases of ${l.name}`} onClick={() => setCases((c) => ({ ...c, [l.id]: n + STEP_CASES }))} className="grid size-11 place-items-center rounded-full bg-white/80 ring-1 ring-ink/10 hover:bg-white md:size-8">
                    <Icon name="plus" className="size-3" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-ink-2">No styles yet: the trade desk will send the full line sheet.</p>
      )}
      {draft.unknown.length > 0 && <p className="mt-1.5 text-[12px] text-muted">Not in the range: {draft.unknown.join(", ")}.</p>}
      {pairs > 0 && <p className="mt-2 text-[12.5px] text-ink-2">{pairs.toLocaleString("en-US")} pairs in all</p>}
      {draft.note && <p className="mt-1.5 text-[12.5px] text-ink-2">Note: {draft.note}</p>}

      {step === "review" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setStep("send")} className="btn btn-dark h-11 px-4 text-[14px] md:h-9 md:text-[13px]">
            Send this inquiry
          </button>
          {draft.lines.length > 0 && (
            <button
              type="button"
              onClick={() => {
                draft.lines.forEach((l) => setListCases(l.id, cases[l.id] ?? l.cases));
                showToast(`${draft.lines.length} style${draft.lines.length > 1 ? "s" : ""} on your inquiry list`);
              }}
              className="btn btn-line h-11 px-4 text-[14px] md:h-9 md:text-[13px]"
            >
              Add to my list
            </button>
          )}
        </div>
      ) : (
        <form
          ref={form}
          className="mt-3 grid scroll-mb-4 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("lines", lines);
            fd.set("intent", draft.intent);
            fd.set("note", [draft.note, "Prepared with Kai, the site assistant."].filter(Boolean).join("\n"));
            fd.set("source", "/assistant");
            if (key) fd.set("key", key);
            start(async () => setResult(await submitInquiry({ status: "idle" }, fd)));
          }}
        >
          <Field label="Company" error={errors.company}>
            <input name="company" required maxLength={200} autoComplete="organization" placeholder="Store or company" aria-invalid={!!errors.company} className={INPUT} />
          </Field>
          <Field label="Work email" error={errors.email}>
            <input name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" placeholder="name@company.com" aria-invalid={!!errors.email} className={INPUT} />
          </Field>
          <Field label="Ship to">
            <input name="country" required maxLength={80} autoComplete="country-name" defaultValue={draft.country ?? ""} placeholder="Country" className={INPUT} />
          </Field>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
          {errors.form && <span role="alert" className="text-[12px] text-danger">{errors.form}</span>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-dark h-11 px-4 text-[14px] md:h-9 md:text-[13px]">
              {pending ? "Sending…" : "Send to the trade desk"}
            </button>
            <button type="button" onClick={() => setStep("review")} className="btn btn-ghost h-11 px-3 text-[14px] md:h-9 md:text-[13px]">
              Back
            </button>
          </div>
          <p className="text-[12px] text-muted">
            Tier pricing comes back within 24 hours. See our <Link href="/privacy" className="underline">privacy policy</Link>.
          </p>
        </form>
      )}
    </div>
  );
}
