"use client";

import clsx from "clsx";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ago } from "../panel-data";
import { AdminIcon, Card, CardHead, flash, Shimmer, useStream } from "../ui";
import { Orb, type OrbState } from "./vela/Orb";
import { STATUS, TeamGlyph, TeamSheet, TeamsChart } from "./vela/Teams";
import { chime, hush, speak } from "./vela/voice";
import { velaAskAction, velaInsightsAction, velaTeamAction } from "@/app/admin/vela-actions";
import type { VelaInsights } from "@/lib/vela/insights";
import { AGENT, DEPARTMENTS, parseTeamToggle, routeQuestion, TEAMS, TEAM_BY_ID, type TeamId } from "@/lib/vela/teams";

/*
 * Vela's HQ: the admin's AI chief of staff, alive in the panel. She greets the admin, briefs them from her 11 teams'
 * live figures (refreshed every 45 seconds), answers questions from the right team's point of view, reads her replies
 * aloud if the admin wants, and switches teams on or off when told ("pause the seasons team"). Everything she says
 * comes from lib/vela (server actions in app/admin/vela-actions.ts).
 */

type Msg = { id: string; from: "vela" | "you"; text: string; at: number; team?: TeamId; live?: string; model?: string };

const REFRESH_MS = 45_000;
const VOICE_KEY = "vela-voice";
const QUICK = [
  { label: "Today's briefing", prompt: "Give me today's briefing: what changed and what needs my attention first?" },
  { label: "Who needs a reply?", prompt: "Which inquiries need a reply or a follow-up right now?" },
  { label: "Any bugs?", prompt: "Are there any bugs, errors or slow pages on the website?" },
  { label: "Grow inquiries", prompt: "Across all teams, what are the three best things to do this week to get more inquiries?" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const partOfDay = () => {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
};

/** A briefing straight from the teams' findings, for "Brief me" (no model call). */
function briefing(i: VelaInsights, paused: TeamId[]) {
  const live = TEAMS.filter((t) => !paused.includes(t.id));
  if (!live.length) return "Every team is switched off. Turn a team on and I'll brief you.";
  const att = live.filter((t) => i.teams[t.id].status === "attention");
  const lead = att.length ? `${att.length} of ${live.length} active teams need you.` : `All ${live.length} active teams are on track.`;
  const items = att.slice(0, 3).map((t) => `- **${t.short}:** ${i.teams[t.id].headline}.`);
  return `Here's today's briefing. ${lead}${items.length ? `\n\n${items.join("\n")}` : ""}\n\nWhat would you like to look at first?`;
}

/** Replies use **bold** and "- " bullets; render those, as text (never HTML). */
function rich(text: string): ReactNode {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, k) => (p.startsWith("**") && p.endsWith("**") ? <strong key={k}>{p.slice(2, -2)}</strong> : <Fragment key={k}>{p}</Fragment>));
  const blocks = text.split(/\n{2,}/);
  return blocks.map((b, i) => {
    const lines = b.split("\n");
    if (lines.every((l) => /^\s*([-•*]|\d+\.)\s+/.test(l)))
      return (
        <ul key={i} className="my-1.5 grid list-disc gap-1 pl-5">
          {lines.map((l, k) => (
            <li key={k}>{inline(l.replace(/^\s*([-•*]|\d+\.)\s+/, ""))}</li>
          ))}
        </ul>
      );
    return (
      <p key={i} className="my-1.5 first:mt-0 last:mb-0">
        {lines.map((l, k) => (
          <Fragment key={k}>
            {k > 0 && <br />}
            {inline(l)}
          </Fragment>
        ))}
      </p>
    );
  });
}

function Typed({ text, onDone }: { text: string; onDone: () => void }) {
  const { shown, busy } = useStream(text, 0, onDone);
  return <>{rich(busy || shown ? shown : "")}</>;
}

