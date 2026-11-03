"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState, useTransition } from "react";
import { askAssistant } from "../ai";
import { intentLabel, type View } from "../data";
import { ago, usePanel } from "../panel-data";
import { AdminIcon, Card, CardHead, CountUp, flash, LineChart, Meter, PinBars, Ring, Toggle } from "../ui";
import { saveControlsAction } from "@/app/admin/content-actions";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** The dashboard: the week at a glance from the real inquiries, visitor log and site settings. */
export function Overview({ onAsk, onGo }: { onAsk: (prompt: string) => void; onGo: (v: View) => void }) {
  const panel = usePanel();
  const o = panel.overview;
  const stats = panel.inquiryStats;
  const by = stats?.byStatus ?? {
    new: 0,
    replied: 0,
    quoted: 0,
    won: 0,
    lost: 0,
    spam: 0,
  };
  const total = (stats?.total ?? 0) - by.spam;
  const weekDays =
    o?.week ??
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      n: 0,
    }));
  const week = weekDays.reduce((a, d) => a + d.n, 0);
  const top = [...panel.products].sort((a, b) => b.inquiries - a.inquiries)[0];
  const months = o?.months ?? [];
  const last = months.at(-1);
  const first = months.find((m) => m.leads) ?? months[0];
  const weeks = o?.weeks ?? [];
  const [controls, setControls] = useState(panel.content.controls);
  const [saving, startSave] = useTransition();
  // site controls save at once, like light switches; put back if the server refuses
  const flip = (k: keyof typeof controls, v: boolean) => {
    const before = controls;
    const next = { ...controls, [k]: v };
    setControls(next);
    startSave(async () => {
      const r = await saveControlsAction(next).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server.",
      }));
      if (r.ok) flash(`${k === "effects" ? "Season effects" : "Campaign banner"} ${v ? "on" : "off"} for every visitor`);
      else {
        setControls(before);
        flash(r.error);
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* the AI brief */}
      <Card i={0} className="flex flex-col items-start gap-x-5 gap-y-3 py-4! sm:flex-row sm:items-center lg:col-span-12">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-ink text-white">
          <AdminIcon name="sparkle" className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-[14.5px] text-ink/80">
          <b className="font-semibold text-ink">This week.</b> {askAssistant("summary", panel)}
        </p>
        <button
          type="button"
          onClick={() => onAsk("Summarise this week's inquiries")}
          className="min-h-10 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[.98]"
        >
          Ask the assistant
        </button>
      </Card>

      {/* row 1 */}
      <Card tone="dark" i={1} className="flex flex-col lg:col-span-3">
        <CardHead dark title="Top style" sub={top?.inquiries ? "Most asked about, last 90 days" : "No style asked for yet"} />
        <div className="relative mx-auto my-3 grid aspect-square w-full max-w-[200px] flex-1 place-items-center">
          <span aria-hidden="true" className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/.22),transparent_68%)]" />
          <Image
            src={top.image}
            alt={top.name}
            width={240}
            height={240}
            className="relative w-[86%] -scale-x-100 object-contain drop-shadow-[0_18px_22px_rgb(0_0_0/.45)] motion-safe:animate-[admin-float_5s_ease-in-out_infinite]"
          />
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
          sub="Last 7 days, by weekday (Guangzhou time)"
          right={
            <p className="text-[34px] leading-none font-light">
              <CountUp value={week} />
            </p>
          }
        />
        <div className="mt-4 flex-1">
          <PinBars data={weekDays} />
        </div>
      </Card>

      <Card i={3} className="lg:col-span-3">
        <CardHead title="Reply health" sub="How fast buyers hear back" />
        <div className="mt-4 flex justify-around">
          <Ring value={last ? pct(last.replied, last.leads) : 0} label={`Inside 24 h${last ? ` (${last.m})` : ""}`} />
          <Ring value={pct(by.quoted + by.won + by.lost, total)} label="Quoted" />
        </div>
        <div className="mt-5 grid gap-3">
          <Meter label="Waiting over 20 h" value={stats?.overdue ?? 0} max={Math.max(10, by.new)} suffix="" />
          <Meter label="Emails not sent" value={stats?.emailsStuck ?? 0} max={10} suffix="" />
        </div>
        {stats?.medianReplyHours != null && <p className="mt-3 text-[12px] text-ink/55">Median first reply: {stats.medianReplyHours.toFixed(1)} h (30 days)</p>}
      </Card>

      <div className="grid gap-4 lg:col-span-2">
        <Card i={4} className="flex flex-col p-4! sm:p-4!">
          <h2 className="text-[13px] font-semibold">Pipeline</h2>
          <div className="mt-3 flex items-center rounded-full bg-ink p-1 text-white">
            {[
              [by.new + by.replied, "Open"],
              [by.quoted, "Quoted"],
              [by.won, "Won"],
            ].map(([v, l]) => (
              <span key={l} className="grid flex-1 place-items-center rounded-full py-1.5 text-center ring-1 ring-white/0 transition hover:ring-white/30">
                <CountUp value={v as number} className="text-[17px] leading-none" />
                <span className="text-[10px] text-white/60">{l}</span>
              </span>
            ))}
          </div>
          <div className="mt-auto pt-3">
            <div className="flex justify-between text-[12px] text-ink/60">
              <span>Lead to order</span>
              <span className="font-semibold text-ink tabular-nums">{pct(by.won, total)}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full origin-left rounded-full bg-ink motion-safe:animate-[admin-in_.9s_both]" style={{ width: `${pct(by.won, total)}%` }} />
            </div>
          </div>
        </Card>
        <Card tone="dark" i={5} className="p-4! sm:p-4!">
          <h2 className="text-[13px] font-semibold">Site controls {saving && <span className="font-normal text-white/50">· saving</span>}</h2>
          <div className="mt-3 grid gap-2.5 text-[12.5px]">
            {(
              [
                ["effects", "Season effects"],
                ["campaign", "Campaign banner"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between gap-2 text-white/80">
                {l}
                <Toggle dark label={l} checked={controls[k]} onChange={(v) => flip(k, v)} />
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* row 2 */}
      <Card tone="dark" i={6} className="lg:col-span-3">
        <CardHead dark title="Monthly inquiries" sub="Leads, and replies inside 24 h" />
        <div className="mt-4">
          <LineChart dark area values={months.map((m) => m.leads)} second={months.map((m) => m.replied)} labels={months.map((m) => m.m)} height={110} />
        </div>
        <p className="mt-3 text-[12.5px] text-white/65">
          {last && first && first.leads ? (
            <>
              <span className="font-semibold text-white">
                {last.leads >= first.leads ? "+" : ""}
                {pct(last.leads - first.leads, first.leads)}%
              </span>{" "}
              since {first.m}
            </>
          ) : (
            `${months.reduce((a, m) => a + m.leads, 0)} in six months`
          )}
        </p>
      </Card>

      <Card i={7} className="lg:col-span-6">
        <CardHead
          title="Latest inquiries"
          sub="Newest first"
          right={
            <button type="button" onClick={() => onGo("inquiries")} className="min-h-9 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white">
              All inquiries
            </button>
          }
        />
        {panel.inquiries.length ? (
          <ul className="mt-4 divide-y divide-ink/[0.07]">
            {panel.inquiries.slice(0, 6).map((i) => (
              <li key={i.ref}>
                <a
                  href={`/admin/inquiries/${i.ref}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-white/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">
                      <span aria-hidden="true">{i.flag}</span> {i.company}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink/55">
                      {intentLabel(i.intent)}
                      {i.pairs ? ` · ${i.pairs.toLocaleString("en-US")} pairs` : ""} · {i.ref}
                    </span>
                  </span>
                  <span className="text-right text-[12px] text-ink/50">
                    <span className={clsx("block font-semibold capitalize", i.status === "new" ? "text-brand" : "text-ink/70")}>{i.status}</span>
                    {ago(i.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[14px] text-ink/55">No inquiries yet. They appear here the moment a buyer sends one.</p>
        )}
      </Card>

      <Card tone="dark" i={8} className="lg:col-span-3">
        <CardHead dark title="Inquiry stages" sub={`All ${total} inquiries, spam left out`} />
        <div className="mt-4 grid gap-3.5">
          <Meter dark label="New" value={pct(by.new, total)} />
          <Meter dark label="Replied" value={pct(by.replied, total)} />
          <Meter dark label="Quoted" value={pct(by.quoted, total)} />
          <Meter dark label="Won" value={pct(by.won, total)} />
          <Meter dark label="Lost" value={pct(by.lost, total)} />
        </div>
      </Card>

      {/* row 3 */}
      <Card i={9} className="grid gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:col-span-7">
        <div className="flex flex-col">
          <CardHead title="Traffic vs inquiries" sub="Weekly visits against inquiries, last 12 weeks" />
          <div className="mt-4 flex-1">
            <LineChart
              area
              values={weeks.map((w) => w.visits)}
              second={weeks.map((w) => w.leads)}
              height={170}
              labels={["W1", "W3", "W5", "W7", "W9", "W11"]}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink/60">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-ink" /> Visits
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-ink/50" /> Inquiries
            </span>
            <span className="ml-auto">
              <b className="font-semibold text-ink">{o?.viewsWeek.toLocaleString("en-US") ?? 0}</b> page views in 7 days
            </span>
          </div>
        </div>
        <div className="flex items-center justify-around gap-4 border-ink/10 sm:border-l sm:pl-5">
          <Ring value={pct(by.spam, stats?.total ?? 0)} size={110} stroke={5} label="Spam caught" />
          <Ring value={pct(total - by.new, total)} size={110} stroke={5} label="Answered" />
        </div>
      </Card>

      <Card i={10} className="lg:col-span-5">
        <CardHead title="Buyer geography" sub="Where inquiries came from, last 90 days" right={<span className="text-[13px] font-semibold">GMT+8</span>} />
        <div className="relative mt-3 aspect-[2/1]">
          <Image src="/images/world-dots.svg" alt="" fill sizes="480px" className="object-contain opacity-80" />
          {(o?.markets ?? [])
            .filter((m) => m.pinned)
            .map((m, i) => (
              <span key={m.name} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                <span
                  className="absolute inset-0 rounded-full bg-ink/30 motion-safe:animate-ping"
                  style={{
                    animationDelay: `${i * 300}ms`,
                    animationDuration: "2.4s",
                  }}
                />
                <span className="relative block rounded-full bg-ink ring-2 ring-white" style={{ width: 6 + m.share / 2, height: 6 + m.share / 2 }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {m.name} · {m.share}%
                </span>
              </span>
            ))}
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-semibold text-white"
            style={{ left: `${panel.homePin.x}%`, top: `${panel.homePin.y}%` }}
          >
            Guangzhou
          </span>
        </div>
        {o?.markets.length ? (
          <p className="mt-2 text-[12.5px] text-ink/60">{o.markets.map((m) => `${m.name} ${m.share}%`).join(" · ")}</p>
        ) : (
          <p className="mt-2 text-[12.5px] text-ink/50">No inquiries in the last 90 days.</p>
        )}
      </Card>
    </div>
  );
}
