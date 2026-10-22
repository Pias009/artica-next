"use client";

import clsx from "clsx";
import { useId, useState } from "react";
import { Icon } from "../Icon";
import { CONTAINERS, LCL_MAX_CASES, load } from "@/lib/buyer-desk";
import { MOQ_CASES, PACK, STEP_CASES } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

const MAX_CASES = 1800;
const DEFAULT_CASES = MOQ_CASES * 4;
const clamp = (n: number) => Math.min(MAX_CASES, Math.max(MOQ_CASES, Math.round(n / STEP_CASES) * STEP_CASES));
const n0 = (n: number) => Math.round(n).toLocaleString("en-US");

/** Cases to pairs, pallets, volume and the container that fits, starting from the buyer's inquiry list. */
export function ContainerPlanner() {
  const uid = useId();
  const listCases = useInquiry((s) => s.lines.reduce((a, l) => a + l.cases, 0));
  const openDrawer = useUI((s) => s.openDrawer);
  const [picked, setPicked] = useState<number | null>(null);
  // what's being typed: kept as-is until blur or Enter, so "300" isn't clamped to 25 at its first digit
  const [draft, setDraft] = useState<string | null>(null);

  const cases = picked ?? (listCases ? clamp(listCases) : DEFAULT_CASES);
  const commit = () => {
    if (draft !== null) setPicked(draft.trim() ? clamp(Number(draft)) : null);
    setDraft(null);
  };
  const l = load(cases);
  const room = l.count * l.container.cases - cases;
  const verdict = l.lcl
    ? `Ships in a shared container (LCL), about ${l.cbm.toFixed(1)} m³.`
    : l.count > 1
      ? `${l.count} × ${l.container.name}s, the last ${Math.round(l.fill * 100)}% full.`
      : `One ${l.container.name}, ${Math.round(l.fill * 100)}% full.`;

  const send = () =>
    openDrawer(undefined, undefined, `Container plan: ${n0(cases)} cases (${n0(l.pairs)} pairs), ${l.pallets} pallets, ${l.cbm.toFixed(1)} m³. ${verdict}`);

  return (
    <div data-deco="card" className="grid gap-8 rounded-shell bg-tile p-[clamp(20px,4vw,48px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
      <div>
        <label htmlFor={`${uid}-cases`} className="text-[15px] font-semibold">
          Cases in your order <span className="font-normal text-muted">· {PACK} pairs each</span>
        </label>
        <div className="mt-3 flex items-center gap-3">
          <input
            id={`${uid}-cases`}
            type="number"
            inputMode="numeric"
            min={MOQ_CASES}
            max={MAX_CASES}
            step={STEP_CASES}
            value={draft ?? cases}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            aria-describedby={`${uid}-range`}
            className="field w-32 tabular-nums"
          />
          <span className="text-[15px] text-ink-2 tabular-nums">= {n0(l.pairs)} pairs</span>
        </div>
        <p id={`${uid}-range`} className="mt-2 text-[13px] text-muted tabular-nums">
          {MOQ_CASES} to {n0(MAX_CASES)} cases, in steps of {STEP_CASES}
        </p>
        <input
          type="range"
          aria-label="Cases in your order"
          min={MOQ_CASES}
          max={MAX_CASES}
          step={STEP_CASES}
          value={cases}
          onChange={(e) => {
            setDraft(null);
            setPicked(Number(e.target.value));
          }}
          className="mt-4 h-11 w-full cursor-pointer accent-ink"
        />
        {listCases > 0 && (
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setPicked(null);
            }}
            className="mt-1 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand hover:underline"
          >
            Use my inquiry list ({n0(listCases)} cases)
          </button>
        )}

        <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {[
            ["Pairs", n0(l.pairs)],
            ["Pallets", n0(l.pallets)],
            ["Volume", `${l.cbm.toFixed(1)} m³`],
            ["Gross weight", `${n0(l.kg)} kg`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-ph bg-white px-4 py-3">
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[18px] font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p aria-live="polite" className="font-headline text-[clamp(22px,2.4vw,30px)] leading-tight font-semibold tracking-[-0.02em]">
          {verdict}
        </p>
        <p className="mt-2 text-[14px] text-ink-2">
          {l.lcl
            ? `Below ${LCL_MAX_CASES} cases a shared container usually costs less than a whole one.`
            : room > 0
              ? `Room for about ${n0(room)} more cases (${n0(room * PACK)} pairs) at the same freight cost.`
              : "A full container: the lowest freight cost per pair."}
        </p>

        <ul className="mt-7 grid gap-4">
          {CONTAINERS.map((c) => {
            const fill = Math.min(1, cases / c.cases);
            const best = !l.lcl && c.id === l.container.id;
            return (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className={clsx(best ? "font-semibold" : "text-ink-2")}>
                    {c.name} {best && <span className="ml-1 text-[12px] font-semibold text-brand">Best fit</span>}
                  </span>
                  <span className="text-muted tabular-nums">
                    {cases > c.cases ? `${Math.ceil(cases / c.cases)} needed` : `${Math.round(fill * 100)}% of ${n0(c.cases)} cases`}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
                  <div
                    className={clsx("h-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none", best ? "bg-ink" : "bg-ink/25")}
                    style={{ transform: `scaleX(${fill})` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <button type="button" onClick={send} className="btn btn-dark mt-8">
          Send this plan with an inquiry <Icon name="arrow" />
        </button>
        <p className="mt-3 text-[13px] text-muted">Indicative loads; your quote confirms the exact fit.</p>
      </div>
    </div>
  );
}
