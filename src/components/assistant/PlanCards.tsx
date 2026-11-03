"use client";

import clsx from "clsx";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "../Icon";
import { KaiCards } from "./KaiCards";
import type { PlanLanding, PlanOrder, PlanSeason } from "@/lib/assistant/plan-skills";

/** The planning desk's results in the chat: the season timeline, the plan with the desk's notes, the cost breakdown. */

const VERDICT = {
  "on-time": { label: "On time", dot: "bg-[#2f8f5b]" },
  tight: { label: "Tight", dot: "bg-[#c98a1b]" },
  late: { label: "Too late", dot: "bg-danger" },
} as const;

export function Verdict({ v, className }: { v: keyof typeof VERDICT; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap", className)}>
      <span aria-hidden="true" className={clsx("size-2 rounded-full", VERDICT[v].dot)} />
      {VERDICT[v].label}
    </span>
  );
}

const OpenPlan = ({ href, label = "Open the full plan" }: { href: string; label?: string }) => (
  <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline md:min-h-9">
    {label} <Icon name="arrow" className="size-3.5" />
  </Link>
);

export function TimingCard({ data, wide }: { data: PlanSeason; wide?: boolean }) {
  return (
    <div className="grid gap-2.5">
      <div className="kai-pane kai-rise overflow-hidden rounded-[18px]">
        <p className="border-b border-white/70 px-3.5 py-2.5 text-[12.5px] text-ink-2">
          {data.country} · {data.leadDays} days order to shelf · sea {data.transit}
        </p>
        <ul>
          {data.seasons.map((s, i) => (
            <li
              key={s.key}
              className={clsx("kai-rise grid grid-cols-[1fr_auto] items-center gap-x-3 px-3.5 py-2 text-[13px]", i && "border-t border-white/60", data.buyNow?.season === s.season && s.verdict !== "late" && "bg-white/55")}
              style={{ "--i": i } as CSSProperties}
            >
              <span className="min-w-0">
                <span className="font-semibold">{s.season}</span> <span className="text-muted tabular-nums">{s.sells}</span>
              </span>
              <Verdict v={s.verdict} />
              <span className="col-span-2 text-[12px] text-ink-2 tabular-nums">{s.verdict === "late" ? `Order-by date passed (${s.orderBy})` : `Order by ${s.orderBy}`}</span>
            </li>
          ))}
        </ul>
      </div>
      <KaiCards cards={data.styles} wide={wide} />
      <OpenPlan href={data.link} />
    </div>
  );
}

export function OrderCard({ data, wide }: { data: PlanOrder; wide?: boolean }) {
  const f = data.figures;
  const facts = [
    ["Pairs", data.pairs.toLocaleString("en-US")],
    ["Landed / pair", f.landedPerPair],
    ["Selling at", f.price.split(" (")[0]],
    ["Margin", f.margin],
    ["Break-even", `${f.breakEven} sold`],
    ["Cash needed", f.peakCash],
  ];
  return (
    <div className="grid gap-2.5">
      <div className="kai-pane kai-rise rounded-[18px] p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[14px] font-semibold">
            {data.season} · {data.country}
          </p>
          <Verdict v={data.verdict} />
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-2 tabular-nums">
          Order by {data.orderBy} · {data.shipping} · {data.level}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-1.5">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-[12px] bg-white/70 px-2.5 py-2">
              <dt className="text-[11.5px] text-muted">{k}</dt>
              <dd className="text-[13.5px] font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-2.5 flex flex-wrap gap-1.5 text-[12px]">
          {data.styles.map((s) => (
            <li key={s.id} className="rounded-full bg-white/70 px-2.5 py-1">
              {s.name} <span className="text-muted tabular-nums">· {s.cases} cases</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11.5px] text-muted">FOB {f.fob}. Duty {f.duty}.</p>
      </div>
      <KaiCards cards={data.styles} wide={wide} />
      <div className="kai-pane kai-rise rounded-[18px] px-3.5 py-1">
        {data.notes.map((n, i) => (
          <details key={n.desk} open={i === 0} className={clsx("group py-2", i && "border-t border-white/60")}>
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold">
              <span>
                {n.desk} <span className="font-normal text-muted">· {n.who}</span>
              </span>
              <Icon name="plus" className="size-3.5 transition-transform group-open:rotate-45" />
            </summary>
            <ul className="mt-1 grid gap-1.5 pb-1 text-[13px] leading-snug text-ink-2">
              {n.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-2" />
                  {p}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <OpenPlan href={data.link} label="Open and adjust this plan" />
    </div>
  );
}

export function CostCard({ data }: { data: PlanLanding }) {
  return (
    <div className="grid gap-2.5">
      <div className="kai-pane kai-rise rounded-[18px] p-3.5 text-[13px]">
        <p className="font-semibold">
          {data.pairs.toLocaleString("en-US")} pairs to {data.country} · {data.landedPerPair} landed a pair
        </p>
        <dl className="mt-2 grid gap-1">
          {Object.entries(data.breakdown).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[88px_1fr] gap-2">
              <dt className="text-muted capitalize">{k}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[88px_1fr] gap-2 border-t border-white/70 pt-1 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{data.total}</dd>
          </div>
        </dl>
        <table className="mt-3 w-full text-left text-[12.5px] tabular-nums">
          <caption className="mb-1 text-left text-[12px] text-ink-2">
            Selling at {data.price}: margin {data.margin}, break-even at {data.breakEven} sold
          </caption>
          <thead className="text-muted">
            <tr>
              <th className="font-normal">Sold at full price</th>
              <th className="font-normal">Profit</th>
              <th className="font-normal">Return</th>
            </tr>
          </thead>
          <tbody>
            {data.scenarios.map((s) => (
              <tr key={s.sellThrough}>
                <td>{s.sellThrough}</td>
                <td>{s.profit}</td>
                <td>{s.roi}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11.5px] text-muted">FOB {data.fob}. The rest sells at 50% off. {data.vatNote}</p>
      </div>
      <OpenPlan href={data.link} />
    </div>
  );
}
