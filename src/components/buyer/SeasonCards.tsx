"use client";

import { Txt } from "../ui/Txt";
import clsx from "clsx";
import Image from "next/image";
import { backPlan, fmtDate, nextPlan, SEASONS } from "@/lib/buyer-desk";
import { useToday } from "@/lib/useToday";

/** Under this many days to the bulk order date, the card says so. */
const SOON_DAYS = 30;

/**
 * The next order date for each season, worked back from its shelf date, with the steps in between. With
 * `dates={false}` (the home page) the same cards show the seasons and their steps in order, without any dates; the
 * order calendar and the buyer desk keep the dates.
 */
export function SeasonCards({ className, dates = true }: { className?: string; dates?: boolean }) {
  const today = useToday();
  if (!dates) return <SeasonSteps className={className} />;
  return (
    <ul className={clsx("grid gap-3.5 md:grid-cols-3", className)}>
      {SEASONS.map((s) => {
        const p = today ? nextPlan(s, today) : null;
        // the labels alone, so the server and the first paint show the steps before the dates arrive
        const steps = p?.plan ?? backPlan(new Date(0), s.reorder);
        const soon = !!p && p.daysLeft <= SOON_DAYS;
        return (
          <li key={s.id} data-deco="card" className="flex flex-col overflow-hidden rounded-card bg-tile">
            {/* the season in one picture, with its name set on the photo */}
            <div className="relative aspect-[16/9] overflow-hidden bg-photo">
              <Image src={s.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/55 to-transparent" />
              <Txt as="p" k={`${s.id}.name`} label={`${s.name}: name`} className="absolute bottom-4 left-6 text-[17px] font-semibold text-white">{s.name}</Txt>
            </div>
            <div className="flex flex-1 flex-col p-6 pt-5">
              <Txt as="p" k={`${s.id}.markets`} label={`${s.name}: markets`} className="text-[13px] text-muted">{s.markets}</Txt>
              <Txt as="p" k="confirm" label="'Confirm bulk by' label" className="mt-7 text-[14px] text-ink-2">Confirm bulk by</Txt>
              <p className="mt-1 font-headline text-[clamp(34px,3.4vw,46px)] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {p ? fmtDate(p.order, today!) : "—"}
              </p>
              {/* a non-breaking space holds the line until the dates arrive, so the card doesn't jump */}
              <p className={clsx("mt-2 text-[14px] tabular-nums", soon ? "font-semibold text-brand" : "text-ink-2")}>
                {p ? (p.daysLeft === 0 ? "Today" : `${p.daysLeft} days from today${soon ? ", closing soon" : ""}`) : <>&nbsp;</>}
              </p>
              <ol className="mt-6 grid gap-2 border-t border-line pt-4 text-[14px]">
                {steps.map((m) => (
                  <li key={m.key} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-2">{m.label}</span>
                    <span className="font-semibold tabular-nums">{p ? fmtDate(m.date, today!) : "—"}</span>
                  </li>
                ))}
              </ol>
              <Txt as="p" k={`${s.id}.note`} label={`${s.name}: note`} className="mt-auto pt-5 text-[13px] text-muted">{s.note}</Txt>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The seasons as photo cards with their steps numbered in order, no dates: where they sell, what happens, the note. */
function SeasonSteps({ className }: { className?: string }) {
  return (
    <ul className={clsx("grid gap-3.5 md:grid-cols-3", className)}>
      {SEASONS.map((s) => {
        // the labels only (samples, bulk order, factory, shelves); reorders skip the samples step
        const steps = backPlan(new Date(0), s.reorder);
        return (
          <li key={s.id} data-deco="card" className="flex flex-col overflow-hidden rounded-card bg-tile">
            <div className="relative aspect-[16/9] overflow-hidden bg-photo">
              <Image src={s.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/55 to-transparent" />
              <Txt as="p" k={`${s.id}.name`} label={`${s.name}: name`} className="absolute bottom-4 left-6 text-[17px] font-semibold text-white">{s.name}</Txt>
            </div>
            <div className="flex flex-1 flex-col p-6 pt-5">
              <Txt as="p" k={`${s.id}.markets`} label={`${s.name}: markets`} className="text-[13px] text-muted">{s.markets}</Txt>
              <Txt as="p" k={`${s.id}.note`} label={`${s.name}: note`} className="mt-4 font-headline text-[clamp(22px,2vw,26px)] leading-snug font-semibold tracking-[-0.01em]">
                {s.note}
              </Txt>
              <ol className="mt-6 grid gap-0 border-t border-line pt-5">
                {steps.map((m, i) => (
                  <li key={m.key} className="relative flex items-center gap-3.5 pb-4 last:pb-0">
                    {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-7 bottom-0 left-[13px] w-px bg-line" />}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white tabular-nums">{i + 1}</span>
                    <span className="text-[14.5px] font-medium">{m.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
