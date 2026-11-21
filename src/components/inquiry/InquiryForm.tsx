"use client";

import clsx from "clsx";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { InquiryLines } from "./InquiryLines";
import { submitInquiry, type InquiryResult } from "@/app/actions";
import { whatsappLink } from "@/lib/company";
import { LEAD } from "@/lib/products";
import { useInquiry, useUI, type BuyerType } from "@/lib/store";
import { tagEvent } from "@/lib/marketing/tags";

/** Where the order ships: the main markets first, then "Other" for anywhere else. */
export const SHIP_TO = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Netherlands",
  "Italy",
  "Spain",
  "Poland",
  "Australia",
  "New Zealand",
  "United Arab Emirates",
  "Saudi Arabia",
  "Japan",
  "South Korea",
  "Mexico",
  "Brazil",
  "Chile",
  "South Africa",
  "Other",
];

const BUYER_TYPES: [BuyerType, string][] = [
  ["Retailer", "Retailer"],
  ["Distributor", "Distributor"],
  ["Private label brand", "Private label"],
];

type Variant = "drawer" | "page";

/** Inquiry list + buyer form. Remounted (via key) to start a new inquiry. */
export function InquiryPanel({ variant, onNavigate }: { variant: Variant; onNavigate?: () => void }) {
  const [round, setRound] = useState(0);
  return <InquiryForm key={round} variant={variant} onNavigate={onNavigate} onReset={() => setRound((r) => r + 1)} />;
}

