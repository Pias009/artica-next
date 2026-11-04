"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ago, usePanel } from "../panel-data";
import { AdminIcon, Card, CardHead, CountUp, Meter, useEntered } from "../ui";
import type { PanelVisitors } from "@/lib/admin/panel";

type Visitor = PanelVisitors["people"][number];
const SOURCE_TONE = ["bg-ink", "bg-ink/70", "bg-brand", "bg-ink/45", "bg-brand/55", "bg-ink/20", "bg-ink/10", "bg-brand/30"];
const EMPTY: PanelVisitors = {
  sessions: 0,
  live: 0,
  pagesPerVisit: 0,
  onePage: 0,
  topPages: [],
  people: [],
  funnel: [],
  exits: [],
  sources: [],
  devices: [],
  hours: Array(24).fill(0),
  searches: [],
  pageViews: {},
};

/**
 * Visitor footprints from the site's own visitor log (lib/analytics/visits.ts): who is on the site now and the trail
 * each visit leaves, where visits come from, where the buying path loses people, which pages they leave from and what
 * they look for. Refreshes itself every 30 seconds while open.
 */
export function Visitors() {
  const panel = usePanel();
  const data = panel.visitors ?? EMPTY;
  const visitors = data.people;
  const [selected, setSelected] = useState<string | null>(null);
  const on = useEntered();
  const current = visitors.find((v) => v.id === selected) ?? visitors[0];
  const router = useRouter();
  const PEAK = Math.max(1, ...data.hours);

  // the live list keeps itself current: fresh figures from the server every 30 seconds
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const max = Math.max(1, data.funnel[0]?.n ?? 0);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* the headline numbers */}
      {(
        [
          ["Visits, last 7 days", data.sessions, "", "each visit counted once a day", false],
          ["On the site now", data.live, "", "active in the last 5 minutes", true],
          ["Pages per visit", Math.round(data.pagesPerVisit * 10) / 10, "", "last 7 days", false],
          ["Leave after one page", data.onePage, "%", "last 7 days", false],
        ] as const
      ).map(([label, n, suffix, sub, dark], k) => (
        <Card key={label} i={k} tone={dark ? "dark" : "glass"} className="lg:col-span-3">
          <p className={clsx("flex items-center gap-2 text-[13px] font-semibold", dark ? "text-white/70" : "text-ink/60")}>
            {dark && <span className="size-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />}
            {label}
          </p>
          <CountUp value={n} decimals={n % 1 ? 1 : 0} suffix={suffix} className="mt-2 block text-[40px] leading-none font-light" />
          <p className={clsx("mt-1 text-[12.5px]", dark ? "text-white/55" : "text-ink/50")}>{sub}</p>
        </Card>
      ))}

      {/* live footprints */}
      <Card i={4} className="lg:col-span-7">
        <CardHead
          title="Footprints"
          sub="Visits in the last two hours and their trail; pick one to follow it"
          right={<span className="text-[12.5px] text-ink/50">anonymous</span>}
        />
        {!visitors.length && (
          <p className="mt-4 text-[14px] text-ink/55">{panel.ready ? "No visits in the last two hours." : "No database connected: nothing is logged."}</p>
        )}
        <ul className="mt-4 grid gap-2">
          {visitors.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                aria-pressed={v.id === selected}
                onClick={() => setSelected(v.id)}
                className={clsx(
                  "w-full rounded-3xl p-3.5 text-left transition-[background-color,box-shadow] duration-200",
                  v.id === selected ? "bg-white shadow-[0_8px_22px_-14px_rgb(18_20_22/.45)]" : "bg-white/50 hover:bg-white/80",
                )}
              >
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
                  <span className="flex items-center gap-2 font-semibold">
                    <span aria-hidden="true">{v.flag}</span> {v.country}
                    <span className="font-normal text-ink/45">· {v.device}</span>
                  </span>
                  <span className={clsx("flex items-center gap-1.5 text-[12px] font-semibold", v.live ? "text-emerald-600" : "text-danger")}>
                    <span className={clsx("size-1.5 rounded-full", v.live ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-danger")} />
                    {v.live ? "On the site" : `Left from ${v.left ?? "–"} · ${ago(v.lastSeen)}`}
                  </span>
                </span>
                <Trail v={v} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* one visitor, followed */}
      <Card i={5} tone="dark" className="lg:col-span-5">
        {!current ? (
          <CardHead dark title="Following one visitor" sub="Pick a visit when one comes in" />
        ) : (
          <>
            <CardHead dark title="Following one visitor" sub={`${current.flag} ${current.country} · ${current.device}`} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-2xl bg-white/8 p-3">
                <dt className="text-white/55">Came from</dt>
                <dd className="mt-0.5 font-semibold">{current.source}</dd>
              </div>
              <div className="rounded-2xl bg-white/8 p-3">
                <dt className="text-white/55">Searched for</dt>
                <dd className="mt-0.5 font-semibold">{current.searched ? `“${current.searched}”` : "Not known"}</dd>
              </div>
            </dl>
            <ol key={current.id} className="relative mt-5 grid gap-4 pl-6">
              <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-px bg-white/20" />
              {current.trail.map((s, i) => {
                const last = i === current.trail.length - 1;
                return (
                  <li
                    key={s.page + s.at}
                    className="relative motion-safe:animate-[admin-in_.4s_cubic-bezier(.22,1,.36,1)_both]"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className={clsx(
                        "absolute top-1.5 -left-6 size-[11px] rounded-full ring-4 ring-[#3a3c3f]",
                        last ? (current.live ? "bg-emerald-400" : "bg-danger") : "bg-white",
                      )}
                    />
                    <p className="text-[14px] font-semibold">{s.page}</p>
                    <p className="text-[12px] text-white/55">
                      {i === 0 ? "Landed" : "Opened"} at {s.at}
                      {last && (current.live ? " · here now" : " · left the site")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </Card>

      {/* where the path loses people */}
      <Card i={6} className="lg:col-span-7">
        <CardHead title="Where they drop out" sub="This week's visitors, step by step along the buying path" />
        <ol className="mt-5 grid gap-3">
          {data.funnel.map((f, i) => {
            const prev = data.funnel[i - 1]?.n ?? 0;
            const drop = i && prev ? Math.max(0, Math.round((1 - f.n / prev) * 100)) : 0;
            return (
              <li key={f.step}>
                {i > 0 && (
                  <p className="mb-1.5 flex items-center gap-1.5 pl-1 text-[12px] font-semibold text-danger">
                    <AdminIcon name="down" className="size-3.5" /> {drop}% dropped out here
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="font-semibold">{f.step}</span>
                  <span className="font-semibold tabular-nums">{f.n.toLocaleString("en-US")}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className={clsx(
                      "h-full origin-left rounded-full transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]",
                      i === data.funnel.length - 1 ? "bg-brand" : "bg-ink",
                    )}
                    style={{
                      width: `${Math.max(2, (f.n / max) * 100)}%`,
                      transform: `scaleX(${on ? 1 : 0})`,
                      transitionDelay: `${i * 90}ms`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card i={7} className="flex flex-col lg:col-span-5">
        <CardHead title="Exit pages" sub="The last page before people leave, and how often it's the last" />
        <ul className="mt-5 grid gap-4">
          {!data.exits.length && <li className="text-[13.5px] text-ink/55">No visits logged yet.</li>}
          {data.exits.map((e) => (
            <li key={e.page}>
              <Meter label={`${e.page} · ${e.exits} exits`} value={e.rate} />
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          <div className="flex items-baseline justify-between text-[12.5px] text-ink/55">
            <span className="font-semibold text-ink">Busiest hours</span>
            <span>
              Guangzhou time
              {data.hours.some(Boolean) && ` · peak ${data.hours.indexOf(PEAK)}:00`}
            </span>
          </div>
          <div aria-hidden="true" className="mt-2 flex h-14 items-end gap-[3px]">
            {data.hours.map((n, h) => (
              <span
                key={h}
                className={clsx("flex-1 origin-bottom rounded-t-[3px] transition-transform duration-700", n && n === PEAK ? "bg-ink" : "bg-ink/20")}
                style={{
                  height: `${(n / PEAK) * 100}%`,
                  transform: `scaleY(${on ? 1 : 0})`,
                  transitionDelay: `${h * 15}ms`,
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11.5px] text-ink/45 tabular-nums">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </Card>

      {/* where they come from, and what they look for */}
      <Card i={8} className="lg:col-span-4">
        <CardHead title="Where they come from" />
        <div className="mt-5 flex h-3 overflow-hidden rounded-full">
          {data.sources.map((s, i) => (
            <span
              key={s.name}
              className={clsx("h-full origin-left transition-transform duration-1000", SOURCE_TONE[i])}
              style={{
                width: `${s.share}%`,
                transform: `scaleX(${on ? 1 : 0})`,
              }}
            />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          {data.sources.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className={clsx("size-2.5 rounded-full", SOURCE_TONE[i])} />
              <span className="flex-1">{s.name}</span>
              <span className="font-semibold tabular-nums">{s.share}%</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-7 text-[13px] font-semibold">On what</h3>
        <ul className="mt-3 grid gap-3">
          {data.devices.map((d) => (
            <li key={d.name}>
              <Meter label={d.name} value={d.share} />
            </li>
          ))}
        </ul>
      </Card>

      <Card i={9} className="lg:col-span-4">
        <CardHead title="Most viewed pages" sub="Page views, last 7 days" />
        <ul className="mt-4 grid gap-2.5">
          {!data.topPages.length && <li className="text-[13.5px] text-ink/55">No views logged yet.</li>}
          {data.topPages.map((k) => (
            <li key={k.page}>
              <a
                href={k.page}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-3.5 py-2.5 text-[13.5px] hover:bg-white"
              >
                <span className="truncate">{k.page}</span>
                <span className="font-semibold tabular-nums">{k.n.toLocaleString("en-US")}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-ink/50">Search engines no longer pass on the words people searched; see them in Google Search Console.</p>
      </Card>

      <Card i={10} tone="dark" className="lg:col-span-4">
        <CardHead dark title="Searches on the site" sub="What visitors typed into search, last 7 days" />
        <ul className="mt-4 grid gap-2.5">
          {!data.searches.length && <li className="text-[13.5px] text-white/60">No searches yet.</li>}
          {data.searches.map((s) => (
            <li key={s.q} className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3.5 py-2.5 text-[13.5px]">
              <span className="truncate">“{s.q}”</span>
              <span className="flex items-center gap-2">
                {s.found === 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold">No results</span>}
                <span className="font-semibold tabular-nums">{s.n}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/admin/products"
          className="mt-4 flex min-h-10 w-fit items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-ink transition-transform hover:scale-[1.03]"
        >
          <AdminIcon name="sparkle" className="size-4" /> Review the catalogue
        </Link>
      </Card>

      <p className="px-2 text-[12.5px] text-ink/50 lg:col-span-12">
        From the site&apos;s own visitor log: no cookies, nothing stored on visitors&apos; devices, no IP addresses kept; a visit&apos;s id changes every day,
        and browsers that ask not to be tracked aren&apos;t. Kept 90 days.
      </p>
    </div>
  );
}

/** A visitor's pages as a row of steps, the current one pulsing. */
function Trail({ v }: { v: Visitor }) {
  return (
    <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {v.trail.map((s, i) => {
        const last = i === v.trail.length - 1;
        return (
          <span key={s.page + s.at} className="flex items-center gap-1.5 motion-safe:animate-[admin-in_.45s_cubic-bezier(.22,1,.36,1)_both]">
            {i > 0 && <span aria-hidden="true" className="h-px w-3 bg-ink/25" />}
            <span
              className={clsx(
                "relative rounded-full px-2.5 py-1 text-[11.5px] font-medium",
                last ? (v.live ? "bg-ink text-white" : "bg-danger/10 text-danger") : "bg-ink/[0.06] text-ink/70",
              )}
            >
              {last && v.live && <span aria-hidden="true" className="absolute -inset-0.5 rounded-full ring-2 ring-ink/30 motion-safe:animate-ping" />}
              {s.page}
            </span>
          </span>
        );
      })}
    </span>
  );
}
