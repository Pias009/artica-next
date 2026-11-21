"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePanel } from "../../panel-data";
import type { PanelInquiry } from "@/lib/admin/panel";

/*
 * What's waiting on the desk, worked out from the inquiries the panel already has (the newest 150, no spam). Shared by
 * the section nav's badge, the tab title and the strip below, so all three always agree.
 */

const HOUR = 3_600_000;
/** Same rule as DUE_HOURS in lib/admin/inquiries.ts (server-only, so it can't be imported here): the site promises 24. */
const DUE_HOURS = 20;

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

/** When the buyer last wrote (quote page answer or reply) and when the desk last wrote back (quote sent or a message). */
function lastWord(i: PanelInquiry) {
  const buyer = Math.max(0, ...i.buyerResponses.map((b) => time(b.at)), ...i.messages.filter((m) => m.from === "buyer").map((m) => time(m.at)));
  // a message that failed to send never reached the buyer, so it doesn't count as an answer
  const desk = Math.max(time(i.details?.sentAt), ...i.messages.filter((m) => m.from === "desk" && !m.error).map((m) => time(m.at)));
  return { buyer, desk };
}

export type Waiting = {
  /** Email requests whose details haven't been sent yet. */
  toSend: PanelInquiry[];
  /** Still "new" after 20 hours, oldest first. */
  overdue: PanelInquiry[];
  /** The buyer wrote after the desk's last word: they're waiting on us. Newest answer first. */
  answers: PanelInquiry[];
  /** Inquiries in any of the three, each counted once (one can be both a request to send and overdue). */
  total: number;
};

export function waitingOn(rows: PanelInquiry[], now: number): Waiting {
  const toSend = rows.filter((i) => i.request && !i.details?.sentAt);
  const overdue = rows.filter((i) => i.status === "new" && now - time(i.createdAt) > DUE_HOURS * HOUR).sort((a, b) => time(a.createdAt) - time(b.createdAt));
  const answers = rows
    // won or lost: the desk has closed it, whatever the buyer said last
    .filter((i) => i.status !== "won" && i.status !== "lost")
    .map((i) => ({ i, w: lastWord(i) }))
    .filter(({ w }) => w.buyer > w.desk)
    .sort((a, b) => b.w.buyer - a.w.buyer)
    .map(({ i }) => i);
  const total = new Set([...toSend, ...overdue, ...answers].map((i) => i.ref)).size;
  return { toSend, overdue, answers, total };
}

/**
 * The clock for "older than 20 hours", moved on once a minute: the panel stays open for hours (its frame survives
 * moving between sections), and an inquiry should turn overdue without a reload. Kept in state rather than read
 * on every render, which React wants pure.
 */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * "Waiting on us": up to three chips (requests to send, overdue, buyer answered), each linking to where the work is
 * done. Renders nothing when the desk is clear. Shown on the Overview; it can also sit at the top of Inquiries.
 */
export function WaitingStrip({ className }: { className?: string }) {
  const panel = usePanel();
  const { toSend, overdue, answers, total } = waitingOn(panel.inquiries, useNow());
  if (!total) return null;

  const answered = answers[0];
  const chips = [
    toSend.length > 0 && { key: "send", href: "/admin/inquiries", text: plural(toSend.length, "request to send", "requests to send"), tone: "warn" },
    overdue.length > 0 && { key: "overdue", href: `/admin/inquiries/${overdue[0].ref}`, text: `${overdue.length} overdue`, tone: "bad" },
    answered && {
      key: "answers",
      href: answered.request ? `/admin/inquiries/requests/${answered.ref}` : `/admin/inquiries/${answered.ref}`,
      text: plural(answers.length, "buyer answered", "buyers answered"),
      tone: "info",
    },
  ].filter((c) => !!c);

  return (
    <nav aria-label="Waiting on us" className={clsx("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-[13px] font-semibold text-ink/60">Waiting on us</span>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          prefetch={false}
          className={clsx(
            "inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap tabular-nums ring-1 transition-colors",
            c.tone === "warn" && "bg-[#b45309]/12 text-[#8a3b0a] ring-[#b45309]/15 hover:bg-[#b45309]/20",
            c.tone === "bad" && "bg-[#a64b34]/12 text-[#8a3424] ring-[#a64b34]/15 hover:bg-[#a64b34]/20",
            c.tone === "info" && "bg-white/70 text-ink ring-white hover:bg-white",
          )}
        >
          <span aria-hidden="true" className={clsx("size-1.5 rounded-full", c.tone === "warn" ? "bg-[#b45309]" : c.tone === "bad" ? "bg-danger" : "bg-ink")} />
          {c.text}
        </Link>
      ))}
    </nav>
  );
}
