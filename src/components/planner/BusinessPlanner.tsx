"use client";

import { deskOn } from "@/lib/content/live";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../Icon";
import { PLAN_KEY, useKai } from "../assistant/kai";
import { CashChart, Choice, NumberField, Step, Timeline, VerdictTag } from "./parts";
import { MARKET_COUNTRIES } from "@/lib/buyer-desk";
import { COUNTRIES, country as findCountry } from "@/lib/countries";
import {
  addDays,
  defaultPlan,
  EXAMPLE,
  fmt,
  LEVELS,
  planSummary,
  ROLE_LABEL,
  runPlan,
  seasonName,
  stylesFor,
  windowKey,
  type Level,
  type PlanInput,
} from "@/lib/planner";
import { CASE_PACK, LINE_LABEL, MOQ_CASES, PACK, PRIVATE_LABEL_MIN, STEP_CASES, TIERS, type ProductLine } from "@/lib/products";
import { SEASON_COOKIE } from "@/lib/season";
import { useInquiry, useUI } from "@/lib/store";
import { useToday } from "@/lib/useToday";

const STEPS = [
  ["plan-business", "Your business"],
  ["plan-timing", "When to buy"],
  ["plan-order", "What to order"],
  ["plan-costs", "Landed cost"],
  ["plan-margin", "Price & margin"],
  ["plan-cash", "Cash"],
  ["plan-notes", "Desk notes"],
] as const;

const SHIPPED = MARKET_COUNTRIES.flatMap((n) => {
  const c = findCountry(n);
  return c ? [c] : [];
});

/**
 * The business planner: a buyer's season worked out from their answers, step by step, with a live summary beside
 * it. The answers stay in this browser (and in the address, to share); nothing is sent until the buyer sends the
 * plan to the trade desk. Rendered once the browser's date is known: the plan depends on today.
 */
export function BusinessPlanner() {
  const today = useToday();
  if (!today) return <div className="min-h-[60vh] rounded-shell bg-tile motion-safe:animate-pulse" aria-label="Loading the planner" />;
  return <Planner today={today} />;
}

