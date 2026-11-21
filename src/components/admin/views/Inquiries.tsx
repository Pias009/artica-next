"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState, useTransition } from "react";
import { PIPELINE, intentLabel } from "../data";
import { ago, usePanel } from "../panel-data";
import { AdminIcon, Card, CountUp, flash, Segmented, Sheet, useStream } from "../ui";
import { EmailRequests } from "./inquiries/EmailRequests";
import { WaitingStrip } from "./inquiries/WaitingStrip";
import { draftReplyAction, sendReplyAction, type ReplyResult } from "@/app/admin/actions";
import { moveInquiryAction } from "@/app/admin/content-actions";
import type { PanelInquiry } from "@/lib/admin/panel";
import { fillTemplate, REPLY_BODY_MAX, REPLY_SUBJECT_MAX, REPLY_TEMPLATES } from "@/lib/admin/reply-templates";

/**
 * The trade desk's pipeline: the latest real inquiries by stage (spam left out), each openable to move it on, read the
 * conversation so far and send a reply (written, from a template, or drafted with Kai). Replies go from the desk's
 * sender with Reply-To the desk inbox and are kept on the inquiry. Moving a card saves at once; the full desk
 * (/admin/inquiries) has search and history.
 */
export function Inquiries() {
  const panel = usePanel();
  const [items, setItems] = useState(panel.inquiries);
  const [moving, startMove] = useTransition();
  const [sending, startSend] = useTransition();
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [reply, setReply] = useState("");
  const { shown, busy } = useStream(draft, run, setReply);
  const open = items.find((i) => i.ref === openRef) ?? null;

  // saved at once; put back if the server refuses
  const setStatus = (ref: string, status: PanelInquiry["status"]) => {
    const before = items.find((i) => i.ref === ref)?.status;
    if (!before || before === status) return;
    setItems((all) => all.map((i) => (i.ref === ref ? { ...i, status } : i)));
    startMove(async () => {
      const r = await moveInquiryAction(ref, status).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server.",
      }));
      if (r.ok) flash(`${ref} moved to ${PIPELINE.find((x) => x.id === status)?.label}`);
      else {
        setItems((all) => all.map((i) => (i.ref === ref ? { ...i, status: before } : i)));
        flash(r.error);
      }
    });
  };
  const pairs = items.filter((i) => i.status !== "lost").reduce((s, i) => s + i.pairs, 0);

  // a [tier price] or [date] left in by Kai or a template would go to the buyer as is
  const unfilled = /\[[^\]\n]{1,60}\]/.test(reply);
  const canSend = !!open && !busy && !sending && !!subject.trim() && !!reply.trim() && !unfilled;

  const send = (i: PanelInquiry) =>
    startSend(async () => {
      const r = await sendReplyAction(i.ref, subject, reply).catch((): ReplyResult => ({ ok: false, error: "Couldn't reach the server." }));
      // the reply is kept on the inquiry even when the email failed, so it shows in the conversation either way
      const message = r.message;
      if (message)
        setItems((all) =>
          all.map((x) => (x.ref === i.ref ? { ...x, messages: [...x.messages, message], status: r.ok && r.status !== "spam" ? r.status : x.status } : x)),
        );
      if (!r.ok) {
        flash(r.error);
        return;
      }
      flash(`Reply sent to ${i.email}`);
      setReply("");
      setDraft(null);
      setNotes([]);
      setSubject(`Re: your inquiry ${i.ref}`);
    });

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Open", items.filter((i) => i.status === "new" || i.status === "replied").length, "waiting on us"],
          ["Quoted", items.filter((i) => i.status === "quoted").length, "with the buyer"],
          ["Won", items.filter((i) => i.status === "won").length, "orders confirmed"],
          ["Pairs in play", pairs, "across open deals"],
        ].map(([label, n, sub], k) => (
          <Card key={label} i={k} tone={k === 0 ? "dark" : "glass"}>
            <p className={clsx("text-[13px] font-semibold", k === 0 ? "text-white/70" : "text-ink/60")}>{label}</p>
            <CountUp value={n as number} className="mt-2 block text-[40px] leading-none font-light" />
            <p className={clsx("mt-1 text-[12.5px]", k === 0 ? "text-white/55" : "text-ink/50")}>{sub}</p>
          </Card>
        ))}
      </div>

      {/* buyers who left only an email: the desk adds the details and sends them */}
      <WaitingStrip className="mt-4" />
      <EmailRequests items={items} />

      <p className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-ink/55">
        {items.length
          ? `The latest ${items.length} inquiries, spam left out.${moving ? " Saving…" : ""}`
          : panel.ready
            ? "No inquiries yet. They appear here as buyers send them."
            : "No database connected: no inquiries to show."}
        <Link
          href="/admin/inquiries/all"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 font-semibold text-white transition-transform hover:scale-[1.03]"
        >
          Open the live inquiry desk <AdminIcon name="up" className="size-3.5 rotate-90" />
        </Link>
      </p>

      <div className="mt-3 overflow-x-auto pb-2">
        <div className="grid min-w-[980px] grid-cols-5 gap-3">
          {PIPELINE.map((col, c) => {
            const cards = items.filter((i) => i.status === col.id);
            return (
              <Card key={col.id} i={c + 4} className="p-3! sm:p-3!">
                <div className="flex items-center justify-between px-2 pt-1 pb-3">
                  <h2 className="text-[14px] font-semibold">{col.label}</h2>
                  <span className="grid size-6 place-items-center rounded-full bg-ink/[0.07] text-[12px] font-semibold tabular-nums">{cards.length}</span>
                </div>
                <ul className="grid min-h-24 gap-2">
                  {cards.map((i) => (
                    <li key={i.ref + i.status} className="motion-safe:animate-[admin-in_.4s_cubic-bezier(.22,1,.36,1)_both]">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenRef(i.ref);
                          setDraft(null);
                          setReply("");
                          setSubject(`Re: your inquiry ${i.ref}`);
                          setNotes([]);
                        }}
                        className="w-full rounded-2xl bg-white/85 p-3 text-left shadow-[0_1px_2px_rgb(18_20_22/.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-12px_rgb(18_20_22/.4)]"
                      >
                        <span className="flex items-center justify-between gap-2 text-[11.5px] text-ink/45">
                          <span className="tabular-nums">{i.ref}</span>
                          <span>{ago(i.createdAt)}</span>
                        </span>
                        <span className="mt-1.5 block truncate text-[14px] font-semibold">{i.company}</span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink/60">
                          <span aria-hidden="true">{i.flag}</span> {i.country}
                        </span>
                        <span className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold">{i.request ? "Email request" : intentLabel(i.intent)}</span>
                          {i.pairs > 0 && <span className="text-[12px] font-semibold tabular-nums">{i.pairs.toLocaleString("en-US")} pr</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>

      <Sheet open={!!open} onClose={() => setOpenRef(null)} title={open ? open.company : "Inquiry"}>
        {open && (
          <div className="grid gap-5">
            <div className="rounded-3xl bg-white/80 p-4">
              <p className="text-[12px] text-ink/45 tabular-nums">
                {open.ref} · {ago(open.createdAt)} · {open.buyerType}
              </p>
              <p className="mt-1 text-[15px] font-semibold">
                <a href={`mailto:${open.email}`} className="hover:underline">
                  {open.email}
                </a>{" "}
                <span className="font-normal text-ink/55">· {open.country}</span>
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <dt className="text-ink/50">Wants</dt>
                  <dd className="font-semibold">{intentLabel(open.intent)}</dd>
                </div>
                <div>
                  <dt className="text-ink/50">Volume</dt>
                  <dd className="font-semibold tabular-nums">{open.pairs ? `${open.pairs.toLocaleString("en-US")} pairs` : "Not stated"}</dd>
                </div>
              </dl>
              {open.styles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {open.styles.map((s) => (
                    <span key={s} className="rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-white">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {open.note && <p className="mt-3 rounded-2xl bg-ink/[0.04] p-3 text-[14px] leading-relaxed whitespace-pre-line">&ldquo;{open.note}&rdquo;</p>}
              <Link href={`/admin/inquiries/${open.ref}`} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold underline">
                Full record, emails and history
              </Link>
            </div>

            {open.request && (
              <Link
                href={`/admin/inquiries/requests/${open.ref}`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-3xl bg-ink px-4 py-3 text-white transition-transform hover:scale-[1.01]"
              >
                <span>
                  <span className="block text-[14px] font-semibold">Open the response page</span>
                  <span className="block text-[12px] text-white/60">Email request: add the styles and prices there and send them.</span>
                </span>
                <AdminIcon name="up" className="size-4 shrink-0 rotate-90" />
              </Link>
            )}

            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink/70">Stage</p>
              <div className="overflow-x-auto">
                <Segmented label="Stage" value={open.status} onChange={(v) => v !== "new" && setStatus(open.ref, v)} options={PIPELINE} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink/70">Conversation</p>
              {open.messages.length ? (
                <ol className="grid gap-2">
                  {open.messages.map((m, k) => (
                    <li
                      key={m.at + k}
                      className={clsx(
                        "rounded-2xl p-3 text-[13px]",
                        m.error ? "bg-danger/[0.06] ring-1 ring-danger/30" : m.from === "desk" ? "bg-white/80" : "bg-ink/[0.04]",
                      )}
                    >
                      <p className="flex flex-wrap items-center justify-between gap-x-2 text-[11.5px] text-ink/50">
                        <span className="font-semibold text-ink/70">{m.from === "desk" ? `Desk${m.by ? ` · ${m.by}` : ""}` : "Buyer"}</span>
                        <span title={new Date(m.at).toLocaleString("en-GB")}>{ago(m.at)}</span>
                      </p>
                      <p className="mt-1 font-semibold">{m.subject}</p>
                      <p className="mt-1 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-line text-ink/80">{m.body}</p>
                      {m.error && <p className="mt-2 text-[12px] font-semibold text-danger">Not sent: {m.error}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-2xl bg-ink/[0.04] p-3 text-[12.5px] text-ink/55">No replies sent from the panel yet.</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12.5px] font-semibold text-ink/70">Reply</p>
                <button
                  type="button"
                  disabled={busy || drafting || sending}
                  onClick={async () => {
                    setDrafting(true);
                    const d = await draftReplyAction(open.ref).catch(() => null);
                    setDrafting(false);
                    if (!d) return flash("Couldn't draft a reply just now.");
                    setSubject(d.subject || `Re: your inquiry ${open.ref}`);
                    setNotes(d.summary);
                    setDraft(d.body);
                    setRun((r) => r + 1);
                  }}
                  className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
                >
                  <AdminIcon name="sparkle" className="size-4" /> {busy || drafting ? "Drafting…" : reply ? "Redraft" : "Draft with Kai"}
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Reply templates">
                {REPLY_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy || sending}
                    onClick={() => {
                      const f = fillTemplate(t, open.ref);
                      setDraft(null);
                      setNotes([]);
                      setSubject(f.subject);
                      setReply(f.body);
                    }}
                    className="min-h-8 rounded-full bg-white/80 px-3 text-[12px] font-semibold ring-1 ring-ink/10 transition-colors hover:bg-white hover:ring-ink/25 disabled:opacity-50"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {notes.length > 0 && (
                <ul className="mb-2 grid gap-1 rounded-2xl bg-ink/[0.04] p-3 text-[12.5px] text-ink/70">
                  {notes.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
              )}
              <input
                aria-label="Subject"
                value={subject}
                maxLength={REPLY_SUBJECT_MAX}
                placeholder="Subject"
                onChange={(e) => setSubject(e.target.value)}
                className="mb-2 min-h-11 w-full rounded-2xl bg-white/80 px-4 text-[14px] font-semibold ring-1 ring-ink/10 outline-none placeholder:font-normal placeholder:text-ink/40 focus:ring-2 focus:ring-ink"
              />
              <textarea
                aria-label="Reply"
                rows={10}
                value={busy ? shown : reply}
                maxLength={REPLY_BODY_MAX}
                placeholder="Write a reply, pick a template, or let the assistant draft one from the inquiry."
                onChange={(e) => setReply(e.target.value)}
                readOnly={busy || sending}
                className="w-full resize-none rounded-2xl bg-white/80 px-4 py-3 text-[14px] leading-relaxed ring-1 ring-ink/10 outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-ink"
              />
              {unfilled && !busy ? (
                <p className="mt-2 text-[12px] font-semibold text-danger">Fill in the [placeholders] before sending.</p>
              ) : (
                <p className="mt-2 text-[12px] text-ink/50">
                  Sent to {open.email} from the trade desk; their answer comes back to the desk inbox, and the reply is kept here.
                </p>
              )}
              <button
                type="button"
                disabled={!canSend}
                onClick={() => send(open)}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white transition-opacity disabled:opacity-40"
              >
                <AdminIcon name="send" className="size-4" /> {sending ? "Sending…" : "Send reply"}
              </button>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`mailto:${open.email}?subject=${encodeURIComponent(subject || `Re: your inquiry ${open.ref}`)}&body=${encodeURIComponent(reply.slice(0, 1800))}`}
                  className="inline-flex min-h-9 items-center px-1 text-[12.5px] font-semibold text-ink/60 underline underline-offset-2 hover:text-ink"
                >
                  Open in my email instead
                </a>
                <button
                  type="button"
                  disabled={open.status !== "new" || moving}
                  onClick={() => setStatus(open.ref, "replied")}
                  className="min-h-9 rounded-full bg-white px-3.5 text-[12.5px] font-semibold ring-1 ring-ink/15 transition-opacity disabled:opacity-40"
                >
                  {open.status === "new" ? "Mark replied" : "Replied"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
