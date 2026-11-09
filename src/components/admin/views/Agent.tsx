"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ago, useAsk, usePanel, useSaver } from "../panel-data";
import { RobotHead } from "../RobotHead";
import { AdminIcon, Card, CardHead, Meter, PinBars, SaveBar, Segmented, Toggle } from "../ui";
import { saveAssistantAction } from "@/app/admin/content-actions";
import { suggestions, type Suggestion } from "@/lib/admin/agent-suggestions";
import { hasPrice } from "@/lib/admin/prices";
import type { SiteContent, Tone } from "@/lib/content/model";

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

const TONES: { id: Tone; label: string; sample: string }[] = [
  { id: "plain", label: "Plain", sample: "MOQ is 25 cases (300 pairs) per style. Samples ship in about 7 days." },
  { id: "warm", label: "Warm", sample: "Happy to help! Each style starts at 25 cases (300 pairs), and samples reach you in about a week." },
  { id: "formal", label: "Formal", sample: "Thank you for your interest. The minimum order is 25 cases (300 pairs) per style; samples ship within seven days." },
];

const TONE_STYLE: Record<Suggestion["tone"], { chip: string; label: string }> = {
  now: { chip: "bg-danger text-white", label: "Do now" },
  idea: { chip: "bg-ink/[0.07] text-ink/70", label: "Idea" },
  good: { chip: "bg-[#7fd1a4] text-ink", label: "All clear" },
};

