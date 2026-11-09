"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Card, CardHead } from "../../ui";
import { Btn, Pill } from "../marketing/bits";
import { blankIdea, IdeaSheet, type IdeaDraft } from "./Ideas";
import { CHANNEL_LABEL, IDEA_STAGE_LABEL } from "@/lib/marketing/model";
import type { MarketingIdea, SocialData } from "@/lib/marketing/store";

const WEEKS = 6;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Six weeks from this Monday: dated cards from the board, and the email campaigns, day by day. */
export function Calendar({ data, admin }: { data: SocialData; admin: string }) {
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState<IdeaDraft | null>(null);
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7 * WEEKS);
    return Array.from({ length: WEEKS * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [offset]);
  const byDay = useMemo(() => {
    const m = new Map<string, { ideas: MarketingIdea[]; mails: SocialData["campaigns"] }>();
    const slot = (k: string) => m.get(k) ?? (m.set(k, { ideas: [], mails: [] }), m.get(k)!);
    for (const i of data.ideas) if (i.due) slot(i.due).ideas.push(i);
    for (const c of data.campaigns) if (c.at) slot(ymd(new Date(c.at))).mails.push(c);
    return m;
  }, [data]);
  const todayKey = ymd(new Date());
  const undated = data.ideas.filter((i) => !i.due && (i.stage === "planned" || i.stage === "doing" || i.stage === "review"));
  const range = `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days.at(-1)!.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Btn tone="light" onClick={() => setOffset((o) => o - 1)}>
          ← Earlier
        </Btn>
        <Btn tone="light" disabled={offset === 0} onClick={() => setOffset(0)}>
          Today
        </Btn>
        <Btn tone="light" onClick={() => setOffset((o) => o + 1)}>
          Later →
        </Btn>
        <span className="text-[13.5px] font-semibold">{range}</span>
        <span className="ml-auto flex items-center gap-3 text-[12px] text-ink/55">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-ink" /> Content and campaigns
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#2d5d6f]" /> Emails
          </span>
        </span>
      </div>

      <Card i={1} className="p-3! sm:p-4!">
        <div className="overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <p key={d} className="px-2 pb-1 text-[12px] font-semibold text-ink/50">
                {d}
              </p>
            ))}
            {days.map((d) => {
              const k = ymd(d);
              const slot = byDay.get(k);
              const past = k < todayKey;
              return (
                <div key={k} className={clsx("group min-h-28 rounded-2xl p-2", k === todayKey ? "bg-white ring-2 ring-ink" : past ? "bg-white/35" : "bg-white/70")}>
                  <div className="flex items-center justify-between">
                    <span className={clsx("text-[12px] font-semibold tabular-nums", past && "text-ink/40")}>
                      {d.getDate() === 1 || k === ymd(days[0]) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : d.getDate()}
                    </span>
                    <button
                      type="button"
                      aria-label={`Plan something for ${d.toDateString()}`}
                      onClick={() => setDraft(blankIdea({ due: k, stage: "planned", kind: "content", owner: admin }))}
                      className="grid size-6 place-items-center rounded-full text-ink/45 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink/[0.06] focus:opacity-100"
                    >
                      +
                    </button>
                  </div>
                  <ul className="mt-1 grid gap-1">
                    {slot?.mails.map((c) => (
                      <li key={c.id} className="truncate rounded-lg bg-[#2d5d6f] px-2 py-1 text-[11.5px] font-semibold text-white" title={`Email: ${c.name}`}>
                        ✉ {c.name}
                      </li>
                    ))}
                    {slot?.ideas.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => setDraft({ ...i })}
                          title={`${CHANNEL_LABEL[i.channel]} · ${IDEA_STAGE_LABEL[i.stage]}`}
                          className={clsx(
                            "block w-full truncate rounded-lg px-2 py-1 text-left text-[11.5px] font-semibold",
                            i.stage === "done" ? "bg-ink/[0.07] text-ink/45 line-through" : "bg-ink text-white",
                          )}
                        >
                          {i.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card i={2}>
        <CardHead title="Planned, no date yet" sub="Give these a day so they land on the calendar" right={<Pill>{undated.length}</Pill>} />
        {undated.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {undated.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setDraft({ ...i })} className="rounded-full bg-white/80 px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-ink/10 hover:bg-white">
                  {i.title} <span className="font-normal text-ink/50">· {CHANNEL_LABEL[i.channel]}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[13.5px] text-ink/55">Everything planned has a date.</p>
        )}
      </Card>

      <IdeaSheet key={draft?.id ?? (draft ? `new-${draft.due}` : "none")} draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
