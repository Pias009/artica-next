"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ago, usePanel, useSaver } from "../panel-data";
import { RobotHead } from "../RobotHead";
import { AdminIcon, Card, CardHead, Meter, SaveBar, Toggle } from "../ui";
import { saveAssistantAction } from "@/app/admin/content-actions";
import type { SiteContent } from "@/lib/content/model";

type Switches = SiteContent["assistant"];

const JOBS: {
  id: keyof Omit<Switches, "tone">;
  title: string;
  text: string;
  try: { label: string; href: string };
}[] = [
  {
    id: "trade",
    title: "Trade help on the site",
    text: "Answers buyers about styles, MOQ, samples, shipping and terms, and prepares inquiries they send themselves.",
    try: { label: "Open the chat", href: "/assistant" },
  },
  {
    id: "plan",
    title: "Business planning desk",
    text: "Works out order-by dates, a first order for a budget, landed cost, margin and cash, for the buyer's market.",
    try: { label: "Open the planning desk", href: "/assistant?desk=plan" },
  },
  {
    id: "model",
    title: "Use the AI model",
    text: "Off: Kai answers from its built-in rules only (no tokens, English only). On: the model handles follow-ups, other languages and open questions within the daily limits.",
    try: { label: "See the limits", href: "#limits" },
  },
];

/**
 * Kai, the site's AI assistant: switch each desk and the AI model on or off (saved at once to the site), see today's
 * use against the limits, and what was done in the panel with its help.
 */
export function Agent({ onAsk }: { onAsk?: (p: string) => void }) {
  const panel = usePanel();
  const init = useMemo(() => panel.content.assistant, [panel]);
  const [saved, setSaved] = useState(init);
  const [s, setS] = useState(init);
  const saver = useSaver(saveAssistantAction, setSaved);
  const changes = JOBS.filter((j) => s[j.id] !== saved[j.id]).length;
  const today = panel.agent.today ?? { calls: 0, tokens: 0 };
  const status = !panel.ai.ready
    ? "No AI key set: Kai answers from its built-in rules"
    : s.model
      ? `AI model on (${panel.ai.provider === "gemini" ? "Google Gemini" : "AI Gateway"})`
      : "AI model switched off: built-in rules only";

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card i={0} tone="dark" className="overflow-hidden lg:col-span-12">
        <div className="relative grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
          <span
            aria-hidden="true"
            className="absolute -top-20 -left-10 size-64 rounded-full bg-[radial-gradient(circle,rgb(200_107_184/.35),transparent_65%)]"
          />
          <RobotHead className="relative mx-auto size-36 sm:size-44" />
          <div className="relative">
            <p
              className={clsx(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold text-ink",
                s.trade || s.plan ? "bg-[#7fd1a4]" : "bg-[#f2b33d]",
              )}
            >
              <span className="size-1.5 rounded-full bg-ink motion-safe:animate-pulse" /> {s.trade || s.plan ? "Live on the site" : "Switched off on the site"}
            </p>
            <h2 className="mt-3 text-[clamp(26px,3vw,38px)] leading-tight font-light tracking-[-0.02em]">Kai, the trade assistant.</h2>
            <p className="mt-2 max-w-[62ch] text-[15px] text-white/70">
              {status}. It never quotes prices or sends anything on its own: buyers send their own inquiries, and the desk sends every reply.
            </p>
          </div>
        </div>
      </Card>

      <Card i={1} className="lg:col-span-8">
        <CardHead title="What Kai does" sub="Changes apply to the site as soon as you publish them" />
        <ul className="mt-5 grid gap-2.5">
          {JOBS.map((j) => (
            <li key={j.id} className={clsx("rounded-3xl bg-white/70 p-4 transition-opacity", !s[j.id] && "opacity-65")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{j.title}</p>
                  <p className="mt-0.5 text-[13.5px] text-ink/60">{j.text}</p>
                </div>
                <Toggle label={j.title} checked={s[j.id]} onChange={(v) => setS((x) => ({ ...x, [j.id]: v }))} />
              </div>
              <a
                href={j.try.href}
                target={j.try.href.startsWith("/") ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-ink/70 hover:text-ink"
              >
                {j.try.label} <AdminIcon name="up" className="size-3.5 rotate-45" />
              </a>
            </li>
          ))}
          <li className="rounded-3xl bg-white/70 p-4">
            <p className="text-[15px] font-semibold">Reply drafts and this panel&apos;s assistant</p>
            <p className="mt-0.5 text-[13.5px] text-ink/60">
              Drafts a reply on any inquiry (Inquiries → open one → Draft with Kai) and answers questions about your figures (⌘K).
            </p>
            <button
              type="button"
              onClick={() => onAsk?.("Summarise this week's inquiries")}
              className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white"
            >
              <AdminIcon name="sparkle" className="size-4" /> Ask about this week
            </button>
          </li>
        </ul>
      </Card>

      <div className="grid content-start gap-4 lg:col-span-4">
        <Card i={2}>
          <div id="limits" className="scroll-mt-6" />
          <CardHead title="Today's AI use" sub="Kai switches to its built-in rules past any limit" />
          <div className="mt-4 grid gap-3">
            <Meter label={`Model calls (of ${panel.limits.rpd.toLocaleString("en-US")})`} value={today.calls} max={panel.limits.rpd} suffix="" />
            <Meter label={`Tokens (of ${(panel.limits.tpd / 1e6).toFixed(1)} M)`} value={today.tokens} max={panel.limits.tpd} suffix="" />
          </div>
          <p className="mt-3 text-[12px] text-ink/50">
            At most {panel.limits.rpm} calls a minute. Simple questions are answered without the model, at no cost.
          </p>
        </Card>

        <Card i={3} tone="dark">
          <CardHead dark title="Activity" sub="From the audit log" />
          {panel.agent.log.length ? (
            <ol className="mt-4 grid gap-3">
              {panel.agent.log.map((l, k) => (
                <li key={k} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-[13px]">
                  <span className="text-white/45">{ago(l.at)}</span>
                  <span className="text-white/85">
                    {l.text}
                    <span className="block text-[11.5px] text-white/40">{l.who}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-[13px] text-white/60">Nothing yet. Drafted replies and saved edits show here.</p>
          )}
        </Card>
      </div>

      <SaveBar count={changes} pending={saver.pending} error={saver.error} onDiscard={() => (setS(saved), saver.clearError())} onSave={() => saver.save(s)} />
    </div>
  );
}