const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)} k` : String(n));
const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short" });

/**
 * Kai, the site's AI assistant: what to do next (worked out from the panel's figures), each desk, the AI model and
 * Kai's voice (saved to the site when published), what buyers ask it (topics only, never what they typed), its AI use
 * against the limits, and what was done in the panel with its help.
 */
export function Agent() {
  const panel = usePanel();
  const onAsk = useAsk();
  const init = useMemo(() => panel.content.assistant, [panel]);
  const [saved, setSaved] = useState(init);
  const [s, setS] = useState(init);
  const saver = useSaver(saveAssistantAction, setSaved);
  const changes = JOBS.filter((j) => s[j.id] !== saved[j.id]).length + Number(s.tone !== saved.tone);
  const today = panel.agent.today ?? { calls: 0, tokens: 0 };
  const asks = panel.agent.asks;
  const status = !panel.ai.ready
    ? "No AI key set: Kai answers from its built-in rules"
    : s.model
      ? `AI model on (${panel.ai.provider === "gemini" ? "Google Gemini" : "AI Gateway"})`
      : "AI model switched off: built-in rules only";

  const todo = useMemo(() => {
    const live = panel.products.filter((p) => panel.content.products[p.id]?.live !== false);
    const src = Object.fromEntries(asks.sources.map((x) => [x.id, x.n]));
    return suggestions({
      overdue: panel.inquiryStats?.overdue ?? 0,
      contactWaiting: panel.inquiries.filter((i) => i.intent === "contact" && i.status === "new").length,
      emailsStuck: panel.inquiryStats?.emailsStuck ?? 0,
      desks: saved,
      aiReady: panel.ai.ready,
      usage: { calls: panel.agent.today?.calls ?? 0, tokens: panel.agent.today?.tokens ?? 0, rpd: panel.limits.rpd, tpd: panel.limits.tpd },
      topics: asks.topics,
      sources: { rules: src.rules ?? 0, model: src.model ?? 0, limited: src.limited ?? 0, closed: src.closed ?? 0 },
      emptySearches: (panel.visitors?.searches ?? []).filter((x) => !x.found).map((x) => ({ q: x.q, n: x.n })),
      unpriced: live.filter((p) => !hasPrice(panel.content.prices?.[p.id])).length,
      live: live.length,
      rising: live.filter((p) => panel.styleStats?.[p.id]?.flags.includes("rising")).map((p) => panel.content.products[p.id]?.name ?? p.name),
    });
  }, [panel, saved, asks]);

  const answered = asks.sources.filter((x) => x.id === "rules" || x.id === "model").reduce((a, x) => a + x.n, 0);
  const byModel = asks.sources.find((x) => x.id === "model")?.n ?? 0;
  const turnedAway = asks.sources.filter((x) => x.id === "limited" || x.id === "closed").reduce((a, x) => a + x.n, 0);
  const topMax = Math.max(1, ...asks.topics.map((t) => t.n));

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
            <dl className="mt-5 grid max-w-[560px] grid-cols-3 gap-2">
              {[
                ["Chats this week", asks.chats],
                ["Messages", asks.messages],
                ["Answered by the model", answered ? `${Math.round((byModel / answered) * 100)}%` : "–"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/[0.07] px-3 py-2.5">
                  <dt className="text-[11.5px] text-white/50">{k}</dt>
                  <dd className="mt-0.5 text-[20px] font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      {/* what to do next, from the panel's own figures */}
      <Card i={1} className="lg:col-span-12">
        <CardHead
          title="Kai's suggestions"
          sub="What to do next, worked out from your inquiries, visitors and what buyers ask Kai"
          right={
            <button
              id="ask"
              type="button"
              onClick={() =>
                onAsk("Looking at this week's inquiries, visitors and what buyers asked Kai: what are the three most useful things I should do this week, and why?")
              }
              className="inline-flex min-h-10 scroll-mt-6 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
            >
              <AdminIcon name="sparkle" className="size-4" /> Plan my week with Kai
            </button>
          }
        />
        <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
          {todo.map((t) => (
            <li key={t.id} className={clsx("flex min-w-0 flex-col rounded-3xl bg-white/70 p-4", todo.length === 1 && "md:col-span-2")}>
              <div className="flex items-start gap-3">
                <span className={clsx("mt-0.5 flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold", TONE_STYLE[t.tone].chip)}>{TONE_STYLE[t.tone].label}</span>
                <div className="min-w-0">
                  <p className="text-[14.5px] leading-snug font-semibold [overflow-wrap:anywhere]">{t.title}</p>
                  <p className="mt-1 text-[13px] text-ink/60">{t.why}</p>
                </div>
              </div>
              <a href={t.action.href} className="mt-3 ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold ring-1 ring-ink/10 hover:ring-ink/30">
                {t.action.label} <AdminIcon name="up" className="size-3.5 rotate-90" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card i={2} className="lg:col-span-8">
        <div id="jobs" className="scroll-mt-6" />
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Kai&apos;s voice</p>
                <p className="mt-0.5 text-[13.5px] text-ink/60">How it writes to buyers, in both desks.</p>
              </div>
              <div className="rounded-full bg-white">
                <Segmented label="Kai's voice" value={s.tone} onChange={(v) => setS((x) => ({ ...x, tone: v }))} options={TONES.map(({ id, label }) => ({ id, label }))} />
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-ink/[0.04] px-3.5 py-2.5 text-[13px] text-ink/70 italic">&ldquo;{TONES.find((t) => t.id === s.tone)?.sample}&rdquo;</p>
          </li>
          <li className="rounded-3xl bg-white/70 p-4">
            <p className="text-[15px] font-semibold">Reply drafts and this panel&apos;s assistant</p>
            <p className="mt-0.5 text-[13.5px] text-ink/60">
              Drafts a reply on any inquiry (Inquiries → open one → Draft with Kai) and answers questions about your figures (⌘K).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Summarise this week's inquiries", "Which styles should I feature next month?", "Which markets are growing?"].map((q) => (
                <button key={q} type="button" onClick={() => onAsk(q)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white">
                  <AdminIcon name="sparkle" className="size-4" /> {q}
                </button>
              ))}
            </div>
          </li>
        </ul>
      </Card>

      <div className="grid content-start gap-4 lg:col-span-4">
        <Card i={3}>
          <div id="limits" className="scroll-mt-6" />
          <CardHead title="Today's AI use" sub="Kai switches to its built-in rules past any limit" />
          <div className="mt-4 grid gap-3">
            <Meter label={`Model calls (of ${panel.limits.rpd.toLocaleString("en-US")})`} value={today.calls} max={panel.limits.rpd} suffix="" />
            <Meter label={`Tokens (of ${(panel.limits.tpd / 1e6).toFixed(1)} M)`} value={today.tokens} max={panel.limits.tpd} suffix="" />
          </div>
          <p className="mt-5 text-[12.5px] font-semibold text-ink/70">Model calls, last 7 days</p>
          <div className="mt-2 h-36">
            <PinBars data={panel.agent.week.map((d) => ({ day: weekday(d.day), n: d.calls }))} />
          </div>
          <p className="mt-2 text-[12px] text-ink/50">
            {short(panel.agent.week.reduce((a, d) => a + d.tokens, 0))} tokens this week. At most {panel.limits.rpm} calls a minute; simple questions are answered without the model, at no cost.
          </p>
        </Card>

        <Card i={4} tone="dark">
          <CardHead dark title="Activity" sub="From the audit log" />
          {panel.agent.log.length ? (
            <ol className="mt-4 grid gap-3">
              {panel.agent.log.map((l, k) => (
                <li key={k} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-[13px]">
                  <span className="text-white/45">{ago(l.at)}</span>
                  <span className="min-w-0 text-white/85 [overflow-wrap:anywhere]">
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

      {/* what buyers ask: topics only, counted per day; what they typed is never kept */}
      <Card i={5} className="lg:col-span-12">
        <CardHead
          title="What buyers ask Kai"
          sub="Last 7 days, by topic. Only the topic is counted; what buyers type is never kept."
          right={turnedAway ? <span className="text-[12.5px] font-semibold text-danger">{turnedAway} turned away</span> : undefined}
        />
        {asks.topics.length ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ul className="grid gap-2.5">
              {asks.topics.map((t) => (
                <li key={t.id}>
                  <div className="flex justify-between gap-3 text-[13.5px]">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-ink/55 tabular-nums">
                      {t.n}
                      {t.plan > 0 && t.trade > 0 && <span className="ml-2 text-[11.5px]">({t.trade} trade · {t.plan} planning)</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                    <span className="h-full bg-ink" style={{ width: `${(t.trade / topMax) * 100}%` }} />
                    <span className="h-full bg-brand" style={{ width: `${(t.plan / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
              <li className="flex gap-4 pt-1 text-[12px] text-ink/55">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ink" /> Trade help
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-brand" /> Planning desk
                </span>
              </li>
            </ul>
            <div className="rounded-3xl bg-white/70 p-4">
              <p className="text-[13.5px] font-semibold">How Kai answered</p>
              <ul className="mt-3 grid gap-2 text-[13px]">
                {asks.sources.map((x) => (
                  <li key={x.id} className="flex justify-between gap-3">
                    <span className={clsx(x.id === "limited" || x.id === "closed" ? "text-danger" : "text-ink/70")}>{x.label}</span>
                    <span className="font-semibold tabular-nums">{x.n}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink/50">The built-in rules answer most questions at no cost; the model takes follow-ups, other languages and open questions.</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[13.5px] text-ink/60">No questions to Kai this week yet. Topics show here as buyers use the chat.</p>
        )}
      </Card>

      <SaveBar count={changes} pending={saver.pending} error={saver.error} onDiscard={() => (setS(saved), saver.clearError())} onSave={() => saver.save(s)} />
    </div>
  );
}
