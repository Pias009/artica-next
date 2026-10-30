"use client";

import { useChat } from "@ai-sdk/react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Icon } from "../Icon";
import { forget, kaiChat, save, saved } from "./kai";
import "./kai.css";
import { DraftCard, KaiCards } from "./KaiCards";
import { KaiText } from "./KaiText";
import { canSpeak, setVoiceOn, speak, stopSpeaking, useSpeaking, useVoiceOn } from "./voice";
import { ASSISTANT, STARTERS } from "@/lib/assistant/persona";
import type { BackOption } from "@/lib/assistant/skills";
import type { KaiMessage } from "@/lib/assistant/tools";

type Part = KaiMessage["parts"][number];

/** What Kai is doing while a tool runs, so the wait reads as work. */
const WORKING: Record<string, string> = {
  findProducts: "Looking through the range…",
  productDetails: "Checking that style…",
  seasonAdvice: "Checking the season there…",
  topSellers: "Checking what's selling…",
  shippingInfo: "Checking shipping…",
  planOrder: "Working out the load…",
  policies: "Checking our terms…",
  aboutCompany: "One moment…",
  draftInquiry: "Preparing your inquiry…",
};

const noop = () => () => {};
const textOf = (m: KaiMessage) => m.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n");

/** The conversation with Kai: used in the pop-up panel and, wider, on /assistant. */
export function KaiChat({ wide = false, autoFocus = false }: { wide?: boolean; autoFocus?: boolean }) {
  const [chat] = useState(kaiChat);
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat<KaiMessage>({ chat });
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const voiceOn = useVoiceOn();
  const speaking = useSpeaking();
  // whether this browser can speak: false on the server, real after hydration
  const voiceable = useSyncExternalStore(noop, canSpeak, () => false);

  // bring back this tab's conversation after the first render (sessionStorage isn't there on the server)
  useEffect(() => {
    if (!chat.messages.length) {
      const before = saved();
      if (before.length) setMessages(before);
    }
    return () => stopSpeaking();
  }, [chat, setMessages]);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);

  // with the voice on, each finished reply is read aloud
  const was = useRef(status);
  useEffect(() => {
    const finished = (was.current === "streaming" || was.current === "submitted") && status === "ready";
    was.current = status;
    const last = messages[messages.length - 1];
    if (finished && voiceOn && last?.role === "assistant") speak(last.id, textOf(last));
  }, [status, messages, voiceOn]);

  const send = (text: string, offline = false) => {
    const t = text.trim().slice(0, 2000);
    if (!t || busy) return;
    clearError();
    stopSpeaking();
    void sendMessage({ text: t }, offline ? { body: { offline: true } } : undefined);
    setInput("");
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser ? textOf(lastUser) : "";
  const lastId = messages[messages.length - 1]?.id;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} role="log" aria-live="polite" aria-label={`Conversation with ${ASSISTANT.name}`} className={clsx("min-h-0 flex-1 overflow-y-auto overscroll-contain", wide ? "px-1 py-4" : "px-4 py-4")}>
        {messages.length === 0 ? (
          <Welcome onPick={(q) => send(q)} wide={wide} />
        ) : (
          <ol className={clsx("grid gap-4", wide && "mx-auto max-w-[900px]")}>
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="kai-rise flex justify-end">
                  <p className="kai-ink max-w-[85%] rounded-[20px] rounded-br-[8px] px-4 py-2.5 text-[16px] whitespace-pre-wrap text-white md:text-[14px]">{textOf(m)}</p>
                </li>
              ) : (
                <li key={m.id} className="kai-rise flex items-start gap-2.5">
                  <KaiAvatar className="mt-0.5 size-8 text-[13px]" state={speaking === m.id ? "speaking" : m.id === lastId && busy ? "thinking" : undefined} />
                  <div className="@container grid min-w-0 flex-1 gap-2.5 text-[16px] leading-relaxed text-ink md:text-[14px]">
                    {m.parts.map((p, i) => (
                      <AssistantPart key={i} part={p} wide={wide} writing={m.id === lastId && status === "streaming" && i === m.parts.length - 1} onAsk={busy ? undefined : send} />
                    ))}
                    {voiceable && !(m.id === lastId && busy) && textOf(m).trim() && !m.parts.some((p) => p.type === "tool-offTopic") && (
                      <button
                        type="button"
                        onClick={() => (speaking === m.id ? stopSpeaking() : speak(m.id, textOf(m)))}
                        aria-pressed={speaking === m.id}
                        className="-mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink md:min-h-8"
                      >
                        <SpeakerIcon on={speaking !== m.id} className="size-4" />
                        {speaking === m.id ? "Stop" : "Listen"}
                      </button>
                    )}
                  </div>
                </li>
              ),
            )}
            {status === "submitted" && (
              <li aria-label={`${ASSISTANT.name} is thinking`} className="kai-rise flex items-center gap-2.5">
                <KaiAvatar className="size-8 text-[13px]" state="thinking" />
                <span className="kai-pane flex gap-1.5 rounded-[18px] rounded-tl-[8px] px-4 py-3.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="kai-dot size-2 rounded-full bg-brand/70" style={{ animationDelay: `${i * 140}ms` }} />
                  ))}
                </span>
              </li>
            )}
          </ol>
        )}
        {error && (
          <div role="alert" className="kai-rise mt-3 rounded-[16px] bg-blush/90 px-4 py-3 text-[13px] text-danger ring-1 ring-white/70">
            <p>{/429|a lot of messages/.test(error.message) ? "You've sent a lot of messages; please wait a few minutes." : `${ASSISTANT.name} couldn't answer just then.`}</p>
            <div className="mt-1 flex flex-wrap gap-x-3">
              <button type="button" onClick={() => (clearError(), setMessages(messages.filter((m) => m !== lastUser)), send(lastUserText))} className="min-h-11 font-semibold underline md:min-h-8">
                Try again
              </button>
              <button type="button" onClick={() => (clearError(), setMessages(messages.filter((m) => m !== lastUser)), send(lastUserText, true))} className="min-h-11 font-semibold underline md:min-h-8">
                Quick answer without AI
              </button>
              <Link href="/inquiry" className="inline-flex min-h-11 items-center font-semibold underline md:min-h-8">
                Send an inquiry
              </Link>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className={clsx("border-t border-white/60", wide ? "pt-3" : "p-3 pb-[max(12px,env(safe-area-inset-bottom))]")}
      >
        <div className="kai-pane flex items-end gap-2 rounded-[22px] p-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand)_22%,transparent),inset_0_1px_0_#fff]">
          <textarea
            ref={field}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={`Ask ${ASSISTANT.name} about styles, seasons, MOQ, shipping…`}
            aria-label={`Message ${ASSISTANT.name}`}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] outline-none [field-sizing:content] placeholder:text-muted md:min-h-10 md:text-[14px]"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} aria-label="Stop" className="kai-ink grid size-11 shrink-0 place-items-center rounded-full text-white md:size-10">
              <span className="size-3 rounded-[2px] bg-white" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="kai-orb size-11 transition-[opacity,transform] hover:scale-105 active:scale-95 disabled:opacity-35 disabled:hover:scale-100 md:size-10">
              <Icon name="arrow" className="size-4 -rotate-90" />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[12px] leading-snug text-ink-2">
          <span>
            {ASSISTANT.name} is an AI assistant and can make mistakes; the trade desk confirms prices and orders. <Link href="/privacy" className="underline">Privacy</Link>
          </span>
          <span className="flex shrink-0 items-center">
            {voiceable && (
              <button
                type="button"
                onClick={() => setVoiceOn(!voiceOn)}
                aria-pressed={voiceOn}
                aria-label={voiceOn ? "Stop reading replies aloud" : "Read replies aloud"}
                title={voiceOn ? "Voice on" : "Voice off"}
                className={clsx("grid size-11 place-items-center rounded-full md:size-8", voiceOn ? "text-brand" : "text-ink-2 hover:text-ink")}
              >
                <SpeakerIcon on={voiceOn} className="size-[18px]" />
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  stop();
                  stopSpeaking();
                  setMessages([]);
                  save([]);
                  forget();
                }}
                className="min-h-11 px-2 font-semibold underline md:min-h-8"
              >
                New chat
              </button>
            )}
          </span>
        </div>
      </form>
    </div>
  );
}