export function Vela({ initial, admin }: { initial: { insights: VelaInsights; paused: TeamId[] }; admin: string }) {
  const [insights, setInsights] = useState(initial.insights);
  const [paused, setPaused] = useState(initial.paused);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typed, setTyped] = useState<Set<string>>(() => new Set());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<TeamId | null>(null);
  const [open, setOpen] = useState<TeamId | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [voice, setVoiceState] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.parse(initial.insights.generatedAt));
  const stage = useRef<"greeting" | "open">("greeting");
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const say = useCallback((text: string, extra: Partial<Msg> = {}) => setMsgs((m) => [...m, { id: uid(), from: "vela", text, at: Date.now(), ...extra }]), []);

  // greet once, on the admin's own clock; and pick up their voice choice
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem(VOICE_KEY) === "off") setVoiceState(false);
      } catch {}
      setNow(Date.now());
      const live = TEAMS.filter((t) => !initial.paused.includes(t.id));
      const att = live.filter((t) => initial.insights.teams[t.id].status === "attention").length;
      say(
        `Good ${partOfDay()}, ${admin}. ${live.length} of ${TEAMS.length} teams are on duty${att ? `, and ${att} ${att === 1 ? "has something" : "have things"} for you` : " and everything is on track"}. How are you doing today?`,
      );
    });
    return () => cancelAnimationFrame(id);
  }, [admin, initial, say]);

  // keep the newest line in view as the transcript grows or types out
  useEffect(() => {
    const b = box.current;
    const l = list.current;
    if (!b || !l) return;
    const ro = new ResizeObserver(() => b.scrollTo({ top: b.scrollHeight, behavior: "smooth" }));
    ro.observe(l);
    return () => ro.disconnect();
  }, []);

  // live figures: every 45 s while the tab is in view
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await velaInsightsAction();
      setInsights(r.insights);
      setPaused(r.paused);
    } catch {
      // the next round tries again
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && void refresh(), REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => (clearInterval(t), clearInterval(tick));
  }, [refresh]);

  useEffect(() => () => hush(), []);

  const setVoice = (on: boolean) => {
    setVoiceState(on);
    if (!on) {
      hush();
      setSpeaking(false);
    }
    try {
      localStorage.setItem(VOICE_KEY, on ? "on" : "off");
    } catch {}
  };

  const voiceOut = (text: string) => {
    if (!voice) return;
    chime();
    speak(text, { start: () => setSpeaking(true), end: () => setSpeaking(false) });
  };

  const switchTeams = async (team: TeamId | "all", active: boolean, quiet = false) => {
    setToggling(team);
    const r = await velaTeamAction(team, active).catch(() => ({ ok: false as const, error: "Couldn't reach the server." }));
    setToggling(null);
    if (!r.ok) {
      flash(r.error);
      return null;
    }
    setPaused(r.paused);
    if (!quiet) flash(`${team === "all" ? "All teams" : TEAM_BY_ID[team].name} ${active ? "on duty" : "switched off"}`);
    return r.paused;
  };

  const ask = async (raw: string, team?: TeamId) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    setOpen(null);
    hush();
    setMsgs((m) => [...m, { id: uid(), from: "you", text, at: Date.now() }]);

    // "pause the marketing team", "wake all teams": done here, no model needed
    const toggle = parseTeamToggle(text);
    if (toggle) {
      stage.current = "open";
      const names = toggle.teams === "all" ? "every team" : toggle.teams.map((id) => `the ${TEAM_BY_ID[id].name} team`).join(" and ");
      let ok = true;
      for (const id of toggle.teams === "all" ? (["all"] as const) : toggle.teams) ok = !!(await switchTeams(id, toggle.active, true)) && ok;
      const reply = ok ? `Done. I've ${toggle.active ? "put" : "switched off"} ${names}${toggle.active ? " back on duty" : ""}.` : "I couldn't save that switch. Try again in a moment.";
      say(reply);
      voiceOut(reply);
      return;
    }

    const routed = team ?? routeQuestion(text);
    setWorking(paused.includes(routed) ? null : routed);
    setBusy(true);
    const greeting = stage.current === "greeting";
    stage.current = "open";
    const history = msgs.slice(-6).map((m) => ({ role: m.from === "you" ? ("user" as const) : ("assistant" as const), content: m.text }));
    try {
      const r = await velaAskAction({ message: text, history, team, greeting });
      if (r.ok) {
        say(r.text, { team: r.team, live: r.live, model: r.model });
        voiceOut(r.text);
      } else say(r.error);
    } catch {
      say("I couldn't reach the server. Check your connection and ask me again.");
    } finally {
      setBusy(false);
      setWorking(null);
      field.current?.focus();
    }
  };

  const briefMe = () => {
    stage.current = "open";
    const text = briefing(insights, paused);
    say(text);
    voiceOut(text);
  };

  const orb: OrbState = busy ? "thinking" : speaking ? "speaking" : "idle";
  const live = TEAMS.filter((t) => !paused.includes(t.id));
  const queue = live.filter((t) => insights.teams[t.id].status === "attention");
  const o = insights.overview;
  const lastVela = [...msgs].reverse().find((m) => m.from === "vela");
  const figures = [
    { label: "Inquiries · 30 d", value: o.inquiries30.toLocaleString("en-US") },
    { label: "Waiting", value: String(o.waiting), warn: o.waiting > 0 },
    { label: "Overdue", value: String(o.overdue), bad: o.overdue > 0 },
    { label: "Median reply", value: o.medianReplyHours != null ? `${o.medianReplyHours.toFixed(1)} h` : "—" },
    { label: "Win rate · 90 d", value: o.winRate90 ?? "—" },
    { label: "Visits · 7 d", value: o.visits7.toLocaleString("en-US") },
    { label: "JS errors · 7 d", value: String(o.jsErrors7), bad: o.jsErrors7 > 0 },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Vela herself */}
      <Card i={0} tone="dark" className="overflow-hidden lg:col-span-12">
        <span aria-hidden="true" className="absolute -top-24 -left-16 size-80 rounded-full bg-[radial-gradient(circle,rgb(125_92_255/.35),transparent_65%)]" />
        <span aria-hidden="true" className="absolute -right-10 -bottom-24 size-72 rounded-full bg-[radial-gradient(circle,rgb(111_214_200/.22),transparent_65%)]" />
        <div className="relative grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
          <Orb state={orb} className="mx-auto size-40 sm:size-48" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#7fd1a4] px-3 py-1 text-[13px] font-semibold text-ink">
                <span className="size-1.5 rounded-full bg-ink motion-safe:animate-pulse" />
                {busy ? `${working ? TEAM_BY_ID[working].short : "Vela"} is working…` : speaking ? "Speaking" : "Online"}
              </p>
              <p className="text-[12.5px] text-white/55" suppressHydrationWarning>
                {refreshing ? "Refreshing live data…" : `Live data · updated ${ago(insights.generatedAt, now).toLowerCase()}`}
              </p>
            </div>
            <h2 className="mt-3 text-[clamp(26px,3vw,40px)] leading-tight font-light tracking-[-0.02em]">
              {AGENT.name}, your {AGENT.title.toLowerCase()}.
            </h2>
            <p className="mt-2 max-w-[68ch] text-[15px] text-white/70">
              {live.length} of {TEAMS.length} teams on duty across {DEPARTMENTS.length} departments
              {queue.length ? `; ${queue.length} need${queue.length === 1 ? "s" : ""} your attention.` : ", all on track."} She reads the site&apos;s live data, never changes
              anything on her own, and tells you what to do next.
            </p>
            <dl className="mt-5 flex flex-wrap gap-2">
              {figures.map((f) => (
                <div key={f.label} className="rounded-2xl bg-white/[0.08] px-3.5 py-2 ring-1 ring-white/10">
                  <dt className="text-[11px] text-white/50">{f.label}</dt>
                  <dd className={clsx("text-[17px] font-semibold tabular-nums", f.bad ? "text-[#ff9b8f]" : f.warn ? "text-[#f2c56b]" : "text-white")}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      {/* the conversation */}
      <Card i={1} className="flex flex-col lg:col-span-7">
        <CardHead
          title={`Talk to ${AGENT.name}`}
          sub="Questions go to the right team; say “pause the seasons team” to switch one off"
          right={
            <button
              type="button"
              aria-pressed={voice}
              onClick={() => setVoice(!voice)}
              className={clsx(
                "inline-flex min-h-9 flex-none items-center gap-2 rounded-full px-3 text-[12.5px] font-semibold transition-colors",
                voice ? "bg-ink text-white" : "bg-ink/[0.06] text-ink/60 hover:text-ink",
              )}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">
                <path d={voice ? "M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6M19 6.5a8 8 0 010 11" : "M4 10v4h4l5 4V6L8 10zM17 9l5 5M22 9l-5 5"} />
              </svg>
              {voice ? "Voice on" : "Voice off"}
            </button>
          }
        />
        <div ref={box} className="mt-4 h-[min(52vh,460px)] overflow-y-auto overscroll-contain rounded-3xl bg-white/60 p-4 ring-1 ring-white" aria-live="polite">
          <div ref={list} className="grid gap-3">
            {msgs.map((m) =>
              m.from === "you" ? (
                <div key={m.id} className="ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-[14px] text-white">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="mr-auto max-w-[92%]">
                  <div className="rounded-3xl rounded-bl-lg bg-white px-4 py-3 text-[14px] leading-relaxed shadow-[0_1px_2px_rgb(18_20_22/.06)] ring-1 ring-ink/5">
                    {m === lastVela && !typed.has(m.id) ? <Typed text={m.text} onDone={() => setTyped((s) => new Set(s).add(m.id))} /> : rich(m.text)}
                  </div>
                  {(m.team || m.live) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-[11.5px] text-ink/45">
                      {m.team && (
                        <span className="inline-flex items-center gap-1 font-semibold text-ink/60">
                          <TeamGlyph id={m.team} className="size-3.5" /> {TEAM_BY_ID[m.team].name}
                        </span>
                      )}
                      {m.model && <span>· {m.model}</span>}
                      {m.live && <span className="basis-full">{m.live}</span>}
                    </p>
                  )}
                </div>
              ),
            )}
            {busy && (
              <div className="mr-auto w-[70%] rounded-3xl rounded-bl-lg bg-white px-4 py-3.5 ring-1 ring-ink/5">
                <Shimmer className="w-3/4" />
                <Shimmer className="mt-2 w-1/2" />
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={briefMe} disabled={busy} className="min-h-9 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
            Brief me
          </button>
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={busy}
              onClick={() => ask(q.prompt)}
              className="min-h-9 rounded-full bg-white/80 px-3.5 text-[12.5px] font-semibold text-ink/70 ring-1 ring-ink/10 transition-colors hover:bg-white hover:text-ink disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex items-end gap-2 rounded-[22px] bg-white/85 p-1.5 pl-4 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <label htmlFor="vela-ask" className="sr-only">
            Ask {AGENT.name}
          </label>
          <textarea
            id="vela-ask"
            ref={field}
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder={`Ask ${AGENT.name} about inquiries, styles, markets, speed…`}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[14.5px] outline-none placeholder:text-ink/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid size-10 flex-none place-items-center rounded-full bg-ink text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            <AdminIcon name="send" className="size-4.5" />
          </button>
        </form>
      </Card>

      {/* what needs the admin */}
      <div className="grid content-start gap-4 lg:col-span-5">
        <Card i={2} tone="dark">
          <CardHead dark title="Priority queue" sub="Active teams that need you, most urgent department first" />
          {queue.length ? (
            <ol className="mt-4 grid gap-2">
              {queue.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setOpen(t.id)} className="flex w-full items-start gap-3 rounded-2xl bg-white/[0.07] p-3 text-left transition-colors hover:bg-white/[0.13]">
                    <span className="grid size-9 flex-none place-items-center rounded-xl bg-white/10">
                      <TeamGlyph id={t.id} className="size-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-[#f2c56b]">
                        {t.code} · {t.short}
                      </span>
                      <span className="block text-[13.5px] leading-snug text-white/85">{insights.teams[t.id].headline}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl bg-white/[0.07] p-4 text-[13.5px] text-white/75">Nothing urgent. Every active team is on track or still gathering data.</p>
          )}
        </Card>

        <Card i={3}>
          <CardHead
            title="Roster"
            sub={`${live.length} on duty · ${paused.length} off`}
            right={
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={!paused.length || !!toggling}
                  onClick={() => switchTeams("all", true)}
                  className="min-h-9 rounded-full bg-ink px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                >
                  All on
                </button>
                <button
                  type="button"
                  disabled={paused.length === TEAMS.length || !!toggling}
                  onClick={() => switchTeams("all", false)}
                  className="min-h-9 rounded-full bg-ink/[0.06] px-3 text-[12px] font-semibold text-ink/70 disabled:opacity-40"
                >
                  All off
                </button>
              </div>
            }
          />
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
            {TEAMS.map((t) => {
              const off = paused.includes(t.id);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => setOpen(t.id)} className={clsx("flex w-full items-center gap-2 text-left", off && "opacity-50")}>
                    <span className={clsx("size-1.5 flex-none rounded-full", off ? "bg-ink/25" : STATUS[insights.teams[t.id].status].dot)} />
                    <span className="truncate">{t.short}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {insights.notConnected.length > 0 && (
            <div className="mt-4 rounded-2xl bg-ink/[0.04] p-3">
              <p className="text-[12px] font-semibold text-ink/60">Not connected yet</p>
              <ul className="mt-1 grid gap-0.5 text-[12.5px] text-ink/55">
                {insights.notConnected.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* the teams */}
      <Card i={4} className="lg:col-span-12">
        <CardHead
          title="Teams"
          sub="Open a team for its full report, crew and questions"
          right={
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="min-h-9 flex-none rounded-full bg-ink/[0.06] px-3.5 text-[12.5px] font-semibold text-ink/70 hover:text-ink disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          }
        />
        <div className="mt-5">
          <TeamsChart insights={insights} paused={paused} working={working} toggling={toggling} onOpen={setOpen} onToggle={(id, v) => void switchTeams(id, v)} />
        </div>
      </Card>

      <TeamSheet id={open} insights={insights} paused={paused} onClose={() => setOpen(null)} onAsk={(q, t) => void ask(q, t)} onToggle={(id, v) => void switchTeams(id, v)} />
    </div>
  );
}
