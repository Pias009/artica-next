"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { EXITS, FUNNEL, KEYWORDS, SITE_SEARCHES, SOURCES, VISITORS, type View, type Visitor } from "../data";
import { AdminIcon, Card, CardHead, CountUp, Meter, useEntered } from "../ui";

/** Pages a live visitor might open next, so the live list keeps moving. */
const NEXT = ["/catalog", "/products/nord", "/products/mira-tall", "/shipping", "/faq", "/size-guide", "/private-label", "/inquiry"];
const SOURCE_TONE = ["bg-ink", "bg-ink/70", "bg-brand", "bg-ink/45", "bg-brand/55", "bg-ink/20"];

/**
 * Visitor footprints: who is on the site now and the trail each one leaves, where they come from (and what they
 * searched for), where the buying path loses people, which pages they leave from and what they look for on the site.
 */
export function Visitors({ onGo }: { onGo?: (v: View) => void }) {
  const [visitors, setVisitors] = useState(VISITORS);
  const [selected, setSelected] = useState("v1");
  const on = useEntered();
  const current = visitors.find((v) => v.id === selected) ?? visitors[0];
  const live = visitors.filter((v) => v.live).length;

  // live visitors keep moving: every few seconds one of them opens another page
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      setVisitors((all) => {
        const movers = all.filter((v) => v.live);
        const who = movers[tick % movers.length];
        return all.map((v) => {
          if (v !== who) return v;
          const last = v.trail[v.trail.length - 1];
          const [m, s] = last.at.split(":").map(Number);
          const t = m * 60 + s + 35 + ((tick * 17) % 50);
          const page = NEXT[(tick * 3 + v.trail.length) % NEXT.length];
          const step = { page: page === last.page ? "/catalog" : page, at: `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` };
          return { ...v, trail: [...v.trail, step].slice(-6) };
        });
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const max = FUNNEL[0].n;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* the headline numbers */}
      {(
        [
          ["Visitors today", 1284, "", "+12% on last Thursday", false],
          ["On the site now", live, "", "updating live", true],
          ["Pages per visit", 3.4, "", "median 3", false],
          ["Leave after one page", 34, "%", "down from 39%", false],
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
        <CardHead title="Footprints" sub="Every visitor's trail through the site; pick one to follow it" right={<span className="text-[12.5px] text-ink/50">anonymous</span>} />
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
                    {v.live ? "On the site" : `Left from ${v.left}`}
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
              <li key={s.page + s.at} className="relative motion-safe:animate-[admin-in_.4s_cubic-bezier(.22,1,.36,1)_both]" style={{ animationDelay: `${i * 70}ms` }}>
                <span className={clsx("absolute top-1.5 -left-6 size-[11px] rounded-full ring-4 ring-[#3a3c3f]", last ? (current.live ? "bg-emerald-400" : "bg-danger") : "bg-white")} />
                <p className="text-[14px] font-semibold">{s.page}</p>
                <p className="text-[12px] text-white/55">
                  {i === 0 ? "Landed" : "Opened"} at {s.at}
                  {last && (current.live ? " · here now" : " · left the site")}
                </p>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* where the path loses people */}
      <Card i={6} className="lg:col-span-7">
        <CardHead title="Where they drop out" sub="This week's visitors, step by step along the buying path" />
        <ol className="mt-5 grid gap-3">
          {FUNNEL.map((f, i) => {
            const drop = i ? Math.round((1 - f.n / FUNNEL[i - 1].n) * 100) : 0;
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
                    className={clsx("h-full origin-left rounded-full transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]", i === FUNNEL.length - 1 ? "bg-brand" : "bg-ink")}
                    style={{ width: `${Math.max(2, (f.n / max) * 100)}%`, transform: `scaleX(${on ? 1 : 0})`, transitionDelay: `${i * 90}ms` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card i={7} className="lg:col-span-5">
        <CardHead title="Exit pages" sub="The last page before people leave, and how often it's the last" />
        <ul className="mt-5 grid gap-4">
          {EXITS.map((e) => (
            <li key={e.page}>
              <Meter label={`${e.page} · ${e.exits} exits`} value={e.rate} />
            </li>
          ))}
        </ul>
      </Card>

      {/* where they come from, and what they look for */}
      <Card i={8} className="lg:col-span-4">
        <CardHead title="Where they come from" />
        <div className="mt-5 flex h-3 overflow-hidden rounded-full">
          {SOURCES.map((s, i) => (
            <span key={s.name} className={clsx("h-full origin-left transition-transform duration-1000", SOURCE_TONE[i])} style={{ width: `${s.share}%`, transform: `scaleX(${on ? 1 : 0})` }} />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          {SOURCES.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className={clsx("size-2.5 rounded-full", SOURCE_TONE[i])} />
              <span className="flex-1">{s.name}</span>
              <span className="font-semibold tabular-nums">{s.share}%</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card i={9} className="lg:col-span-4">
        <CardHead title="What they searched to find you" sub="Search-engine words, this month" />
        <ul className="mt-4 grid gap-2.5">
          {KEYWORDS.map((k) => (
            <li key={k.q} className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-3.5 py-2.5 text-[13.5px]">
              <span className="truncate">“{k.q}”</span>
              <span className="font-semibold tabular-nums">{k.n}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card i={10} tone="dark" className="lg:col-span-4">
        <CardHead dark title="Searches on the site" sub="What visitors typed into search" />
        <ul className="mt-4 grid gap-2.5">
          {SITE_SEARCHES.map((s) => (
            <li key={s.q} className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-3.5 py-2.5 text-[13.5px]">
              <span className="truncate">“{s.q}”</span>
              <span className="flex items-center gap-2">
                {s.found === 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold">No results</span>}
                <span className="font-semibold tabular-nums">{s.n}</span>
              </span>
            </li>
          ))}
        </ul>
        {onGo && (
          <button type="button" onClick={() => onGo("agent")} className="mt-4 flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-ink transition-transform hover:scale-[1.03]">
            <AdminIcon name="sparkle" className="size-4" /> Let the agent fill the gaps
          </button>
        )}
      </Card>

      <p className="px-2 text-[12.5px] text-ink/50 lg:col-span-12">
        Sample data for the layout. Live footprints need a tracking script and, under the privacy policy, a consent banner first: visitors are counted only once they agree.
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
