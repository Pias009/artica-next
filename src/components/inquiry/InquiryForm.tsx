"use client";

import clsx from "clsx";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { InquiryLines } from "./InquiryLines";
import { submitInquiry, type InquiryResult } from "@/app/actions";
import { useInquiry, useUI, type BuyerType } from "@/lib/store";

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

  useEffect(() => {
    if (prefillEmail && emailRef.current) emailRef.current.value = prefillEmail.value;
  }, [prefillEmail]);

  // After a failed submit, move focus to the first field with an error.
  useEffect(() => {
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div className={clsx("px-2.5 py-10 text-center", isDrawer && "px-6")}>
        <div className="mx-auto mb-3.5 grid size-14 place-items-center rounded-full bg-badge-new text-accent">
          <Icon name="check" className="size-[26px]" />
        </div>
        <h3 className="text-xl font-extrabold">Inquiry ready</h3>
        <p className="mx-auto mt-2 max-w-[32ch] text-[13.5px] text-ink-2">{state.summary}</p>
        <p className="mt-[18px] text-[11.5px] text-muted">Demo form: connect the server action to your inbox or CRM to receive inquiries.</p>
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
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
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
            <option>United States</option>
            <option>Canada</option>
            <option>Mexico</option>
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
        <textarea id={`${uid}-note`} name="note" placeholder="Colors, delivery date, logo…" className="field min-h-[72px] resize-y" />
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
      <small className="text-center text-[11.5px] text-muted">Wholesale pricing within 24 hours. No commitment.</small>
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
        <h2 className="text-lg font-extrabold">Your details</h2>
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
