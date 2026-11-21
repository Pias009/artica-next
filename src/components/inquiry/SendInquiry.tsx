"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Icon } from "../Icon";
import { SHIP_TO } from "./InquiryForm";
import { addRequestInfo, sendInquiry, type SendResult } from "@/app/actions";
import { tagEvent } from "@/lib/marketing/tags";
import { byId, MOQ_PAIRS, PACK, products } from "@/lib/products";
import { useInquiry } from "@/lib/store";

/** Styles shown from the buyer's list before "and N more"; with no list, how many of the range preview the line sheet. */
const SHOWN = 4;
const PREVIEW = 6;
const SENDS = ["Line sheet", "Tier pricing", "Sample timing"];
const VOLUMES = ["Under 1,000 pairs", "1,000–5,000 pairs", "5,000–20,000 pairs", "Over 20,000 pairs"];

/**
 * "Get your inquiry by email" (/send-inquiry): one line, a box with the inquiry's data (the styles on the buyer's list,
 * or the range when the list is empty) and a box for the email it goes to (sendInquiry in app/actions.ts).
 */
export function SendInquiry() {
  const [round, setRound] = useState(0);
  const lines = useInquiry((s) => s.lines).filter((l) => byId[l.id]);
  return (
    <div className="pt-[clamp(28px,4vw,56px)]">
      <h1 className="max-w-[40ch] font-headline text-[clamp(28px,3vw,42px)] leading-[1.08] font-semibold tracking-[-0.02em]">
        Add your email here. <em>We&rsquo;ll send you the details of your inquiry.</em>
      </h1>
      <div className="mt-[clamp(24px,3vw,40px)] grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5">
        <DataBox lines={lines} />
        <EmailBox key={round} lines={lines} onAgain={() => setRound((r) => r + 1)} />
      </div>
    </div>
  );
}

