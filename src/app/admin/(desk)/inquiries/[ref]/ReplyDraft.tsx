"use client";

import { useState, useTransition } from "react";
import { draftReplyAction, sendReplyAction, type ReplyResult } from "../../../actions";
import type { ReplyDraft as Draft } from "@/lib/assistant/reply";
import { fillTemplate, REPLY_BODY_MAX, REPLY_SUBJECT_MAX, REPLY_TEMPLATES } from "@/lib/admin/reply-templates";

/**
 * The reply form on the inquiry page: write it, start from a template, or have Kai draft it, then send it from the
 * trade desk. The email's Reply-To is the desk inbox, so the buyer's answer reaches everyone, and the reply is kept on
 * the inquiry (the Conversation card refreshes once the action revalidates the page). Copy and "Open in my email" stay
 * for anyone who would rather send it themselves.
 */
export function ReplyDraft({ inquiryRef, email }: { inquiryRef: string; email: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState(`Re: your inquiry ${inquiryRef}`);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<ReplyResult | null>(null);
  const [drafting, startDraft] = useTransition();
  const [sending, startSend] = useTransition();

  const make = () =>
    startDraft(async () => {
      const d = await draftReplyAction(inquiryRef).catch(() => null);
      if (!d) return setResult({ ok: false, error: "Couldn't draft a reply just now." });
      setDraft(d);
      setSubject(d.subject || `Re: your inquiry ${inquiryRef}`);
      setBody(d.body);
      setResult(null);
    });

  const send = () =>
    startSend(async () => {
      const r = await sendReplyAction(inquiryRef, subject, body).catch((): ReplyResult => ({ ok: false, error: "Couldn't reach the server." }));
      setResult(r);
      // on a failure the text stays in the form to try again; it is also kept, marked unsent, in the conversation
      if (r.ok) {
        setBody("");
        setDraft(null);
        setSubject(`Re: your inquiry ${inquiryRef}`);
      }
    });

  // mail apps cut very long links, so the body is shortened for the link; Copy keeps it whole
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
  // a [tier price] or [date] left in by Kai or a template would go to the buyer as is
  const unfilled = /\[[^\]\n]{1,60}\]/.test(body);
  const canSend = !sending && !drafting && !!subject.trim() && !!body.trim() && !unfilled;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={make} disabled={drafting || sending} className="btn btn-line">
          {drafting ? "Drafting…" : draft ? "Draft again with Kai" : "Draft with Kai"}
        </button>
        <span className="text-[12px] text-muted">
          {draft
            ? draft.source === "ai"
              ? "Written by Kai (AI): check every fact."
              : "Template (no AI model configured)."
            : "Kai writes a first reply from the inquiry, the styles and your terms; prices stay as [placeholders]."}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reply templates">
        {REPLY_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={sending}
            onClick={() => {
              const f = fillTemplate(t, inquiryRef);
              setSubject(f.subject);
              setBody(f.body);
              setDraft(null);
              setResult(null);
            }}
            className="rounded-full bg-chip px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 hover:bg-chip-hover hover:text-ink disabled:opacity-50"
          >
            {t.label}
          </button>
        ))}
      </div>

      {draft && draft.summary.length > 0 && (
        <ul className="grid gap-1 rounded-[12px] bg-tile p-3 text-[13px] text-ink-2">
          {draft.summary.map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
      )}
      <label className="grid gap-1 text-[12px] font-semibold text-muted">
        Subject
        <input value={subject} maxLength={REPLY_SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} className="field text-[13.5px] font-normal text-ink" />
      </label>
      <label className="grid gap-1 text-[12px] font-semibold text-muted">
        Reply
        <textarea
          value={body}
          maxLength={REPLY_BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          readOnly={sending}
          rows={14}
          placeholder="Write a reply, pick a template, or draft one with Kai."
          className="field resize-y text-[13.5px] leading-relaxed font-normal text-ink"
        />
      </label>
      {unfilled ? (
        <p className="text-[12.5px] font-semibold text-danger">Fill in the [placeholders] before sending.</p>
      ) : (
        <p className="text-[12px] text-muted">Sent to {email} from the trade desk; their answer comes back to the desk inbox, and the reply is kept on this inquiry.</p>
      )}
      {result && (
        <p role="status" className={result.ok ? "text-[12.5px] font-semibold text-ink-2" : "text-[12.5px] font-semibold text-danger"}>
          {result.ok ? `Reply sent to ${email}.` : result.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={send} disabled={!canSend} className="btn btn-dark">
          {sending ? "Sending…" : "Send reply"}
        </button>
        <button
          type="button"
          disabled={!body.trim()}
          onClick={async () => {
            await navigator.clipboard.writeText(`${subject}\n\n${body}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn btn-line"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={mailto} className="btn btn-ghost">
          Open in my email
        </a>
      </div>
    </div>
  );
}
