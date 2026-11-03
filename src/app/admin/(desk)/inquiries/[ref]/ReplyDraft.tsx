"use client";

import { useState, useTransition } from "react";
import { draftReplyAction } from "../../../actions";
import type { ReplyDraft as Draft } from "@/lib/assistant/reply";

/** Kai drafts the reply; the desk edits it, fills in the prices and sends it from their own mailbox. */
export function ReplyDraft({ inquiryRef, email }: { inquiryRef: string; email: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const make = () =>
    start(async () => {
      const d = await draftReplyAction(inquiryRef);
      setDraft(d);
      setSubject(d?.subject ?? "");
      setBody(d?.body ?? "");
    });

  if (!draft) {
    return (
      <div>
        <p className="text-[13.5px] text-ink-2">
          Kai writes a first reply from this inquiry, the styles, shipping to their country and your terms. Prices stay as [placeholders] for you to fill in.
        </p>
        <button type="button" onClick={make} disabled={pending} className="btn btn-dark mt-3">
          {pending ? "Drafting…" : "Draft a reply with Kai"}
        </button>
      </div>
    );
  }

  // mail apps cut very long links, so the body is shortened for the button; Copy keeps it whole
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
  const unfilled = /\[(tier price|FOB price|date)[^\]]*\]/i.test(body);
  return (
    <div className="grid gap-3">
      <ul className="grid gap-1 rounded-[12px] bg-tile p-3 text-[13px] text-ink-2">
        {draft.summary.map((s) => (
          <li key={s}>· {s}</li>
        ))}
      </ul>
      <label className="grid gap-1 text-[12px] font-semibold text-muted">
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="field text-[13.5px] font-normal text-ink" />
      </label>
      <label className="grid gap-1 text-[12px] font-semibold text-muted">
        Reply
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className="field resize-y text-[13.5px] leading-relaxed font-normal text-ink"
        />
      </label>
      {unfilled && <p className="text-[12.5px] font-semibold text-danger">Fill in the [placeholders] before sending.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <a href={mailto} className="btn btn-dark">
          Open in email
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${subject}\n\n${body}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn btn-line"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={make} disabled={pending} className="btn btn-ghost">
          {pending ? "Drafting…" : "Draft again"}
        </button>
        <span className="text-[12px] text-muted">
          {draft.source === "ai" ? "Written by Kai (AI): check every fact." : "Template (no AI model configured)."}
        </span>
      </div>
    </div>
  );
}