/** The data that goes out: the buyer's styles with cases and pairs, or the full line sheet when nothing is picked yet. */
function DataBox({ lines }: { lines: Line[] }) {
  const cases = lines.reduce((a, l) => a + l.cases, 0);
  return (
    <section aria-labelledby="inq-data" className="flex min-w-0 flex-col rounded-shell bg-white p-[clamp(20px,3vw,32px)] ring-1 ring-ink/6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="inq-data" className="text-[18px] font-semibold tracking-[-0.01em]">
          {lines.length ? "Your inquiry" : "The full line sheet"}
        </h2>
        <Link href={lines.length ? "/inquiry" : "/catalog"} className="text-[13px] font-semibold text-ink-2 underline hover:text-ink">
          {lines.length ? "Edit list" : "Pick styles first"}
        </Link>
      </div>

      {lines.length ? (
        <>
          <ul className="mt-4 grid gap-2.5">
            {lines.slice(0, SHOWN).map(({ id, cases }) => {
              const p = byId[id];
              return (
                <li key={id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-ph bg-tile p-2.5">
                  <span className="relative h-14 w-16 rounded-xl bg-photo">
                    <Image src={p.outer.src} alt="" fill sizes="64px" className="object-contain p-1.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">{p.name}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {p.color.name} · {p.sizes}
                    </span>
                  </span>
                  <span className="text-right text-[13px] text-ink-2 tabular-nums">
                    <b className="block font-semibold text-ink">{(cases * PACK).toLocaleString("en-US")} pairs</b>
                    {cases} cases
                  </span>
                </li>
              );
            })}
          </ul>
          {lines.length > SHOWN && <p className="mt-2 px-1 text-[13px] text-muted">and {lines.length - SHOWN} more</p>}
          <p className="mt-3 flex justify-between border-t border-line px-1 pt-3 text-[14px] text-ink-2">
            <span>
              {lines.length} style{lines.length > 1 ? "s" : ""} · {cases} cases
            </span>
            <b className="text-ink tabular-nums">{(cases * PACK).toLocaleString("en-US")} pairs</b>
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-muted">
            {products.length} styles · from {MOQ_PAIRS} pairs per style · {PACK} pairs per case
          </p>
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {products.slice(0, PREVIEW).map((p) => (
              <li key={p.id} className="min-w-0 rounded-ph bg-tile p-2 pb-2.5">
                <span className="relative block aspect-square rounded-lg bg-photo">
                  <Image src={p.outer.src} alt="" fill sizes="(min-width: 640px) 110px, 30vw" className="object-contain p-1.5" />
                </span>
                <span className="mt-1.5 block truncate px-0.5 text-[13px] font-semibold">{p.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto pt-5">
        <p className="text-[12.5px] font-semibold text-ink-2">We email you</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {SENDS.map((s) => (
            <li key={s} className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-[12.5px] font-semibold text-ink-2">
              <Icon name="check" className="size-3.5 text-brand" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The email the data goes to, as a dark box. */
function EmailBox({ lines, onAgain }: { lines: Line[]; onAgain: () => void }) {
  return (
    <section aria-label="Your email" className="flex min-w-0 flex-col justify-center rounded-shell bg-ink p-[clamp(20px,3vw,36px)] text-white max-lg:order-first">
      <EmailForm lines={lines} onAgain={onAgain} />
    </section>
  );
}

type Line = { id: string; cases: number };

/**
 * The email field and its send button, on a dark ground (the page's email box, the small "Ask inquiry" box); after
 * sending, where the details went and the reference. `compact` tightens it for the small box.
 */
export function EmailForm({ lines, onAgain, compact = false }: { lines: Line[]; onAgain: () => void; compact?: boolean }) {
  const uid = useId();
  const [state, action, pending] = useActionState<SendResult, FormData>(sendInquiry, { status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  // one key per inquiry, kept across retries, so a double click or a resend is stored once
  const keyRef = useRef<string | null>(null);
  // the key as sent, for the optional second step (it proves to the server that it's the same visitor)
  const [sentKey, setSentKey] = useState("");
  const error = state.status === "error" ? state.error : null;

  useEffect(() => {
    if (state.status === "success") tagEvent("lead");
    if (state.status === "error") inputRef.current?.focus();
  }, [state]);

  if (state.status === "success")
    return (
      <div aria-live="polite">
        <span className={clsx("grid place-items-center rounded-full bg-white text-ink", compact ? "size-10" : "size-12")}>
          <Icon name="check" className={compact ? "size-5" : "size-6"} />
        </span>
        <p className={clsx("font-headline leading-tight font-semibold", compact ? "mt-3 text-[20px]" : "mt-5 text-[26px]")}>Thanks. Your request is in.</p>
        <p className={clsx("mt-2 text-white/75", compact ? "text-[14px]" : "text-[15px]")}>
          Our trade desk is preparing the details of your inquiry (prices, lead time and terms) and will email them to <strong className="font-semibold text-white [overflow-wrap:anywhere]">{state.email}</strong> within one working day. A receipt is on its way now.
        </p>
        {state.ref && (
          <p className="mt-2 text-[13px] text-white/60">
            Your reference <span className="font-semibold text-white tabular-nums">{state.ref}</span>
          </p>
        )}
        <p className="mt-2 text-[12.5px] text-white/60">No receipt in a few minutes? Check the spam or Promotions folder.</p>
        {state.demo && <p className="mt-2 text-[12px] text-white/60">Demo mode: email delivery isn&rsquo;t connected yet, so nothing was sent.</p>}
        {state.ref && sentKey && <MoreInfo inquiryRef={state.ref} sentKey={sentKey} compact={compact} />}
        <div className={clsx("flex flex-wrap gap-2", compact ? "mt-4" : "mt-6")}>
          {!compact && (
            <Link href="/catalog" className="btn h-11! bg-white text-[14px]! text-ink hover:bg-white/90">
              Back to the range <Icon name="arrow" className="size-4" />
            </Link>
          )}
          <button type="button" onClick={onAgain} className="btn h-11! text-[14px]! text-white ring-1 ring-white/25 hover:bg-white/10">
            Send to another email
          </button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        // randomUUID exists only on https and localhost; without it the server makes one (no repeat protection)
        keyRef.current ??= crypto.randomUUID?.() ?? "";
        data.set("key", keyRef.current);
        setSentKey(keyRef.current);
        data.set("source", location.pathname);
        data.set("lines", JSON.stringify(lines));
        startTransition(() => action(data));
      }}
    >
      {/* for spam bots only: hidden from people and from screen readers, never focused */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
      <label htmlFor={`${uid}-email`} className={clsx("flex items-center gap-2 font-semibold", compact ? "text-[14px]" : "text-[15px]")}>
        <Icon name="mail" className="size-4" /> Your email
      </label>
      <input
        ref={inputRef}
        id={`${uid}-email`}
        name="email"
        type="email"
        inputMode="email"
        required
        autoComplete="email"
        placeholder="yourname@gmail.com"
        aria-invalid={!!error}
        aria-describedby={`${uid}-hint`}
        data-autofocus
        className={clsx("field text-[16px] text-ink", compact ? "mt-2 h-12" : "mt-3 h-[56px]")}
      />
      <p id={`${uid}-hint`} role={error ? "alert" : undefined} className={error ? "mt-2 text-[13px] font-medium text-[#ffb4a2]" : "mt-2 text-[13px] text-white/60"}>
        {error ?? "Gmail, Outlook or a work address."}
      </p>
      <button type="submit" disabled={pending} className={clsx("btn w-full bg-white text-ink hover:bg-white/90", compact ? "mt-3 h-12" : "mt-5 h-[54px]")}>
        {pending ? "Sending…" : "Send me the details"}
        <Icon name="arrow" />
      </button>
      <p className="mt-3 text-center text-[12px] text-white/55">
        Free · no payment · no spam.{" "}
        <Link href="/privacy" className="underline hover:text-white">
          Privacy
        </Link>
      </p>
    </form>
  );
}

/**
 * The optional second step after an email request: who they are, where it ships and roughly how many pairs, so the
 * desk can price it sooner (addRequestInfo in app/actions.ts). Every field is optional and "Skip" just hides it.
 */
function MoreInfo({ inquiryRef, sentKey, compact }: { inquiryRef: string; sentKey: string; compact: boolean }) {
  const uid = useId();
  const [phase, setPhase] = useState<"form" | "done" | "skipped">("form");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (phase === "skipped") return null;
  if (phase === "done")
    return (
      <p className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold text-white">
        <Icon name="check" className="size-4" /> Thanks, that helps.
      </p>
    );

  const label = "mb-1 block text-[12.5px] font-semibold text-white/80";
  const input = clsx("field text-[16px] text-ink sm:text-[15px]", compact ? "h-11 py-2" : "h-12");
  return (
    <form
      noValidate
      aria-busy={pending}
      aria-labelledby={`${uid}-title`}
      className={clsx("rounded-card bg-white/8 ring-1 ring-white/12", compact ? "mt-4 p-3.5" : "mt-5 p-4")}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data = { name: String(f.get("name") ?? ""), country: String(f.get("country") ?? ""), volume: String(f.get("volume") ?? "") };
        setError(null);
        start(async () => {
          const r = await addRequestInfo(inquiryRef, sentKey, data).catch(() => ({ ok: false as const, error: "We couldn't add that just now. The desk will still reply by email." }));
          if (r.ok) setPhase("done");
          else setError(r.error);
        });
      }}
    >
      <p id={`${uid}-title`} className={clsx("font-semibold text-white", compact ? "text-[14px]" : "text-[15px]")}>
        Want faster pricing? Tell us a little more
      </p>
      <p className="mt-0.5 text-[12.5px] text-white/60">Optional. Helps the desk quote the right tier.</p>
      <div className={clsx("mt-3 grid gap-2.5", !compact && "sm:grid-cols-2")}>
        <div className={clsx(!compact && "sm:col-span-2")}>
          <label htmlFor={`${uid}-name`} className={label}>
            Name or company
          </label>
          <input id={`${uid}-name`} name="name" autoComplete="organization" maxLength={200} className={input} />
        </div>
        <div>
          <label htmlFor={`${uid}-country`} className={label}>
            Ships to
          </label>
          <select id={`${uid}-country`} name="country" autoComplete="country-name" defaultValue="" className={input}>
            <option value="">Choose a country</option>
            {SHIP_TO.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-volume`} className={label}>
            Volume
          </label>
          <select id={`${uid}-volume`} name="volume" defaultValue="" className={input}>
            <option value="">Choose a range</option>
            {VOLUMES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-[#ffb4a2]">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn h-10! bg-white px-5! text-[14px]! text-ink hover:bg-white/90">
          {pending ? "Sending…" : "Send"}
        </button>
        <button type="button" onClick={() => setPhase("skipped")} className="text-[13px] font-semibold text-white/70 underline hover:text-white">
          Skip
        </button>
      </div>
    </form>
  );
}
