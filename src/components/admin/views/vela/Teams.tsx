"use client";

import clsx from "clsx";
import { Sheet, Toggle } from "../../ui";
import type { TeamInsight, Tone, VelaInsights } from "@/lib/vela/insights";
import { DEPARTMENTS, TEAMS, TEAM_BY_ID, type TeamId } from "@/lib/vela/teams";

/* Vela's teams: the org chart by department, a team's card, and its full report in a side sheet. */

const GLYPHS: Record<TeamId, string> = {
  marketing: "M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a3 3 0 010 6M18 6a7 7 0 010 12",
  conversion: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
  markets: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  trending: "M3 17l6-6 4 4 8-8M15 7h6v6",
  catalogue: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  showcase: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  seasons: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 100-10 5 5 0 000 10z",
  web: "M3 5h18v11H3zM8 20h8M12 16v4",
  desk: "M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5",
  care: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  engineering: "M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14",
};

export function TeamGlyph({ id, className }: { id: TeamId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx("fill-none stroke-current stroke-[1.7]", className ?? "size-5")} strokeLinecap="round" strokeLinejoin="round">
      <path d={GLYPHS[id]} />
    </svg>
  );
}

export const STATUS: Record<TeamInsight["status"], { label: string; dot: string }> = {
  ok: { label: "On track", dot: "bg-[#2f8f5b]" },
  attention: { label: "Needs you", dot: "bg-[#e09a1a]" },
  limited: { label: "Limited data", dot: "bg-ink/30" },
};

const TONE: Record<Tone, string> = {
  good: "text-[#2f8f5b]",
  warn: "text-[#b7790f]",
  bad: "text-danger",
  muted: "text-ink/45",
};

function StatusPill({ status, off, working }: { status: TeamInsight["status"]; off?: boolean; working?: boolean }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink/60">
      <span className={clsx("size-1.5 rounded-full", off ? "bg-ink/25" : working ? "bg-[#9a6bff] motion-safe:animate-pulse" : s.dot)} />
      {off ? "Switched off" : working ? "Working on it…" : s.label}
    </span>
  );
}

