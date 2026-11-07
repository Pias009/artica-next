"use client";

import clsx from "clsx";
import Image from "next/image";
import { useMemo, useState } from "react";
import { SEASON_IDS } from "../data";
import { usePanel, useSaver } from "../panel-data";
import { Card, CardHead, SaveBar, Segmented, Sheet, Toggle } from "../ui";
import { SeasonEditor } from "./SeasonEditor";
import { HERO_SEASON_COPY } from "@/components/home/HeroSpotlight";
import { merged, type SeasonCopy, type SeasonCopyMap } from "@/lib/season-copy";
import { LINE_LABEL } from "@/lib/products";
import { saveSeasonCopyAction, saveSeasonsAction } from "@/app/admin/content-actions";
import type { SiteContent } from "@/lib/content/model";
import { SEASON_DATA } from "@/lib/season";
import { CAMPAIGNS } from "@/components/home/EditorialCampaignBanner";
import type { SeasonId } from "@/lib/season";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
/** When each season runs on the site: the northern calendar (other climates follow their own, in lib/season.ts). */
const monthsOf = (s: SeasonId) =>
  s === "holiday"
    ? [10, 11]
    : s === "rainy"
      ? SEASON_DATA.months.monsoon.flatMap((x, k) => (x === "rainy" ? [k] : []))
      : SEASON_DATA.months.north.flatMap((x, k) => (x === s ? [k] : []));

type Rules = SiteContent["seasons"];

/** The six seasons: each campaign's banner, when it runs, and how the site picks a visitor's season. */
export function Seasons() {
  const panel = usePanel();
  const init = useMemo<Rules>(() => panel.content.seasons, [panel]);
  const [saved, setSaved] = useState(init);
  const [rules, setRules] = useState(init);
  const saver = useSaver(saveSeasonsAction, setSaved);
  const { auto, fallback } = rules;
  const setAuto = (v: boolean) => setRules((r) => ({ ...r, auto: v }));
  const setFallback = (v: SeasonId) => setRules((r) => ({ ...r, fallback: v }));
  const live = (s: SeasonId) => rules.campaigns[s]?.live ?? true;
  const changes =
    Number(rules.auto !== saved.auto) +
    Number(rules.fallback !== saved.fallback) +
    SEASON_IDS.filter((s) => live(s) !== (saved.campaigns[s]?.live ?? true)).length;
  const now = new Date().getMonth();

  // each season's words and photo, published from its own panel
  const [copy, setCopy] = useState<SeasonCopyMap>(() => panel.content.seasonCopy ?? {});
  const [editing, setEditing] = useState<SeasonId | null>(null);
  const copySaver = useSaver(
    (v: { id: SeasonId; c: SeasonCopy }) => saveSeasonCopyAction({ ...copy, [v.id]: v.c }),
    (v) => {
      setCopy((cur) => ({ ...cur, [v.id]: v.c }));
      setEditing(null);
    },
  );
  const campaignOf = (s: SeasonId) => merged(CAMPAIGNS[s], copy[s]?.campaign);
  const styles = panel.products
    .map((p) => ({ slug: p.base.slug, name: p.name, line: LINE_LABEL[p.base.line] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const edit = (s: SeasonId, v: boolean) =>
    setRules((r) => ({
      ...r,
      campaigns: { ...r.campaigns, [s]: { live: v } },
    }));

  return (
    <>
      <Card i={0} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <CardHead
          title="How a visitor's season is chosen"
          sub="By their country's climate and today's date, unless they pick one themselves. Switching a campaign off hides its banner on the home page."
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 text-[13.5px] font-semibold">
            Auto by location <Toggle label="Pick season by location" checked={auto} onChange={setAuto} />
          </label>
          <div className={clsx("transition-opacity", auto && "pointer-events-none opacity-40")}>
            <Segmented
              label="Season for everyone"
              value={fallback}
              onChange={setFallback}
              options={(["winter", "autumn", "spring", "summer"] as const).map((s) => ({ id: s, label: CAMPAIGNS[s].label }))}
            />
          </div>
        </div>
      </Card>

      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SEASON_IDS.map((s, i) => {
          const c = campaignOf(s);
          const r = { live: live(s), months: monthsOf(s) };
          const current = r.months.includes(now);
          return (
            <li key={s} className="contents">
              <Card i={i + 1} className={clsx("flex flex-col p-3! transition-opacity", !r.live && "opacity-65")}>
                <div className="group relative aspect-[16/9] overflow-hidden rounded-[20px] bg-ink">
                  <Image
                    src={c.image}
                    alt={c.alt}
                    fill
                    sizes="(min-width: 80rem) 400px, (min-width: 48rem) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgb(12_13_14/.75),transparent_60%)]" />
                  <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur-md">
                    {c.seasonTag}
                  </span>
                  {current && r.live && (
                    <span className="absolute top-3 right-3 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink">Showing now</span>
                  )}
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
                      Live <Toggle label={`${c.label} campaign live`} checked={r.live} onChange={(v) => edit(s, v)} />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-semibold text-white transition-transform hover:scale-[1.01]"
                  >
                    Edit words and photo
                    {copy[s] && Object.keys(copy[s]!).length > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">edited</span>}
                  </button>
                  <p className="mt-3 mb-1.5 text-[12px] text-ink/55">
                    {s === "rainy" ? "Runs in (monsoon markets)" : "Runs in (northern markets; the south is six months on)"}
                  </p>
                  <div className="grid grid-cols-12 gap-1">
                    {MONTHS.map((m, k) => {
                      const on = r.months.includes(k);
                      return (
                        <span
                          key={k}
                          aria-label={`${new Date(2026, k).toLocaleString("en-US", { month: "long" })}${on ? ": runs" : ""}`}
                          className={clsx(
                            "grid h-8 place-items-center rounded-lg text-[11.5px] font-semibold transition-colors duration-200",
                            on ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/45 hover:bg-ink/10",
                            k === now && "ring-2 ring-brand ring-offset-1",
                          )}
                        >
                          {m}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!editing} onClose={() => (setEditing(null), copySaver.clearError())} title={editing ? `${CAMPAIGNS[editing].label}: words and photo` : "Season"}>
        {editing && (
          <SeasonEditor
            key={editing}
            label={CAMPAIGNS[editing].label}
            hero={HERO_SEASON_COPY[editing]}
            campaign={CAMPAIGNS[editing]}
            value={copy[editing] ?? {}}
            styles={styles}
            pending={copySaver.pending}
            error={copySaver.error}
            onSave={(c) => copySaver.save({ id: editing, c })}
          />
        )}
      </Sheet>

      <SaveBar
        count={changes}
        pending={saver.pending}
        error={saver.error}
        onDiscard={() => (setRules(saved), saver.clearError())}
        onSave={() => saver.save(rules)}
      />
    </>
  );
}
