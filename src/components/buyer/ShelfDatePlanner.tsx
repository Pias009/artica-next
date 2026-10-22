"use client";

import clsx from "clsx";
import { useId, useState } from "react";
import { Icon } from "../Icon";
import { backPlan, fmtDate, LEAD_DAYS, REVIEW_DAYS, SHELF_DAYS } from "@/lib/buyer-desk";
import { useUI } from "@/lib/store";
import { useToday } from "@/lib/useToday";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The shortest time from today to the shelf, with and without a sample round first. */
const WITHOUT_SAMPLES = LEAD_DAYS.bulk + LEAD_DAYS.delivery + SHELF_DAYS;
const WITH_SAMPLES = WITHOUT_SAMPLES + LEAD_DAYS.samples + REVIEW_DAYS;

/** Pick the day boots should be on your shelves; it works back to every date you need to hit. */
export function ShelfDatePlanner() {
  const uid = useId();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const openDrawer = useUI((s) => s.openDrawer);

  const value = picked ?? (today ? iso(addDays(today, WITH_SAMPLES + 30)) : "");
  const shelf = value ? fromIso(value) : null;
  const plan = shelf ? backPlan(shelf) : [];
  const late = (key: string) => !!today && (plan.find((m) => m.key === key)?.date ?? today) < today;
  const samplesLate = late("samples");
  const orderLate = late("order");

  const send = () => {
    const steps = plan.filter((m) => !(samplesLate && m.key === "samples")).map((m) => `${m.label} ${fmtDate(m.date, today!)}`);
    openDrawer(undefined, undefined, `Shelf date ${fmtDate(shelf!, today!)}. Plan: ${steps.join(", ")}.`);
  };

  return (
    <div data-deco="card" className="grid gap-8 rounded-shell bg-tile p-[clamp(20px,4vw,48px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
      <div>
        <label htmlFor={`${uid}-date`} className="text-[15px] font-semibold">
          When should the boots be on your shelves?
        </label>
        <input
          id={`${uid}-date`}
          type="date"
          value={value}
          min={today ? iso(addDays(today, 1)) : undefined}
          onChange={(e) => setPicked(e.target.value || null)}
          className="field mt-3 max-w-[280px] tabular-nums"
        />
        <p className="mt-4 max-w-[40ch] text-[14px] text-ink-2">
          Samples take {LEAD_DAYS.samples} days, production {LEAD_DAYS.bulk}, delivery {LEAD_DAYS.delivery}. We allow {REVIEW_DAYS} days for you to approve
          the sample and {SHELF_DAYS} to get the delivery onto the shelf.
        </p>
        {today && (
          <p className="mt-3 text-[14px] text-ink-2">
            Earliest shelf date: <b className="tabular-nums">{fmtDate(addDays(today, WITH_SAMPLES), today)}</b> with samples,{" "}
            <b className="tabular-nums">{fmtDate(addDays(today, WITHOUT_SAMPLES), today)}</b> for a reorder.
          </p>
        )}
      </div>

      <div>
        <ol className="grid gap-0">
          {plan.map((m, i) => {
            const past = !!today && m.date < today;
            return (
              <li key={m.key} className="relative flex gap-4 pb-6 last:pb-0">
                {i < plan.length - 1 && <span aria-hidden="true" className="absolute top-8 bottom-0 left-[15px] w-px bg-line" />}
                <span
                  className={clsx(
                    "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
                    past ? "bg-white text-muted ring-1 ring-ink/12" : "bg-ink text-white",
                  )}
                >
                  {i + 1}
                </span>
                <span className="pt-1">
                  <b className={clsx("block text-[15px] font-semibold", past && "text-muted line-through")}>{m.label}</b>
                  <span className="block text-[14px] text-ink-2 tabular-nums">{fmtDate(m.date, today ?? undefined)}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <p aria-live="polite" className="mt-5 text-[14px]">
          {orderLate ? (
            <span className="font-semibold text-danger">Too late for this date. Pick a later one, or ask us what can ship from stock.</span>
          ) : samplesLate ? (
            <span className="font-semibold text-brand">Too late for samples: reorder a style you already know, or move the date.</span>
          ) : (
            shelf && <span className="text-ink-2">You have time for a sample round first.</span>
          )}
        </p>

        <button type="button" onClick={send} disabled={!shelf} className="btn btn-dark mt-6">
          Send this plan with an inquiry <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}