export function TeamsChart({
  insights,
  paused,
  working,
  toggling,
  onOpen,
  onToggle,
}: {
  insights: VelaInsights;
  paused: TeamId[];
  working: TeamId | null;
  toggling: string | null;
  onOpen: (id: TeamId) => void;
  onToggle: (id: TeamId | "all", active: boolean) => void;
}) {
  return (
    <div className="grid gap-6">
      {DEPARTMENTS.map((dept) => (
        <div key={dept.id}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h3 className="text-[13px] font-semibold tracking-[0.12em] text-ink/70 uppercase">{dept.name}</h3>
            <p className="text-[12.5px] text-ink/50">{dept.purpose}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TEAMS.filter((t) => t.department === dept.id).map((t) => {
              const ins = insights.teams[t.id];
              const off = paused.includes(t.id);
              const busy = working === t.id;
              return (
                <article
                  key={t.id}
                  className={clsx(
                    "flex flex-col rounded-3xl bg-white/70 p-4 ring-1 transition-[opacity,box-shadow] duration-300",
                    off ? "opacity-55 ring-ink/5" : ins.status === "attention" ? "ring-[#e09a1a]/35" : "ring-white",
                    busy && "ring-[#9a6bff]/60 motion-safe:animate-[vela-working_1.4s_ease-in-out_infinite]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={clsx("grid size-10 flex-none place-items-center rounded-2xl", off ? "bg-ink/5 text-ink/40" : "bg-ink text-white")}>
                      <TeamGlyph id={t.id} className="size-[18px]" />
                    </span>
                    <Toggle label={`${t.name} team`} checked={!off} onChange={(v) => toggling !== t.id && onToggle(t.id, v)} />
                  </div>
                  <button type="button" onClick={() => onOpen(t.id)} className="mt-3 text-left">
                    <span className="text-[11px] font-semibold tracking-[0.1em] text-ink/40">{t.code}</span>
                    <span className="mt-0.5 block text-[15px] leading-snug font-semibold">{t.name}</span>
                    <span className="mt-1.5 block text-[13px] leading-snug text-ink/65">{off ? "Not working while switched off." : ins.headline}</span>
                  </button>
                  {!off && ins.metrics.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      {ins.metrics.slice(0, 2).map((m) => (
                        <div key={m.label} className="rounded-2xl bg-ink/[0.04] px-3 py-2">
                          <dt className="truncate text-[11px] text-ink/50">{m.label}</dt>
                          <dd className={clsx("truncate text-[15px] font-semibold tabular-nums", m.tone && TONE[m.tone])}>{m.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <StatusPill status={ins.status} off={off} working={busy} />
                    <button type="button" onClick={() => onOpen(t.id)} className="min-h-9 rounded-full px-2 text-[12.5px] font-semibold text-ink/60 hover:text-ink">
                      Report →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamSheet({
  id,
  insights,
  paused,
  onClose,
  onAsk,
  onToggle,
}: {
  id: TeamId | null;
  insights: VelaInsights;
  paused: TeamId[];
  onClose: () => void;
  onAsk: (q: string, team: TeamId) => void;
  onToggle: (id: TeamId, active: boolean) => void;
}) {
  const t = id ? TEAM_BY_ID[id] : null;
  const ins = id ? insights.teams[id] : null;
  const off = !!id && paused.includes(id);
  return (
    <Sheet open={!!id} onClose={onClose} title={t ? `${t.code} · ${t.name}` : "Team"}>
      {t && ins && (
        <div className="grid gap-5">
          <div className="flex items-start gap-3">
            <span className="grid size-12 flex-none place-items-center rounded-2xl bg-ink text-white">
              <TeamGlyph id={t.id} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-ink/65">{t.mission}</p>
              <div className="mt-2 flex items-center gap-3">
                <StatusPill status={ins.status} off={off} />
                <Toggle label={`${t.name} team`} checked={!off} onChange={(v) => onToggle(t.id, v)} />
              </div>
            </div>
          </div>

          {!off && (
            <>
              <p className="rounded-3xl bg-ink px-4 py-3 text-[15px] font-semibold text-white">{ins.headline}</p>
              {ins.metrics.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[12px] font-semibold tracking-[0.1em] text-ink/50 uppercase">Live figures</h3>
                  <dl className="grid grid-cols-2 gap-2">
                    {ins.metrics.map((m) => (
                      <div key={m.label} className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-ink/5">
                        <dt className="text-[11.5px] text-ink/50">{m.label}</dt>
                        <dd className={clsx("text-[17px] font-semibold tabular-nums", m.tone && TONE[m.tone])}>{m.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              <section>
                <h3 className="mb-2 text-[12px] font-semibold tracking-[0.1em] text-ink/50 uppercase">What the team found</h3>
                <ul className="grid gap-2">
                  {ins.findings.map((f, i) => (
                    <li key={i} className="rounded-2xl bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed ring-1 ring-ink/5">
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <section>
            <h3 className="mb-2 text-[12px] font-semibold tracking-[0.1em] text-ink/50 uppercase">The crew</h3>
            <ul className="grid gap-1.5">
              {t.members.map((m) => (
                <li key={m.role} className="flex items-center gap-3 text-[13.5px]">
                  <span className="grid size-8 flex-none place-items-center rounded-full bg-ink/[0.07] text-[11px] font-bold text-ink/70">
                    {m.role
                      .split(/[\s-]+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span>
                    <b className="font-semibold">{m.role}</b> <span className="text-ink/55">· {m.does}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-[12px] font-semibold tracking-[0.1em] text-ink/50 uppercase">Ask this team</h3>
            <div className="grid gap-2">
              {t.questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={off}
                  onClick={() => onAsk(q, t.id)}
                  className="rounded-2xl bg-ink/[0.05] px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors hover:bg-ink hover:text-white disabled:opacity-50 disabled:hover:bg-ink/[0.05] disabled:hover:text-ink"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </Sheet>
  );
}