function Welcome({ onPick, wide }: { onPick: (q: string) => void; wide: boolean }) {
  return (
    <div className={clsx("grid gap-5", wide ? "mx-auto max-w-[600px] pt-[8vh] text-center" : "pt-2")}>
      <div className={clsx("kai-rise flex items-center gap-3.5", wide && "flex-col")}>
        <KaiAvatar className={wide ? "size-20 text-[34px]" : "size-12 text-[20px]"} />
        <div>
          <p className={clsx("font-headline font-semibold tracking-[-0.01em]", wide ? "text-[28px]" : "text-[19px]")}>Hi, I&rsquo;m {ASSISTANT.name}.</p>
          <p className="text-[14px] text-ink-2">I help buyers pick what will sell in their market, and get pricing fast.</p>
        </div>
      </div>
      <ul className={clsx("flex flex-wrap gap-2", wide && "justify-center")}>
        {STARTERS.map((q, i) => (
          <li key={q} className="kai-rise" style={{ "--i": i + 1 } as CSSProperties}>
            <button type="button" onClick={() => onPick(q)} className="kai-pane kai-tilt min-h-11 rounded-full px-4 py-2 text-left text-[14px] font-medium md:min-h-9 md:text-[13px]">
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantPart({ part, wide, writing, onAsk }: { part: Part; wide: boolean; writing: boolean; onAsk?: (q: string) => void }) {
  if (part.type === "text") {
    if (!part.text.trim()) return null;
    return (
      <div className={clsx("kai-pane w-fit max-w-full rounded-[20px] rounded-tl-[8px] px-4 py-2.5", writing && "kai-caret")}>
        <KaiText text={part.text} />
      </div>
    );
  }
  if (!part.type.startsWith("tool-")) return null;
  const tool = part as Extract<Part, { type: `tool-${string}` }>;
  const name = tool.type.slice(5);
  if (tool.state === "input-streaming" || tool.state === "input-available") {
    return <p className="text-[13px] text-ink-2 motion-safe:animate-pulse">{WORKING[name] ?? "Checking…"}</p>;
  }
  if (tool.state !== "output-available") return null;
  switch (tool.type) {
    case "tool-findProducts":
      return <KaiCards cards={tool.output.styles} wide={wide} />;
    case "tool-seasonAdvice":
      return <KaiCards cards={tool.output.picks} wide={wide} />;
    case "tool-topSellers":
      return <KaiCards cards={[...tool.output.mostRequested, ...tool.output.marked, ...tool.output.inSeason].slice(0, 8)} wide={wide} />;
    case "tool-productDetails":
      return tool.output.found ? <KaiCards cards={[tool.output]} wide={wide} /> : <KaiCards cards={tool.output.suggestions} wide={wide} />;
    case "tool-draftInquiry":
      return <DraftCard draft={tool.output} />;
    case "tool-offTopic":
      return <BackOptions options={tool.output.options} onAsk={onAsk} />;
    default:
      return null;
  }
}

/**
 * Under a reply that declines an off-topic question: ways back to buying. Questions go to Kai; pages open.
 * Questions wait while Kai is still answering.
 */
function BackOptions({ options, onAsk }: { options: BackOption[]; onAsk?: (q: string) => void }) {
  const chip = "kai-pane kai-tilt inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium md:min-h-9 md:text-[13px]";
  return (
    <nav aria-label="Ways I can help">
      <ul className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <li key={o.label} className="kai-rise" style={{ "--i": i } as CSSProperties}>
            {o.kind === "ask" ? (
              <button type="button" onClick={() => onAsk?.(o.prompt)} disabled={!onAsk} className={clsx(chip, "disabled:opacity-50")}>
                <Icon name="chat" className="size-3.5 text-brand" />
                {o.label}
              </button>
            ) : (
              <Link href={o.href} className={chip}>
                {o.label}
                <Icon name="arrow" className="size-3.5 text-ink-2" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Kai's orb: a lit sphere in the brand colour. `thinking` breathes, `speaking` sends out rings. */
export function KaiAvatar({ className, state }: { className?: string; state?: "thinking" | "speaking" }) {
  return (
    <span aria-hidden="true" data-state={state} className={clsx("kai-orb", className)}>
      K
    </span>
  );
}

function SpeakerIcon({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
    </svg>
  );
}
