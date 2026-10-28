"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";
import { AGENDA, HOME_PIN, INQUIRIES, MARKETS, MONTHS, PRODUCTS, WEEK, type View } from "../data";
import { AdminIcon, Card, CardHead, CountUp, LineChart, Meter, PinBars, Ring, Toggle } from "../ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["10:00", "11:00", "12:00", "13:00"];

/** The dashboard: the week at a glance, in the reference's bento of frosted and dark cards. */
export function Overview({ onAsk, onGo }: { onAsk: (prompt: string) => void; onGo: (v: View) => void }) {
  const week = WEEK.reduce((s, d) => s + d.n, 0);
  const top = [...PRODUCTS].sort((a, b) => b.inquiries - a.inquiries)[0];
  const last = MONTHS[MONTHS.length - 1];
  const [controls, setControls] = useState({ effects: true, campaign: true, prices: false });
  const won = INQUIRIES.filter((i) => i.status === "won").length;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* the AI brief */}
      <Card i={0} className="flex flex-col items-start gap-x-5 gap-y-3 py-4! sm:flex-row sm:items-center lg:col-span-12">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-ink text-white">
          <AdminIcon name="sparkle" className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-[14.5px] text-ink/80">
          <b className="font-semibold text-ink">AI brief.</b> Wednesday was your busiest day ({WEEK[2].n} inquiries). {INQUIRIES[0].company} wants{" "}
          {INQUIRIES[0].pairs.toLocaleString("en-US")} pairs DDP: answer it first. {top.name} leads interest; feature it in Hot products.
        </p>
        <button type="button" onClick={() => onAsk("Summarise this week's inquiries")} className="min-h-10 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[.98]">
          Ask the assistant
        </button>
      </Card>

      {/* row 1 */}
      <Card tone="dark" i={1} className="flex flex-col lg:col-span-3">
        <CardHead dark title="Top style" sub="Most asked about this month" />
        <div className="relative mx-auto my-3 grid aspect-square w-full max-w-[200px] flex-1 place-items-center">
          <span aria-hidden="true" className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/.22),transparent_68%)]" />
          <Image src={top.outer.src} alt={top.name} width={240} height={240} className="relative w-[86%] -scale-x-100 object-contain drop-shadow-[0_18px_22px_rgb(0_0_0/.45)] motion-safe:animate-[admin-float_5s_ease-in-out_infinite]" />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[20px] font-semibold">{top.name}</p>
            <p className="text-[12.5px] text-white/60">{top.type}</p>
          </div>
          <p className="text-right">
            <CountUp value={top.inquiries} className="text-[28px] leading-none font-light" />
            <span className="block text-[11.5px] text-white/55">inquiries</span>
          </p>
        </div>
      </Card>

      <Card i={2} className="flex flex-col lg:col-span-4">
        <CardHead
          title="Inquiries this week"
          sub="Per day, all markets"
          right={
            <p className="text-[34px] leading-none font-light">
              <CountUp value={week} />
            </p>
          }
        />
        <div className="mt-4 flex-1">
          <PinBars data={WEEK} />
        </div>
      </Card>

      <Card i={3} className="lg:col-span-3">
        <CardHead title="Reply health" sub="How fast buyers hear back" />
        <div className="mt-4 flex justify-around">
          <Ring value={Math.round((last.replied / last.leads) * 100)} label="Inside 24 h" />
          <Ring value={64} label="Quoted" />
        </div>
        <div className="mt-5 grid gap-3">
          <Meter label="Quotes sent" value={38} max={60} suffix="" />
          <Meter label="Samples out" value={14} max={60} suffix="" />
        </div>
      </Card>

      <div className="grid gap-4 lg:col-span-2">
        <Card i={4} className="p-4! sm:p-4!">
          <h2 className="text-[13px] font-semibold">Pipeline</h2>
          <div className="mt-3 flex items-center rounded-full bg-ink p-1 text-white">
            {[
              [INQUIRIES.length * 16, "Leads"],
              [38, "Quotes"],
              [won * 6, "Won"],
            ].map(([v, l]) => (
              <span key={l} className="grid flex-1 place-items-center rounded-full py-1.5 text-center ring-1 ring-white/0 transition hover:ring-white/30">
                <CountUp value={v as number} className="text-[17px] leading-none" />
                <span className="text-[10px] text-white/60">{l}</span>
              </span>
            ))}
          </div>
        </Card>
        <Card tone="dark" i={5} className="p-4! sm:p-4!">
          <h2 className="text-[13px] font-semibold">Site controls</h2>
          <div className="mt-3 grid gap-2.5 text-[12.5px]">
            {(
              [
                ["effects", "Season effects"],
                ["campaign", "Campaign banner"],
                ["prices", "Show prices"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between gap-2 text-white/80">
                {l}
                <Toggle dark label={l} checked={controls[k]} onChange={(v) => setControls((c) => ({ ...c, [k]: v }))} />
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* row 2 */}
      <Card tone="dark" i={6} className="lg:col-span-3">
        <CardHead dark title="Monthly inquiries" sub="Leads, and replies inside 24 h" />
        <div className="mt-4">
          <LineChart dark area values={MONTHS.map((m) => m.leads)} second={MONTHS.map((m) => m.replied)} labels={MONTHS.map((m) => m.m)} height={110} />
        </div>
        <p className="mt-3 text-[12.5px] text-white/65">
          <span className="font-semibold text-white">+{Math.round(((last.leads - MONTHS[0].leads) / MONTHS[0].leads) * 100)}%</span> since {MONTHS[0].m}
        </p>
      </Card>

      <Card i={7} className="lg:col-span-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white px-3 py-1 text-[12px] text-ink/60 shadow-sm">October</span>
          <h2 className="text-[17px] font-semibold">November 2026</h2>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] text-ink/60 shadow-sm">December</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[520px] grid-cols-[52px_repeat(7,minmax(0,1fr))] text-[12px]">
            <span />
            {DAYS.map((d) => (
              <span key={d} className="pb-2 text-center font-semibold text-ink/60">
                {d}
              </span>
            ))}
            {SLOTS.map((s, row) => (
              <div key={s} className="contents">
                <span className="py-2.5 text-ink/50 tabular-nums">{s}</span>
                {DAYS.map((d, col) => (
                  <span key={d} className="relative border-l border-dashed border-ink/10">
                    {AGENDA.filter((a) => a.day === col && a.from === row).map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => onGo("inquiries")}
                        className={clsx(
                          "absolute top-1.5 left-1 z-10 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap shadow-sm transition-transform hover:-translate-y-0.5",
                          col % 2 ? "bg-white text-ink" : "bg-ink text-white",
                        )}
                        style={{ minWidth: `calc(${a.span * 100}% - 8px)` }}
                      >
                        {a.label}
                      </button>
                    ))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card tone="dark" i={8} className="lg:col-span-3">
        <CardHead dark title="Order stages" sub="Open orders, by stage" />
        <div className="mt-4 grid gap-3.5">
          <Meter dark label="Sampling" value={20} />
          <Meter dark label="Pre-production" value={50} />
          <Meter dark label="Bulk run" value={80} />
          <Meter dark label="Inspection" value={40} />
          <Meter dark label="Shipped" value={10} />
        </div>
      </Card>

      {/* row 3 */}
      <Card i={9} className="grid gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:col-span-7">
        <div>
          <CardHead title="Traffic vs inquiries" sub="Daily visits (line) against inquiries (dashed)" />
          <div className="mt-4">
            <LineChart area values={[42, 58, 51, 86, 97, 74, 112, 104, 131, 120, 148, 139]} second={[30, 35, 33, 52, 60, 48, 70, 64, 82, 75, 96, 90]} height={120} labels={["W1", "W3", "W5", "W7", "W9", "W11"]} />
          </div>
        </div>
        <div className="flex items-center justify-around gap-4 border-ink/10 sm:border-l sm:pl-5">
          <Ring value={20} size={110} stroke={5} label="Spam caught" />
          <Ring value={93} size={110} stroke={5} label="Answered" />
        </div>
      </Card>

      <Card i={10} className="lg:col-span-5">
        <CardHead title="Buyer geography" sub="Where inquiries come from" right={<span className="text-[13px] font-semibold">GMT+8</span>} />
        <div className="relative mt-3 aspect-[2/1]">
          <Image src="/images/world-dots.svg" alt="" fill sizes="480px" className="object-contain opacity-80" />
          {MARKETS.map((m, i) => (
            <span key={m.name} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
              <span className="absolute inset-0 rounded-full bg-ink/30 motion-safe:animate-ping" style={{ animationDelay: `${i * 300}ms`, animationDuration: "2.4s" }} />
              <span className="relative block rounded-full bg-ink ring-2 ring-white" style={{ width: 6 + m.share / 2, height: 6 + m.share / 2 }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                {m.name} · {m.share}%
              </span>
            </span>
          ))}
          <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-semibold text-white" style={{ left: `${HOME_PIN.x}%`, top: `${HOME_PIN.y}%` }}>
            Guangzhou
          </span>
        </div>
      </Card>
    </div>
  );
}
