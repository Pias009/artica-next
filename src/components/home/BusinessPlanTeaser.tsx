"use client";

import { deskOn } from "@/lib/content/live";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useKai } from "../assistant/kai";
import { Icon } from "../Icon";
import { VerdictTag } from "../planner/parts";
import { ArrowLink, SectionHead } from "../ui/SectionHead";
import { inSentence } from "@/lib/countries";
import { addDays, fmt, LEVELS, seasonName, timingFor, type Level } from "@/lib/planner";
import { SEASON_COOKIE } from "@/lib/season";
import { useToday } from "@/lib/useToday";

const noop = () => () => {};
const cookieCountry = () => document.cookie.match(new RegExp(`(?:^|; )${SEASON_COOKIE.country}=([A-Z]{2})`))?.[1] ?? "";

/**
 * The business planner on the home page, with the visitor's own dates: how long an order takes to reach their
 * shelf, which seasons are already out of reach, and the one to order for now. Before the browser's date and
 * country are known (prerendered page), it shows the rule without dates.
 */
export function BusinessPlanTeaser() {
  const today = useToday();
  const code = useSyncExternalStore(noop, cookieCountry, () => "");
  const show = useKai((s) => s.show);
  const t = today ? timingFor(code || "US", today, true) : null;
  const where = t?.country ? inSentence(t.country.name) : "your market";
  // the season most buyers are thinking of (the next one, usually already too late), then the ones still catchable
  const late = t?.windows.filter((w) => w.verdict === "late" && w.start >= today!).slice(0, 1) ?? [];
  const soon = [...late, ...(t?.windows.filter((w) => w.verdict !== "late" && w.start < addDays(today!, 400)) ?? [])].slice(0, 4);

  return (
    <section id="business-plan" aria-labelledby="h-plan" className="mt-sec scroll-mt-24">
      <SectionHead
        id="h-plan"
        title={
          <>
            Buy for the season <em>you can still catch.</em>
          </>
        }
        sub="Shoes take about two months to make and ship, more to reach your shelf. Summer stock ordered in May lands as summer ends. Our business planner works out the dates, the order and the numbers for you."
        right={
          <Link href="/business-plan">
            <ArrowLink>Open the business planner</ArrowLink>
          </Link>
        }
      />

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div data-deco="card" className="rounded-shell bg-tile p-[clamp(20px,3.4vw,40px)]">
          <p className="text-[14px] font-semibold text-ink-2">{t ? `Your dates for ${where}` : "Your dates"}</p>
          <p className="mt-2 font-headline text-[clamp(26px,3vw,38px)] leading-[1.1] font-semibold tracking-[-0.02em]">
            {t?.now ? (
              <>
                Order for {seasonName(t.now.season).toLowerCase()} by <span className="text-brand">{fmt.date(t.now.orderBy)}</span>.
              </>
            ) : (
              "Order by the date, not the season."
            )}
          </p>
          <p className="mt-3 max-w-[52ch] text-[15px] text-ink-2">
            {t
              ? `A first order with samples takes about ${t.leadDays} days from confirming to your shelf: ${t.lead.bulk} days production, ${t.lead.transit} at sea${t.transitEstimate ? " (estimate)" : ""}, then customs.`
              : "Production, sea transit and customs add up to 2.5–3 months from order to shelf for most markets."}
          </p>

          <ul className="mt-6 grid gap-1.5" aria-label="The next seasons">
            {(soon.length ? soon : [null, null, null, null]).map((w, i) => (
              <li key={i} className="flex min-h-12 items-center justify-between gap-3 rounded-ph bg-white px-4 py-2.5">
                {w ? (
                  <>
                    <span>
                      <span className="text-[15px] font-semibold">{seasonName(w.season)}</span>{" "}
                      <span className="text-[13px] text-muted tabular-nums">from {fmt.date(w.start)}</span>
                    </span>
                    <span className="flex items-center gap-3 text-right">
                      <span className="hidden text-[13px] text-ink-2 tabular-nums sm:inline">
                        {w.verdict === "late" ? "Order date passed" : `Order by ${fmt.date(w.orderBy)}`}
                      </span>
                      <VerdictTag v={w.verdict} />
                    </span>
                  </>
                ) : (
                  <span className="h-4 w-1/2 rounded bg-tile" />
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3.5">
          <div data-deco="card" className="rounded-shell bg-ink p-[clamp(20px,3vw,32px)] text-white">
            <p className="text-[14px] font-semibold text-white/65">Plan it with numbers</p>
            <ul className="mt-3 grid gap-2.5 text-[15px]">
              {[
                "When to order, for your country",
                "What to order, for your budget",
                "Landed cost per pair, margin, break-even",
                "The cash it needs, month by month",
              ].map((x) => (
                <li key={x} className="flex gap-2.5">
                  <Icon name="check" className="mt-1 size-4 shrink-0 text-white/70" />
                  {x}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/business-plan" className="btn bg-white text-ink hover:bg-white/90">
                Start my plan <Icon name="arrow" />
              </Link>
              {deskOn("plan") && (
                <button type="button" onClick={() => show("plan")} className="btn border border-white/25 text-white hover:border-white/60">
                  <Icon name="chat" className="size-4" /> Ask the planning desk
                </button>
              )}
            </div>
          </div>

          <nav aria-label="Plans by stage" className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {(Object.keys(LEVELS) as Level[]).map((id) => (
              <Link
                key={id}
                href={`/business-plan?level=${id}${code ? `&country=${code}` : ""}`}
                className="group rounded-card bg-tile p-4 transition-colors hover:bg-chip-hover"
              >
                <span className="flex items-center justify-between text-[15px] font-semibold">
                  {LEVELS[id].name} <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-2">{LEVELS[id].promise}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
