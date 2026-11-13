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
/** When a visit began: the time for today's, the day and time for older ones (the list now reaches back past today). */
function seen(iso: string) {
  const d = new Date(iso);
  const time = { hour: "2-digit", minute: "2-digit" } as const;
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("en-GB", time) : d.toLocaleString("en-GB", { day: "numeric", month: "short", ...time });
}

export function Visitors() {
  const panel = usePanel();
  const data = panel.visitors ?? EMPTY;
  const visitors = data.people;
  const [selected, setSelected] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | "live" | "email">("all");
  const [query, setQuery] = useState("");
  const on = useEntered();
  const words = query.trim().toLowerCase();
  const list = visitors.filter(
    (v) =>
      (show === "all" || (show === "live" ? v.live : !!v.email)) &&
      (!words || [v.name, v.tag, v.email ?? "", v.company ?? "", v.country, ...v.footprint.map((s) => s.page)].join(" ").toLowerCase().includes(words)),
  );
  const current = visitors.find((v) => v.id === selected) ?? list[0];
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

      {/* every visitor, each on their own */}
      <Card i={4} className="lg:col-span-7 lg:min-h-[600px]">
        <CardHead
          title="Visitors"
          sub="Everyone who has visited, newest first, one card each. Pick one to follow their footprint."
          right={<span className="text-[12.5px] text-ink/50 tabular-nums">{visitors.length} visitors</span>}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1 rounded-full bg-ink/[0.05] p-1">
            {(
              [
                ["all", "All", visitors.length],
                ["live", "On the site", visitors.filter((v) => v.live).length],
                ["email", "Gave email", visitors.filter((v) => v.email).length],
              ] as const
            ).map(([id, label, n]) => (
              <button
                key={id}
                type="button"
                aria-pressed={show === id}
                onClick={() => setShow(id)}
                className={clsx("min-h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors", show === id ? "bg-ink text-white" : "text-ink/65 hover:text-ink")}
              >
                {label} <span className={clsx("tabular-nums", show === id ? "text-white/60" : "text-ink/40")}>{n}</span>
              </button>
            ))}
          </div>
          <label className="flex min-w-40 flex-1 items-center rounded-full bg-white/80 px-3.5 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
            <span className="sr-only">Find a visitor</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find by name, email, country or page" className="min-h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-ink/40" />
          </label>
        </div>
        {!visitors.length && (
          <p className="mt-4 text-[14px] text-ink/55">{panel.ready ? "No visits logged yet." : "No database connected: nothing is logged."}</p>
        )}
        {visitors.length > 0 && !list.length && <p className="mt-4 text-[13.5px] text-ink/55">No visitor matches.</p>}
        <ul className="mt-3 grid max-h-[720px] gap-2.5 overflow-y-auto pr-1">
          {list.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                aria-pressed={v.id === current?.id}
                onClick={() => setSelected(v.id)}
                style={{ borderLeftColor: `hsl(${v.hue} 55% 55%)` }}
                className={clsx(
                  "w-full rounded-3xl border-l-4 p-3.5 text-left transition-[background-color,box-shadow] duration-200",
                  v.id === current?.id ? "bg-white shadow-[0_8px_22px_-14px_rgb(18_20_22/.45)] ring-1 ring-ink/10" : "bg-white/50 hover:bg-white/80",
                )}
              >
                <span className="flex items-start gap-3">
                  <Avatar v={v} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <Who v={v} />
                      <span className={clsx("flex items-center gap-1.5 text-[12px] font-semibold", v.live ? "text-emerald-600" : "text-ink/45")}>
                        <span className={clsx("size-1.5 rounded-full", v.live ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-ink/30")} />
                        {v.live ? "On the site" : `Left ${ago(v.lastSeen)}`}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink/55">
                      <span aria-hidden="true">{v.flag}</span> {v.country} · {v.device} · from {v.source} · {v.pages} {v.pages === 1 ? "page" : "pages"} in {v.minutes} min
                    </span>
                  </span>
                </span>
                <Trail v={v} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* one visitor, followed */}
      <Card i={5} tone="dark" className="lg:col-span-5 lg:h-0 lg:min-h-full lg:overflow-y-auto">
        {!current ? (
          <CardHead dark title="Footprint" sub="Pick a visitor when one comes in" />
        ) : (
          <div key={current.id}>
            <div className="flex items-center gap-3">
              <Avatar v={current} big />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-white/50">Footprint of</p>
                <p className="truncate text-[18px] font-semibold">{current.email ?? current.name}</p>
                <p className="truncate text-[12.5px] text-white/55">
                  {current.email ? `${current.name} · ` : "Anonymous · "}#{current.tag}
                </p>
              </div>
            </div>
            {current.email && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {current.gmail && <GmailBadge dark />}
                {current.company && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold">{current.company}</span>}
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white/70">{current.via === "signup" ? "Signed up for the line sheet" : "Sent an inquiry"}</span>
                {current.ref && (
                  <Link href={`/admin/inquiries/${current.ref}`} className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink">
                    Open {current.ref}
                  </Link>
                )}
              </div>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2.5 text-[13px]">
              {(
                [
                  ["From", `${current.flag} ${current.country}`],
                  ["On", current.device],
                  ["Came from", current.source],
                  ["Searched for", current.searched ? `“${current.searched}”` : "Nothing"],
                  ["First seen", seen(current.firstSeen)],
                  ["On the site", `${current.minutes} min · ${current.pages} ${current.pages === 1 ? "page" : "pages"}`],
                ] as const
              ).map(([k, val]) => (
                <div key={k} className="rounded-2xl bg-white/8 p-3">
                  <dt className="text-white/55">{k}</dt>
                  <dd className="mt-0.5 truncate font-semibold">{val}</dd>
                </div>
              ))}
            </dl>
            <ol className="relative mt-5 grid gap-4 pl-6">
              <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-px bg-white/20" />
              {current.footprint.map((s, i) => {
                const last = i === current.footprint.length - 1;
                return (
                  <li key={s.at + s.kind + i} className="relative motion-safe:animate-[admin-in_.4s_cubic-bezier(.22,1,.36,1)_both]" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                    <span
                      className={clsx(
                        "absolute top-1.5 -left-6 size-[11px] rounded-full ring-4 ring-[#3a3c3f]",
                        last && s.kind === "view" ? (current.live ? "bg-emerald-400" : "bg-danger") : STEP_DOT[s.kind] ?? "bg-white",
                      )}
                    />
                    <p className="text-[12px] font-semibold text-white/55">
                      {s.label} · +{s.after}
                    </p>
                    <p className="text-[14px] font-semibold break-all">{s.detail ?? s.page}</p>
                    {s.detail && <p className="text-[12px] text-white/50">on {s.page}</p>}
                    {last && <p className="text-[12px] text-white/55">{current.live ? "Here now" : "Left the site"}</p>}
                  </li>
                );
              })}
            </ol>
          </div>
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
        From the site&apos;s own visitor log: no cookies, nothing stored on visitors&apos; devices, no IP addresses kept. Each visit gets a made-up name; its id
        changes every day, so the same person shows as a new visitor the next day. A visitor who sends an inquiry or signs up is shown by the email they
        gave. Browsers that ask not to be tracked aren&apos;t. Kept for good: nothing is deleted on a timer. The list shows the newest 300 visits.
      </p>
    </div>
  );
}

/** The dot on each kind of step in a footprint. */
const STEP_DOT: Record<string, string> = { search: "bg-sky-300", add: "bg-amber-300", inquiry: "bg-brand", contact: "bg-emerald-400" };

const initials = (v: Visitor) => (v.email ? v.email.slice(0, 2) : v.name.split(" ").map((w) => w[0]).join("")).toUpperCase();

/** The visitor's colour and initials: the same visit always looks the same. */
function Avatar({ v, big = false }: { v: Visitor; big?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ background: `hsl(${v.hue} 55% 88%)`, color: `hsl(${v.hue} 45% 28%)` }}
      className={clsx("relative grid flex-none place-items-center rounded-full font-semibold", big ? "size-12 text-[15px]" : "size-10 text-[13px]")}
    >
      {initials(v)}
      {v.live && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </span>
  );
}

/** Who it is: the email they gave (with a Gmail mark for Gmail addresses), else the visit's name. */
function Who({ v }: { v: Visitor }) {
  return v.email ? (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate text-[14px] font-semibold">{v.email}</span>
      {v.gmail && <GmailBadge />}
    </span>
  ) : (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-[14px] font-semibold">{v.name}</span>
      <span className="text-[12px] text-ink/40 tabular-nums">#{v.tag}</span>
    </span>
  );
}

function GmailBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span className={clsx("inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", dark ? "bg-white text-ink" : "bg-[#ea4335]/10 text-[#c5221f]")}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3">
        <path d="M3 6.5V18a1 1 0 001 1h3V10l5 3.8L17 10v9h3a1 1 0 001-1V6.5L12 13z" fill="#ea4335" />
      </svg>
      Gmail
    </span>
  );
}

/** A visitor's pages as a row of steps, the current one pulsing; long visits show the last few. */
function Trail({ v }: { v: Visitor }) {
  return (
    <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {v.trail.length > 7 && <span className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-[11.5px] text-ink/50">+{v.trail.length - 6} earlier</span>}
      {v.trail.slice(v.trail.length > 7 ? -6 : 0).map((s, i, shown) => {
        const last = i === shown.length - 1;
        return (
          <span key={s.page + s.at} className="flex items-center gap-1.5 motion-safe:animate-[admin-in_.45s_cubic-bezier(.22,1,.36,1)_both]">
            {(i > 0 || v.trail.length > 7) && <span aria-hidden="true" className="h-px w-3 bg-ink/25" />}
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
