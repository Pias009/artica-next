"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { respondToQuote } from "@/app/quote-actions";
import type { BuyerAction } from "@/lib/leads/db";

const MAX = 2000;

/** What each answer opens: its heading, the hint above the message and the send button's label. */
const FORMS: Record<BuyerAction, { button: string; title: string; hint: string; placeholder: string; send: string; required: boolean }> = {
  accept: {
    button: "Accept this quote",
    title: "Accept this quote",
    hint: "The trade desk will confirm the order and the next steps with you. Anything to add, such as a delivery date or a change of size run?",
    placeholder: "Optional: delivery date, size runs, labels…",
    send: "Accept quote",
    required: false,
  },
  samples: {
    button: "Request samples first",
    title: "Request samples first",
    hint: "We'll send one pair per style before you commit. Tell us where to ship them, or anything else the desk should know.",
    placeholder: "Optional: shipping address, courier account, styles you want to see…",
    send: "Request samples",
    required: false,
  },
  question: {
    button: "Ask a question",
    title: "Ask a question",
    hint: "Prices, materials, size runs, lead times: the desk answers by email.",
    placeholder: "Your question",
    send: "Send question",
    required: true,
  },
};

/**
 * The three answers under a quote (or only "Ask a question" while it is being prepared). Each opens a small form with
 * a message, then calls respondToQuote, which checks the signed link again, stores the answer and tells the desk.
 */
export function QuoteActions({ refId, token, actions }: { refId: string; token: string; actions: BuyerAction[] }) {
  const [open, setOpen] = useState<BuyerAction | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BuyerAction | null>(null);
  const [pending, start] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);

  // move to the message as soon as a form opens, so keyboard and screen-reader users land where they type
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  const choose = (a: BuyerAction) => {
    setError(null);
    setOpen((cur) => (cur === a ? null : a));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!open) return;
    const text = message.trim();
    if (FORMS[open].required && !text) {
      setError("Write your question so the desk can answer it.");
      field.current?.focus();
      return;
    }
    const action = open;
    start(async () => {
      setError(null);
      const r = await respondToQuote(refId, token, action, text).catch(() => ({ ok: false as const, error: "Couldn't reach us. Check your connection and try again." }));
      if (r.ok) {
        setDone(action);
        setOpen(null);
        setMessage("");
      } else setError(r.error);
    });
  };

  if (done)
    return (
      <div role="status" className="rounded-shell bg-sage p-6">
        <p className="font-headline text-[22px] leading-tight font-semibold">
          {done === "accept" ? "Quote accepted." : done === "samples" ? "Samples requested." : "Question sent."}
        </p>
        <p className="mt-2 text-[15px] text-ink-2">We&apos;ve told the trade desk. Expect a reply within one working day.</p>
        <button type="button" onClick={() => setDone(null)} className="mt-4 text-[14px] font-semibold text-brand underline-offset-4 hover:underline">
          Send another message
        </button>
      </div>
    );

  const form = open ? FORMS[open] : null;
  return (
    <div>
      <div className="grid gap-2.5">
        {actions.map((a, i) => (
          <button
            key={a}
            type="button"
            onClick={() => choose(a)}
            aria-expanded={open === a}
            aria-controls="quote-answer"
            className={`btn w-full ${i === 0 && actions.length > 1 ? "btn-dark" : "btn-line"} ${open === a ? "ring-2 ring-brand ring-offset-2" : ""}`}
          >
            {FORMS[a].button}
          </button>
        ))}
      </div>

      {form && open && (
        <form id="quote-answer" onSubmit={submit} className="mt-4 rounded-shell bg-tile p-5" noValidate>
          <p className="text-[16px] font-semibold">{form.title}</p>
          <label htmlFor="quote-message" className="mt-1.5 block text-[14px] text-ink-2">
            {form.hint}
          </label>
          <textarea
            id="quote-message"
            ref={field}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            maxLength={MAX}
            rows={4}
            required={form.required}
            aria-invalid={!!error && form.required && !message.trim()}
            aria-describedby="quote-count"
            placeholder={form.placeholder}
            className="field mt-3 resize-y"
          />
          <p id="quote-count" className="mt-1 text-right text-[12px] text-muted tabular-nums">
            {message.length.toLocaleString("en-US")} / {MAX.toLocaleString("en-US")}
          </p>
          {error && (
            <p role="alert" className="mt-2 rounded-xl bg-blush p-3 text-[14px] font-medium text-danger">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn btn-dark">
              {pending ? "Sending…" : form.send}
            </button>
            <button type="button" disabled={pending} onClick={() => setOpen(null)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
