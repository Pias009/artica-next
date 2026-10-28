"use client";

import clsx from "clsx";
import { useState } from "react";
import { AGENT_LOG, AGENT_TASKS, type AgentTask } from "../data";
import { RobotHead } from "../RobotHead";
import { AdminIcon, Card, CardHead, Segmented, Toggle, useStream } from "../ui";

const MODES: { id: AgentTask["mode"]; label: string }[] = [
  { id: "suggest", label: "Suggest" },
  { id: "ask", label: "Ask first" },
  { id: "auto", label: "Auto" },
];

/** What a preview run would do, step by step. */
const PLAN: Record<string, string> = {
  reply: "1. Read 2 new inquiries\n2. Check the styles asked for: Nord, Mira Tall, Pop\n3. Work out DDP to Oslo and the sample lead time\n4. Draft 2 replies and leave them for the desk to send",
  followup: "1. Find quotes with no answer after 5 days: Snowline Retail\n2. Write a two-line follow-up with the quote attached\n3. Leave it as a suggestion",
  copy: "1. Rank pages by how fast people leave: /shipping (41%), /inquiry (57%)\n2. Suggest a shorter intro for each\n3. Leave the suggestions in Pages",
  search: "1. Collect searches with no results: vegan leather, steel toe, wide fit\n2. Suggest an FAQ answer for each\n3. Flag 'wide fit' as a possible catalog filter",
  report: "1. Count the week's inquiries, replies and wins\n2. Rank styles by interest\n3. Note where visitors dropped out\n4. Email the report to the trade desk",
};

/**
 * The AI agent: the jobs it can take on, how much it may do alone, and what it did. Under development: nothing here
 * acts on the site yet, and the page says so up front. "Preview a run" only shows what a run would do.
 */
export function Agent() {
  const [tasks, setTasks] = useState(AGENT_TASKS);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(AGENT_TASKS.map((t) => [t.id, t.id !== "copy"])));
  const [preview, setPreview] = useState<{ id: string; text: string } | null>(null);
  const [run, setRun] = useState(0);
  const { shown, busy } = useStream(preview?.text ?? null, run);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* under development */}
      <Card i={0} tone="dark" className="overflow-hidden lg:col-span-12">
        <div role="alert" className="relative grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
          <span aria-hidden="true" className="absolute -top-20 -left-10 size-64 rounded-full bg-[radial-gradient(circle,rgb(200_107_184/.35),transparent_65%)]" />
          <RobotHead className="relative mx-auto size-36 sm:size-44" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#f2b33d] px-3 py-1 text-[12px] font-bold tracking-[0.06em] text-ink uppercase">
              <span className="size-1.5 rounded-full bg-ink motion-safe:animate-pulse" /> Under development
            </p>
            <h2 className="mt-3 text-[clamp(26px,3vw,38px)] leading-tight font-light tracking-[-0.02em]">The AI agent is still being built.</h2>
            <p className="mt-2 max-w-[62ch] text-[15px] text-white/70">
              This is a preview of how it will work. It can&apos;t read, send or change anything yet, so nothing you switch on here runs. Preview a task to see the steps it will take.
            </p>
          </div>
        </div>
      </Card>

      {/* the jobs */}
      <Card i={1} className="lg:col-span-8">
        <CardHead title="What the agent does" sub="Switch a job on and choose how far it may go on its own" />
        <ul className="mt-5 grid gap-2.5">
          {tasks.map((t) => (
            <li key={t.id} className={clsx("rounded-3xl bg-white/70 p-4 transition-opacity", !on[t.id] && "opacity-60")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{t.title}</p>
                  <p className="mt-0.5 text-[13.5px] text-ink/60">{t.text}</p>
                </div>
                <Toggle label={t.title} checked={on[t.id]} onChange={(v) => setOn((o) => ({ ...o, [t.id]: v }))} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Segmented label={`How far "${t.title}" may go`} value={t.mode} onChange={(mode) => setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, mode } : x)))} options={MODES} />
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] text-ink/50 tabular-nums">{t.runs} preview runs</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPreview({ id: t.id, text: PLAN[t.id] });
                      setRun((r) => r + 1);
                    }}
                    className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
                  >
                    <AdminIcon name="sparkle" className="size-4" /> Preview a run
                  </button>
                </div>
              </div>
              {preview?.id === t.id && (
                <pre aria-live="polite" className="mt-3 rounded-2xl bg-ink p-4 font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap text-white/85 motion-safe:animate-[admin-in_.35s_both]">
                  {shown || "Planning…"}
                  {busy && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-white/70 motion-safe:animate-pulse" />}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid content-start gap-4 lg:col-span-4">
        <Card i={2}>
          <CardHead title="How it decides" />
          <dl className="mt-4 grid gap-3 text-[13.5px]">
            {MODES.map((m) => (
              <div key={m.id} className="flex gap-3">
                <dt className="w-20 flex-none font-semibold">{m.label}</dt>
                <dd className="text-ink/60">
                  {m.id === "suggest" ? "Leaves an idea for you; changes nothing." : m.id === "ask" ? "Prepares the work; you approve before it's sent or published." : "Acts on its own and tells you after."}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card i={3} tone="dark">
          <CardHead dark title="Preview log" sub="What it would have done today" />
          <ol className="mt-4 grid gap-3">
            {AGENT_LOG.map((l, k) => (
              <li key={k} className="flex gap-3 text-[13px]">
                <span className="w-11 flex-none text-white/45 tabular-nums">{l.at}</span>
                <span className="text-white/85">{l.text}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