function InquiryForm({ variant, onNavigate, onReset }: { variant: Variant; onNavigate?: () => void; onReset: () => void }) {
  const [state, action, pending] = useActionState<InquiryResult, FormData>(submitInquiry, { status: "idle" });
  const lines = useInquiry((s) => s.lines);
  const clear = useInquiry((s) => s.clear);
  const buyerType = useUI((s) => s.buyerType);
  const setBuyerType = useUI((s) => s.setBuyerType);
  const uid = useId();
  const formId = `${uid}-inq`;
  const errors = state.status === "error" ? state.errors : {};
  const isDrawer = variant === "drawer";
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const prefillEmail = useUI((s) => s.prefillEmail);
  const intent = useUI((s) => s.intent);
  // one key per inquiry, kept across retries, so the server stores a double click or a resend only once
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    if (prefillEmail && emailRef.current) emailRef.current.value = prefillEmail.value;
  }, [prefillEmail]);

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const prefillNote = useUI((s) => s.prefillNote);
  useEffect(() => {
    if (prefillNote && noteRef.current) noteRef.current.value = prefillNote.value;
  }, [prefillNote]);

  // a sent inquiry: the ad tags' conversion (only if the visitor agreed to them)
  useEffect(() => {
    if (state.status === "success") tagEvent("lead");
  }, [state]);

  // After a failed submit, move focus to the first field with an error.
  useEffect(() => {
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  if (state.status === "success") {
    const wa = whatsappLink();
    return (
      <div className={clsx("px-2.5 py-10", isDrawer && "overflow-y-auto px-6")}>
        <div className="text-center">
          <div className="mx-auto mb-3.5 grid size-14 place-items-center rounded-full bg-badge-new text-accent">
            <Icon name="check" className="size-[26px]" />
          </div>
          <h3 className="font-headline text-[26px] leading-tight font-semibold tracking-[-0.015em]">Inquiry received</h3>
          <p className="mx-auto mt-2 max-w-[34ch] text-[14px] text-ink-2">{state.summary}</p>
        </div>

        {/* what happens next, so the buyer knows exactly what to expect and when */}
        <ol aria-label="What happens next" className="mx-auto mt-7 grid max-w-[360px] gap-0 text-left">
          {[
            ["Within 24 hours", "Your line sheet and tier pricing, by email."],
            [`About ${LEAD.samples.replace("d", "")} days`, "Samples in your hands, if you'd like them."],
            ["When you're ready", "Confirm styles and sizes; production starts."],
          ].map(([when, what], i, all) => (
            <li key={when} className="relative flex gap-3.5 pb-5 last:pb-0">
              {i < all.length - 1 && <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-px bg-line" />}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white tabular-nums">{i + 1}</span>
              <span className="pt-0.5">
                <b className="block text-[14px] font-semibold">{when}</b>
                <span className="block text-[13.5px] text-ink-2">{what}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-col items-center gap-2.5">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-line">
              <Icon name="whatsapp" className="size-4" /> Prefer WhatsApp? Message us
            </a>
          )}
          {state.demo && (
            <p className="max-w-[34ch] text-center text-[12px] text-muted">Demo mode: email delivery isn&rsquo;t connected yet, so this inquiry was not sent.</p>
          )}
        </div>
        <div className="text-center">
          <button
            type="button"
            className="btn btn-ghost mt-[18px]"
            onClick={() => {
              clear();
              onReset();
            }}
          >
            Start a new inquiry
          </button>
        </div>
      </div>
    );
  }

  const form = (
    <form
      ref={formRef}
      id={formId}
      noValidate
      aria-busy={pending}
      className="mt-[18px] grid gap-3"
      onSubmit={(e) => {
        // Submit manually so React doesn't reset the fields when the server returns errors.
        e.preventDefault();
        const f = e.currentTarget;
        if (!f.checkValidity()) return f.reportValidity();
        const data = new FormData(f);
        // randomUUID exists only on https and localhost; without it the server makes one (no repeat protection)
        keyRef.current ??= crypto.randomUUID?.() ?? "";
        data.set("key", keyRef.current);
        data.set("source", location.pathname);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="intent" value={intent} />
      {/* for spam bots only: hidden from people and from screen readers, never focused */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">I am a</legend>
        <div className="flex flex-wrap gap-1.5">
          {BUYER_TYPES.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="type"
                value={value}
                checked={buyerType === value}
                onChange={() => setBuyerType(value)}
                className="peer sr-only"
              />
              <span className="block rounded-full bg-chip px-3 py-2 text-[12.5px] font-semibold text-ink-2 peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${uid}-company`} label="Company" error={errors.company}>
          <input
            id={`${uid}-company`}
            name="company"
            required
            autoComplete="organization"
            placeholder="Store or company"
            aria-invalid={!!errors.company}
            aria-describedby={errors.company ? `${uid}-company-err` : undefined}
            className="field"
          />
        </Field>
        <Field id={`${uid}-country`} label="Ship to">
          <select id={`${uid}-country`} name="country" autoComplete="country-name" className="field">
            {SHIP_TO.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field id={`${uid}-email`} label="Work email" error={errors.email}>
        <input
          ref={emailRef}
          id={`${uid}-email`}
          name="email"
          defaultValue={prefillEmail?.value}
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${uid}-email-err` : undefined}
          className="field"
        />
      </Field>
      <Field id={`${uid}-note`} label={<>Notes <span className="font-medium text-muted">(optional)</span></>}>
        <textarea ref={noteRef} defaultValue={prefillNote?.value} id={`${uid}-note`} name="note" placeholder="Colors, delivery date, logo…" className="field min-h-[72px] resize-y" />
      </Field>
      {errors.form && (
        <p role="alert" className="text-[12.5px] text-danger">
          {errors.form}
        </p>
      )}
    </form>
  );

  const footer = (
    <div className={clsx("grid gap-2", isDrawer ? "border-t border-line px-6 pt-4 pb-5" : "mt-4")}>
      <button type="submit" form={formId} disabled={pending} className="btn btn-dark h-[50px] w-full">
        {pending ? "Sending…" : "Get line sheet and pricing"}
        <Icon name="arrow" />
      </button>
      <small className="text-center text-[12px] text-muted">Free quote · no payment · tier pricing within 24 hours</small>
      {isDrawer && (
        <Link href="/send-inquiry" onClick={onNavigate} className="text-center text-[13px] font-semibold text-ink-2 underline hover:text-ink">
          Only want to leave your email? Send a quick inquiry
        </Link>
      )}
      {/* the notice that lets the desk send existing buyers trade updates (soft opt-in; Admin → Marketing) */}
      <small className="text-center text-[11.5px] text-muted">
        We may send you occasional trade updates; every one has an unsubscribe link.{" "}
        <a href="/privacy" className="underline hover:text-ink">
          Privacy
        </a>
      </small>
      {whatsappLink() && (
        <a href={whatsappLink()!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
          <Icon name="whatsapp" className="size-4" /> Or message us on WhatsApp
        </a>
      )}
    </div>
  );

  if (isDrawer) {
    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <InquiryLines onNavigate={onNavigate} />
          {form}
        </div>
        {footer}
      </>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-start">
      <div>
        <InquiryLines />
      </div>
      <div className="rounded-card bg-tile p-5 md:sticky md:top-6">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Your details</h2>
        {form}
        {footer}
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
