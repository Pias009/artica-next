"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { askAssistant } from "../ai";
import { INQUIRIES, PIPELINE, intentLabel, type AdminInquiry } from "../data";
import { AdminIcon, Card, CountUp, Segmented, Sheet, useStream } from "../ui";

/** The trade desk's pipeline: every inquiry by stage, each one openable with an AI-drafted reply. */
export function Inquiries() {
  const [items, setItems] = useState(INQUIRIES);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [reply, setReply] = useState("");
  const { shown, busy } = useStream(draft, run, setReply);
  const open = items.find((i) => i.ref === openRef) ?? null;

  const setStatus = (ref: string, status: AdminInquiry["status"]) => setItems((all) => all.map((i) => (i.ref === ref ? { ...i, status } : i)));
  const pairs = items.filter((i) => i.status !== "lost").reduce((s, i) => s + i.pairs, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Open", items.filter((i) => i.status === "new" || i.status === "replied").length, "waiting on us"],
          ["Quoted", items.filter((i) => i.status === "quoted").length, "with the buyer"],
          ["Won", items.filter((i) => i.status === "won").length, "this month"],
          ["Pairs in play", pairs, "across open deals"],
        ].map(([label, n, sub], k) => (
          <Card key={label} i={k} tone={k === 0 ? "dark" : "glass"}>
            <p className={clsx("text-[13px] font-semibold", k === 0 ? "text-white/70" : "text-ink/60")}>{label}</p>
            <CountUp value={n as number} className="mt-2 block text-[40px] leading-none font-light" />
            <p className={clsx("mt-1 text-[12.5px]", k === 0 ? "text-white/55" : "text-ink/50")}>{sub}</p>
          </Card>
        ))}
      </div>

      <p className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-ink/55">
        Sample pipeline for the layout.
        <Link href="/admin/inquiries" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 font-semibold text-white transition-transform hover:scale-[1.03]">
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
                        }}
                        className="w-full rounded-2xl bg-white/85 p-3 text-left shadow-[0_1px_2px_rgb(18_20_22/.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-12px_rgb(18_20_22/.4)]"
                      >
                        <span className="flex items-center justify-between gap-2 text-[11.5px] text-ink/45">
                          <span className="tabular-nums">{i.ref}</span>
                          <span>{i.received}</span>
                        </span>
                        <span className="mt-1.5 block truncate text-[14px] font-semibold">{i.company}</span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-ink/60">
                          <span aria-hidden="true">{i.flag}</span> {i.country}
                        </span>
                        <span className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold">{intentLabel(i.intent)}</span>
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
                {open.ref} · {open.received}
              </p>
              <p className="mt-1 text-[15px] font-semibold">
                {open.contact} <span className="font-normal text-ink/55">· {open.country}</span>
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
              <p className="mt-3 rounded-2xl bg-ink/[0.04] p-3 text-[14px] leading-relaxed">&ldquo;{open.note}&rdquo;</p>
            </div>

            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink/70">Stage</p>
              <div className="overflow-x-auto">
                <Segmented label="Stage" value={open.status} onChange={(v) => setStatus(open.ref, v)} options={PIPELINE} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12.5px] font-semibold text-ink/70">Reply</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(askAssistant(`draft a reply to ${open.company}`).replace(/^Here's a draft[^\n]*\n\n/, ""));
                    setRun((r) => r + 1);
                  }}
                  className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
                >
                  <AdminIcon name="sparkle" className="size-4" /> {busy ? "Drafting…" : reply ? "Redraft" : "Draft with AI"}
                </button>
              </div>
              <textarea
                aria-label="Reply"
                rows={10}
                value={busy ? shown : reply}
                placeholder="Write a reply, or let the assistant draft one from the inquiry."
                onChange={(e) => setReply(e.target.value)}
                readOnly={busy}
                className="w-full resize-none rounded-2xl bg-white/80 px-4 py-3 text-[14px] leading-relaxed ring-1 ring-ink/10 outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-ink"
              />
              <button
                type="button"
                disabled={!reply.trim() || busy}
                onClick={() => {
                  setStatus(open.ref, "replied");
                  setOpenRef(null);
                }}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white transition-opacity disabled:opacity-40"
              >
                <AdminIcon name="send" className="size-4" /> Send and mark replied
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
