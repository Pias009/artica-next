"use client";

import clsx from "clsx";
import Image from "next/image";
import { useMemo, useState } from "react";
import { SEASON_IDS } from "../data";
import { Card, CardHead, SaveBar, Segmented, Toggle } from "../ui";
import { CAMPAIGNS } from "@/components/home/EditorialCampaignBanner";
import type { SeasonId } from "@/lib/season";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const START: Record<SeasonId, number[]> = { winter: [11, 0, 1], autumn: [8, 9, 10], spring: [2, 3, 4], summer: [5, 6, 7], rainy: [5, 6, 7, 8], holiday: [10, 11] };

type Rule = { live: boolean; months: number[] };

/** The six seasons: each campaign's banner, when it runs, and how the site picks a visitor's season. */
export function Seasons() {
  const init = useMemo(() => Object.fromEntries(SEASON_IDS.map((s) => [s, { live: s !== "rainy", months: START[s] }])) as Record<SeasonId, Rule>, []);
  const [saved, setSaved] = useState(init);
  const [rules, setRules] = useState(init);
  const [auto, setAuto] = useState(true);
  const [fallback, setFallback] = useState<SeasonId>("winter");
  const changes = SEASON_IDS.filter((s) => JSON.stringify(rules[s]) !== JSON.stringify(saved[s])).length;
  const now = new Date().getMonth();

  const edit = (s: SeasonId, patch: Partial<Rule>) => setRules((r) => ({ ...r, [s]: { ...r[s], ...patch } }));

  return (
    <>
      <Card i={0} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <CardHead title="How a visitor's season is chosen" sub="By their country's climate and today's date, unless they pick one themselves." />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 text-[13.5px] font-semibold">
            Auto by location <Toggle label="Pick season by location" checked={auto} onChange={setAuto} />
          </label>
          <div className={clsx("transition-opacity", auto && "pointer-events-none opacity-40")}>
            <Segmented label="Season for everyone" value={fallback} onChange={setFallback} options={(["winter", "autumn", "spring", "summer"] as const).map((s) => ({ id: s, label: CAMPAIGNS[s].label }))} />
          </div>
        </div>
      </Card>

      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SEASON_IDS.map((s, i) => {
          const c = CAMPAIGNS[s];
          const r = rules[s];
          const current = r.months.includes(now);
          return (
            <li key={s} className="contents">
              <Card i={i + 1} className={clsx("flex flex-col p-3! transition-opacity", !r.live && "opacity-65")}>
                <div className="group relative aspect-[16/9] overflow-hidden rounded-[20px] bg-ink">
                  <Image src={c.image} alt={c.alt} fill sizes="(min-width: 80rem) 400px, (min-width: 48rem) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105" />
                  <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgb(12_13_14/.75),transparent_60%)]" />
                  <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur-md">{c.seasonTag}</span>
                  {current && r.live && <span className="absolute top-3 right-3 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink">Showing now</span>}
                  <p className="absolute inset-x-4 bottom-3 text-[15px] leading-snug font-semibold text-white">
                    {c.headlineLead}
                    <span style={{ color: c.accentColor }}>{c.headlineAccent}</span>
                  </p>
                </div>
                <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-[15px] font-semibold">
                      <span className="size-3 rounded-full ring-2 ring-white" style={{ background: c.accentColor }} />
                      {c.label}
                    </p>
                    <label className="flex items-center gap-2 text-[12.5px] font-medium">
                      Live <Toggle label={`${c.label} campaign live`} checked={r.live} onChange={(v) => edit(s, { live: v })} />
                    </label>
                  </div>
                  <p className="mt-3 mb-1.5 text-[12px] text-ink/55">Runs in</p>
                  <div className="grid grid-cols-12 gap-1">
                    {MONTHS.map((m, k) => {
                      const on = r.months.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={on}
                          aria-label={new Date(2026, k).toLocaleString("en-US", { month: "long" })}
                          onClick={() => edit(s, { months: on ? r.months.filter((x) => x !== k) : [...r.months, k] })}
                          className={clsx(
                            "grid h-8 place-items-center rounded-lg text-[11.5px] font-semibold transition-colors duration-200",
                            on ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/45 hover:bg-ink/10",
                            k === now && "ring-2 ring-brand ring-offset-1",
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <SaveBar count={changes} onDiscard={() => setRules(saved)} onSave={() => setSaved(rules)} />
    </>
  );
}