function initial(): PlanInput {
  const q = new URLSearchParams(location.search);
  let stored: Partial<PlanInput> = {};
  try {
    stored = JSON.parse(localStorage.getItem(PLAN_KEY) ?? "{}") ?? {};
  } catch {}
  const cookie = document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([A-Z]{2})`))?.[1];
  const level = (["new", "growing", "pro"] as Level[]).find((l) => l === (q.get("level") ?? stored.level)) ?? "new";
  const code = findCountry(q.get("country") ?? stored.country ?? cookie ?? "US")?.code ?? "US";
  const base = { ...defaultPlan(level, code), ...stored, level, country: code };
  const budget = Number(q.get("budget"));
  if (budget > 0) base.budget = budget;
  if (q.has("first")) base.firstOrder = q.get("first") === "1";
  // styles are re-suggested when the link sets the budget
  if (q.has("budget") || q.has("level")) base.styles = [];
  return base;
}

function Planner({ today }: { today: Date }) {
  const [plan, setPlan] = useState<PlanInput>(initial);
  const set = (patch: Partial<PlanInput>) => setPlan((p) => ({ ...p, ...patch }));
  const p = useMemo(() => runPlan(plan, today), [plan, today]);
  const showKai = useKai((s) => s.show);
  const openDrawer = useUI((s) => s.openDrawer);
  const setCases = useInquiry((s) => s.setCases);

  // keep the answers in this browser and in the address, so a reload or a shared link opens the same plan
  useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch {}
    const q = new URLSearchParams({
      country: plan.country,
      level: plan.level,
      budget: String(plan.budget),
      first: plan.firstOrder ? "1" : "0",
    });
    history.replaceState(history.state, "", `${location.pathname}?${q}${location.hash}`);
  }, [plan]);

  const level = LEVELS[plan.level];
  const target = windowKey(p.target);
  const recommended = p.timing.now ? windowKey(p.timing.now) : undefined;
  const lines = p.picks.map((x) => ({ id: x.id, cases: x.cases }));
  const editLines = (next: { id: string; cases: number }[]) => set({ styles: next.length ? next : lines.slice(0, 1) });
  const more = stylesFor(p.target.season, plan.lines, 24).filter((s) => !p.picks.some((x) => x.id === s.id));
  const usedLines = [...new Set(p.picks.map((x) => x.product.line))] as ProductLine[];
  const freightKey = p.shipment.lcl ? "lcl" : p.shipment.container.id;

  const send = () => {
    for (const x of p.picks) setCases(x.id, x.cases);
    openDrawer(plan.level === "pro" ? "Distributor" : "Retailer", undefined, planSummary(p), "quote");
  };

  return (
    <div data-plan className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start lg:gap-12">
      <div className="min-w-0">
        <nav
          aria-label="Plan steps"
          className="sticky top-[84px] z-20 -mx-2 mb-10 overflow-x-auto rounded-full bg-white/92 px-2 py-1.5 shadow-[0_1px_0_rgb(18_20_22/0.06)] backdrop-blur-md print:hidden"
        >
          <ol className="flex w-max gap-1">
            {STEPS.map(([id, label], i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-ink-2 hover:bg-chip hover:text-ink"
                >
                  <span className="text-muted tabular-nums">{i + 1}</span> {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid gap-12">
          <Step n={1} id="plan-business" title="Your business" sub="Three answers set the rest of the plan. Change them at any time; everything below updates.">
            <fieldset>
              <legend className="text-[14px] font-semibold">Where are you in your business?</legend>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                {(Object.keys(LEVELS) as Level[]).map((id) => {
                  const L = LEVELS[id];
                  const on = plan.level === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => set({ level: id, targetMargin: L.margin, styles: [] })}
                      className={clsx(
                        "rounded-card p-4 text-left transition-[background-color,box-shadow]",
                        on ? "bg-white shadow-[0_0_0_2px_var(--color-ink)]" : "bg-tile hover:bg-chip-hover",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[16px] font-semibold">{L.name}</span>
                        <span
                          aria-hidden="true"
                          className={clsx("grid size-5 place-items-center rounded-full border-2", on ? "border-ink bg-ink text-white" : "border-ink/25")}
                        >
                          {on && <Icon name="check" className="size-3" />}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-[13.5px] leading-snug text-ink-2">{L.who}</span>
                      <span className="mt-2 block text-[13px] leading-snug text-muted">{L.promise}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="plan-country" className="block text-[14px] font-semibold">
                  Where do you sell?
                </label>
                <select id="plan-country" value={plan.country} onChange={(e) => set({ country: e.target.value, target: "" })} className="field mt-1.5 h-[50px]">
                  <optgroup label="We ship here regularly">
                    {SHIPPED.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="All countries">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-1.5 text-[13px] text-muted">
                  {p.timing.market
                    ? `Sea transit to ${p.timing.market.name}: ${p.timing.market.transit}. We plan on the slow end.`
                    : `Not one of our regular routes yet: we plan on ${p.timing.lead.transit} days at sea until the desk confirms.`}
                </p>
              </div>
              <Choice
                label="Have you ordered from us before?"
                options={[
                  { id: "first", label: "First order" },
                  { id: "repeat", label: "Ordered before" },
                ]}
                value={[plan.firstOrder ? "first" : "repeat"]}
                onChange={([v]) => set({ firstOrder: v === "first" })}
              />
              <Choice
                label="Who are your customers?"
                multi
                options={(["women", "men", "kids"] as ProductLine[]).map((l) => ({ id: l, label: LINE_LABEL[l] }))}
                value={plan.lines}
                onChange={(v) => set({ lines: v, styles: [] })}
              />
            </div>
          </Step>

          <Step
            n={2}
            id="plan-timing"
            title="When to buy"
            sub="Stock is made to order, then crosses the sea. Buy for the season it can still reach in time, not the one you're in."
          >
            <p className="mb-4 rounded-card bg-sky px-4 py-3 text-[15px]">
              From order to your shelf: <strong className="tabular-nums">{p.timing.leadDays} days</strong>
              <span className="text-ink-2">
                {" "}
                · {p.timing.lead.bulk} production + {p.timing.lead.transit} at sea + {p.timing.lead.prep} customs and unpacking
                {plan.firstOrder && ` + ${p.timing.lead.samples + p.timing.lead.review} samples and your review`}
              </span>
            </p>
            <Timeline
              windows={p.timing.windows}
              today={today}
              arrival={addDays(today, p.timing.leadDays)}
              target={target}
              recommended={recommended}
              onPick={(key) => set({ target: key, styles: [] })}
            />
            <p className="mt-4 text-[15px] text-ink-2">
              {p.target.verdict === "late" ? (
                <>
                  <strong className="text-danger">This season can&rsquo;t be reached at full price any more.</strong> Ordered today, stock lands around{" "}
                  {fmt.date(p.target.arrival)}. Pick a season marked on time.
                </>
              ) : (
                <>
                  Planning for <strong className="text-ink">{seasonName(p.target.season).toLowerCase()}</strong>, selling {fmt.date(p.target.start)} to{" "}
                  {fmt.date(p.target.end)}. Place the order by <strong className="text-ink">{fmt.date(p.target.orderBy)}</strong>
                  {p.target.daysToOrderBy >= 0 && ` (${p.target.daysToOrderBy === 0 ? "today" : `${p.target.daysToOrderBy} days`})`}.
                </>
              )}
            </p>
          </Step>

          <Step
            n={3}
            id="plan-order"
            title="What to order"
            sub={`Every style and colour starts at ${MOQ_CASES} cases of ${PACK} pairs, then goes up in steps of ${STEP_CASES} cases.`}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Your budget for this order"
                prefix="$"
                value={plan.budget}
                min={1000}
                max={10_000_000}
                step={500}
                onChange={(n) => set({ budget: n, styles: [] })}
                hint="All the cash: goods, freight, duty and fees."
              />
              <NumberField
                label="Price per pair (FOB)"
                prefix="$"
                value={plan.fob}
                min={1}
                max={500}
                step={0.5}
                onChange={(n) => set({ fob: n })}
                hint={plan.fob === EXAMPLE.fob ? "Example figure. The trade desk quotes your price within 24 hours." : "Your quoted price."}
              />
            </div>

            <ul className="mt-6 grid gap-2.5">
              {p.picks.map((x, i) => (
                <li
                  key={x.id}
                  className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-card bg-tile p-3 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                >
                  <div className="relative aspect-square overflow-hidden rounded-ph bg-white">
                    <Image src={x.product.outer.src} alt="" fill sizes="72px" className="object-contain p-1.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <Link href={`/products/${x.product.slug}`} className="text-[15.5px] font-semibold hover:underline">
                        {x.product.name}
                      </Link>
                      <span className="text-[13px] text-muted">
                        {LINE_LABEL[x.product.line]} · {x.category}
                      </span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-ink-2">
                      <span className="font-semibold">{ROLE_LABEL[x.role]}</span>
                      {x.product.badge && <span>· {x.product.badge}</span>}
                      <span className="tabular-nums">· {x.pairs.toLocaleString("en-US")} pairs</span>
                      {x.pairs >= TIERS[2].pairs ? <span>· tier pricing</span> : x.pairs >= PRIVATE_LABEL_MIN ? <span>· private label possible</span> : null}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 sm:col-span-1">
                    <button
                      type="button"
                      aria-label={`${STEP_CASES} fewer cases of ${x.product.name}`}
                      disabled={x.cases <= MOQ_CASES}
                      onClick={() => editLines(lines.map((l, j) => (j === i ? { ...l, cases: l.cases - STEP_CASES } : l)))}
                      className="grid size-11 place-items-center rounded-full bg-white text-ink disabled:opacity-35"
                    >
                      <Icon name="minus" className="size-4" />
                    </button>
                    <span className="w-[86px] text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
                      {x.cases} cases
                    </span>
                    <button
                      type="button"
                      aria-label={`${STEP_CASES} more cases of ${x.product.name}`}
                      onClick={() => editLines(lines.map((l, j) => (j === i ? { ...l, cases: l.cases + STEP_CASES } : l)))}
                      className="grid size-11 place-items-center rounded-full bg-white text-ink"
                    >
                      <Icon name="plus" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${x.product.name}`}
                      disabled={p.picks.length <= 1}
                      onClick={() => editLines(lines.filter((_, j) => j !== i))}
                      className="ml-auto grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white disabled:opacity-35 sm:ml-1"
                    >
                      <Icon name="close" className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {more.length > 0 && (
                <select
                  aria-label="Add a style"
                  value=""
                  onChange={(e) => e.target.value && editLines([...lines, { id: e.target.value, cases: MOQ_CASES }])}
                  className="field h-11 w-auto py-0 pr-9"
                >
                  <option value="">Add a {seasonName(p.target.season).toLowerCase()} style…</option>
                  {more.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {LINE_LABEL[s.line]}
                      {s.badge ? ` · ${s.badge}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {plan.styles.length > 0 && (
                <button type="button" onClick={() => set({ styles: [] })} className="btn btn-ghost h-11 px-4 text-[14px]">
                  Back to our suggestion
                </button>
              )}
            </div>

            <dl className="mt-6 grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-card bg-tile px-4 py-3">
                <dt className="text-[13px] text-muted">Order</dt>
                <dd className="text-[18px] font-semibold tabular-nums">
                  {p.cases} cases · {p.pairs.toLocaleString("en-US")} pairs
                </dd>
              </div>
              <div className="rounded-card bg-tile px-4 py-3 sm:col-span-2">
                <dt className="text-[13px] text-muted">How it ships</dt>
                <dd className="text-[15px] font-semibold">
                  {p.shipment.lcl
                    ? `Shared container (LCL), ${p.shipment.cbm.toFixed(1)} m³`
                    : `${p.shipment.count > 1 ? `${p.shipment.count} × ` : ""}${p.shipment.container.name}, ${Math.round(p.shipment.fill * 100)}% full`}
                </dd>
                {!p.shipment.lcl && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(p.shipment.fill * 100)}%` }} />
                  </div>
                )}
              </div>
            </dl>
            {usedLines.length > 0 && (
              <p className="mt-3 text-[13px] text-muted">
                Sizes in each case of {PACK}:{" "}
                {usedLines.map((l, i) => (
                  <span key={l}>
                    {i > 0 && " · "}
                    {LINE_LABEL[l]} {CASE_PACK[l].map(([s, n]) => `${s}×${n}`).join(" ")}
                  </span>
                ))}
                . Custom size runs from 1,000 pairs.
              </p>
            )}
          </Step>

          <Step
            n={4}
            id="plan-costs"
            title="Landed cost"
            sub="What each pair really costs once it's in your shop. Enter your own figures; the examples are only a starting point."
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                label={p.shipment.lcl ? "Sea freight per m³ (LCL)" : `Freight per ${p.shipment.container.name}`}
                prefix="$"
                value={freightKey === "lcl" ? plan.freight.lclPerCbm : plan.freight.container[freightKey]}
                min={0}
                max={50_000}
                step={freightKey === "lcl" ? 5 : 100}
                onChange={(n) =>
                  set({
                    freight:
                      freightKey === "lcl"
                        ? { ...plan.freight, lclPerCbm: n }
                        : {
                            ...plan.freight,
                            container: {
                              ...plan.freight.container,
                              [freightKey]: n,
                            },
                          },
                  })
                }
                hint="Estimate. Your forwarder or our desk quotes the real rate."
              />
              <NumberField
                label="Import duty"
                suffix="%"
                value={plan.dutyPct}
                min={0}
                max={100}
                step={0.5}
                onChange={(n) => set({ dutyPct: n })}
                hint="Your customs broker gives this; it depends on the shoe and your country."
              />
              <NumberField
                label="Import VAT / GST"
                suffix="%"
                value={plan.vatPct}
                min={0}
                max={40}
                step={0.5}
                onChange={(n) => set({ vatPct: n })}
                hint="Paid at import, reclaimed if you're VAT-registered. Shown, not added."
              />
              <NumberField
                label="Insurance"
                suffix="%"
                value={plan.insurancePct}
                min={0}
                max={5}
                step={0.1}
                onChange={(n) => set({ insurancePct: n })}
                hint="Of goods and freight. 0.5% is typical."
              />
              <NumberField
                label="Bank, inspection and broker fees"
                prefix="$"
                value={plan.fees}
                min={0}
                max={100_000}
                step={50}
                onChange={(n) => set({ fees: n })}
                hint="Estimate, in total."
              />
            </div>

            <div className="mt-6 rounded-shell bg-tile p-[clamp(16px,2.6vw,28px)]">
              <p className="text-[14px] text-ink-2">Landed cost per pair</p>
              <p className="font-headline text-[clamp(34px,4vw,48px)] leading-none font-semibold tabular-nums">{fmt.usd(p.cost.perPair, 2)}</p>
              <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white" aria-hidden="true">
                {(["goods", "freight", "duty", "insurance", "fees"] as const).map((k, i) => (
                  <span
                    key={k}
                    className={["bg-ink", "bg-brand", "bg-[#c98a1b]", "bg-ink/40", "bg-ink/20"][i]}
                    style={{ width: `${p.cost.share[k] * 100}%` }}
                  />
                ))}
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                {(
                  [
                    ["goods", "Goods", "bg-ink"],
                    ["freight", "Freight", "bg-brand"],
                    ["duty", "Duty", "bg-[#c98a1b]"],
                    ["insurance", "Insurance", "bg-ink/40"],
                    ["fees", "Fees", "bg-ink/20"],
                  ] as const
                ).map(([k, label, dot]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
                    <dt className="flex items-center gap-2">
                      <span aria-hidden="true" className={clsx("size-2.5 rounded-sm", dot)} />
                      {label}
                    </dt>
                    <dd className="tabular-nums">
                      {fmt.usd(p.cost[k])} <span className="text-muted">· {fmt.usd(p.cost[k] / Math.max(1, p.pairs), 2)}/pair</span>
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 font-semibold">
                  <dt>Total landed</dt>
                  <dd className="tabular-nums">{fmt.usd(p.cost.total)}</dd>
                </div>
                {p.cost.vat > 0 && (
                  <div className="flex items-baseline justify-between gap-3 text-ink-2">
                    <dt>Import VAT paid, then reclaimed</dt>
                    <dd className="tabular-nums">{fmt.usd(p.cost.vat)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Step>

          <Step
            n={5}
            id="plan-margin"
            title="Price and margin"
            sub="What you sell each pair for, and what the order makes if not everything sells at full price."
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Your selling price"
                prefix="$"
                value={plan.price}
                placeholder={p.price.toFixed(2)}
                min={0}
                max={5000}
                step={1}
                onChange={(n) => set({ price: n })}
                hint={plan.price ? "Your price." : `Suggested for a ${Math.round(plan.targetMargin * 100)}% margin. Type your own.`}
              />
              <NumberField
                label="Margin you aim for"
                suffix="%"
                value={Math.round(plan.targetMargin * 100)}
                min={5}
                max={90}
                step={1}
                onChange={(n) => set({ targetMargin: n / 100 })}
                hint={plan.level === "pro" ? "Selling on to shops: 30–45% is common." : "Shops often aim for 50–60%."}
              />
              <NumberField
                label="Sold at full price"
                suffix="%"
                value={Math.round(plan.sellThrough * 100)}
                min={10}
                max={100}
                step={5}
                onChange={(n) => set({ sellThrough: n / 100 })}
                hint="80% is a good season."
              />
              <NumberField
                label="Markdown on the rest"
                suffix="%"
                value={plan.markdownPct}
                min={0}
                max={90}
                step={5}
                onChange={(n) => set({ markdownPct: n })}
                hint="Discount in the end-of-season sale."
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                ["Margin per pair", fmt.pct(p.margin.unitMargin)],
                ["Markup", `${p.margin.markup.toFixed(2)}×`],
                ["Break-even", `${fmt.pct(p.margin.breakEven)} sold`],
                [`Profit at ${fmt.pct(plan.sellThrough)}`, fmt.usd(p.chosen.profit)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-card bg-tile px-4 py-3">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className={clsx("text-[20px] font-semibold tabular-nums", k.startsWith("Profit") && p.chosen.profit < 0 && "text-danger")}>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-[14.5px] tabular-nums">
                <caption className="mb-2 text-left text-[14px] text-ink-2">If the season goes differently (the rest sold at {plan.markdownPct}% off)</caption>
                <thead className="text-[13px] text-muted">
                  <tr>
                    <th className="py-1.5 font-normal">Sold at full price</th>
                    <th className="py-1.5 font-normal">Revenue</th>
                    <th className="py-1.5 font-normal">Profit</th>
                    <th className="py-1.5 font-normal">Return on cost</th>
                  </tr>
                </thead>
                <tbody>
                  {p.margin.scenarios.map((s) => (
                    <tr key={s.sellThrough} className="border-t border-line">
                      <td className="py-2 font-semibold">{fmt.pct(s.sellThrough)}</td>
                      <td className="py-2">{fmt.usd(s.revenue)}</td>
                      <td className={clsx("py-2", s.profit < 0 && "text-danger")}>{fmt.usd(s.profit)}</td>
                      <td className="py-2">{fmt.pct(s.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Step>

          <Step
            n={6}
            id="plan-cash"
            title="Cash"
            sub={`You pay before you sell: ${plan.depositPct}% when you order, the rest when it ships. This is how long the money is out.`}
          >
            <ul className="mb-5 grid gap-2.5 sm:grid-cols-3">
              {[
                [fmt.date(p.orderDate), `Deposit ${plan.depositPct}% and fees`, p.cost.goods * (plan.depositPct / 100) + p.cost.fees],
                [fmt.date(p.cash.ships), "Balance, freight, insurance", p.cost.goods * (1 - plan.depositPct / 100) + p.cost.freight + p.cost.insurance],
                [fmt.date(p.cash.lands), "Duty and VAT at arrival", p.cost.duty + p.cost.vat],
              ].map(([when, what, amount]) => (
                <li key={what as string} className="rounded-card bg-tile px-4 py-3">
                  <p className="text-[13px] text-muted tabular-nums">{when}</p>
                  <p className="text-[14px] font-semibold">{what}</p>
                  <p className="text-[18px] font-semibold tabular-nums">{fmt.usd(amount as number)}</p>
                </li>
              ))}
            </ul>
            <CashChart months={p.cash.months} peak={p.cash.peak} />
            <p className="mt-4 text-[15px] text-ink-2">
              The most tied up at once: <strong className="text-ink tabular-nums">{fmt.usd(p.cash.peak)}</strong>.{" "}
              {p.cash.payback ? (
                <>
                  Paid back by{" "}
                  {p.cash.payback.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </>
              ) : (
                "On these numbers it doesn't pay back within the season."
              )}
              {p.cash.peak > plan.budget * 1.05 && <strong className="text-danger"> That&rsquo;s above your {fmt.usd(plan.budget)} budget.</strong>}
            </p>
          </Step>

          <Step
            n={7}
            id="plan-notes"
            title="Notes from the desk"
            sub={`How our team would read this plan for a buyer at your stage (${level.name.toLowerCase()}). Rules of thumb, not guarantees.`}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {p.notes.map((n, i) => (
                <article key={n.desk} className={clsx("rounded-card border border-line bg-white p-5", i === 0 && "md:col-span-2")}>
                  <header className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
                    <h3 className="text-[16px] font-semibold">{n.desk}</h3>
                    <span className="text-[13px] text-muted">{n.who}</span>
                  </header>
                  <ul className="mt-3 grid gap-2 text-[14.5px] leading-relaxed text-ink-2">
                    {n.points.map((pt) => (
                      <li key={pt} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-brand" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Step>
        </div>
      </div>

      <aside aria-label="Your plan" className="lg:sticky lg:top-24">
        <div className="rounded-shell bg-ink p-6 text-white print:bg-white print:text-ink print:ring-1 print:ring-ink/20">
          <p className="text-[13px] font-semibold tracking-[0.06em] text-white/60 uppercase print:text-muted">Your plan</p>
          <p className="mt-2 font-headline text-[26px] leading-tight font-semibold">
            {seasonName(p.target.season)} {p.target.start.getFullYear()}
          </p>
          <p className="text-[14px] text-white/75 print:text-ink-2">
            {p.timing.country?.name} · {level.name}
          </p>
          <VerdictTag v={p.target.verdict} className="mt-2 rounded-full bg-white px-2.5 py-1" />

          <dl className="mt-5 grid gap-3 text-[14px]">
            {[
              [
                "Order by",
                p.target.verdict === "late"
                  ? "Passed"
                  : `${fmt.date(p.target.orderBy)}${p.target.daysToOrderBy >= 0 ? ` · ${p.target.daysToOrderBy === 0 ? "today" : `${p.target.daysToOrderBy} days`}` : ""}`,
              ],
              ["On your shelf", fmt.date(p.target.verdict === "on-time" ? addDays(p.target.start, -14) : p.target.arrival)],
              ["Styles", `${p.picks.length} · ${p.pairs.toLocaleString("en-US")} pairs`],
              ["Landed per pair", fmt.usd(p.cost.perPair, 2)],
              ["Selling at", `${fmt.usd(p.price, 2)} · ${fmt.pct(p.margin.unitMargin)} margin`],
              ["Break-even", `${fmt.pct(p.margin.breakEven)} sold`],
              ["Cash needed", fmt.usd(p.cash.peak)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/12 pb-2 print:border-line">
                <dt className="text-white/65 print:text-muted">{k}</dt>
                <dd className="text-right font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          {p.checks.length > 0 && (
            <ul className="mt-4 grid gap-1.5 text-[13.5px]">
              {p.checks.map((c) => (
                <li key={c} className="flex gap-2 text-[#f3c97a] print:text-ink">
                  <span aria-hidden="true">!</span>
                  {c}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid gap-2.5 print:hidden">
            <button type="button" onClick={send} className="btn bg-white text-ink hover:bg-white/90">
              Send plan to the trade desk <Icon name="arrow" />
            </button>
            <button type="button" onClick={() => window.print()} className="btn border border-white/25 text-white hover:border-white/60">
              Print or save as PDF
            </button>
            {deskOn("plan") && (
              <button
                type="button"
                onClick={() =>
                  showKai(
                    "plan",
                    `Walk me through my plan: ${seasonName(p.target.season).toLowerCase()} in ${p.timing.country?.name}, budget ${fmt.usd(plan.budget)}.`,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-1.5 text-[14px] font-semibold text-white/85 hover:text-white"
              >
                <Icon name="chat" className="size-4" /> Talk it through with the planning desk
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 px-2 text-[12.5px] leading-snug text-muted">
          Planning estimates from your figures. The trade desk confirms prices, freight and dates when you send the plan. Your answers stay in this browser
          until then.
        </p>
      </aside>
    </div>
  );
}
