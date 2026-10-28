"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { askAssistant, SUGGESTED } from "./ai";
import { AdminIcon, Sheet, useStream } from "./ui";

type Message = { from: "you" | "ai"; text: string };

/** The assistant: ask about the site's inquiries, styles and replies; answers stream in. */
export function Assistant({ open, onClose, prompt }: { open: boolean; onClose: () => void; prompt: { text: string; n: number } | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const { shown, busy } = useStream(answer, run, (text) => setMessages((m) => [...m, { from: "ai", text }]));

  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { from: "you", text }]);
    setAnswer(askAssistant(text));
    setRun((r) => r + 1);
    setInput("");
  };

  // a question sent from elsewhere in the panel ("Ask the assistant")
  const lastPrompt = useRef(0);
  useEffect(() => {
    if (!prompt || prompt.n === lastPrompt.current) return;
    lastPrompt.current = prompt.n;
    const id = requestAnimationFrame(() => ask(prompt.text));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per prompt sent
  }, [prompt]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [shown, messages.length]);

  return (
    <Sheet open={open} onClose={onClose} title="Assistant">
      <div className="flex min-h-full flex-col">
        <div className="grid flex-1 content-start gap-3 pb-4" aria-live="polite">
          {!messages.length && !busy && (
            <div className="rounded-3xl bg-ink p-5 text-white">
              <AdminIcon name="sparkle" className="size-6" />
              <p className="mt-3 text-[17px] font-semibold">Ask about your buyers, styles and replies.</p>
              <p className="mt-1 text-[13.5px] text-white/65">It reads this panel&apos;s inquiries, products and traffic.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <p
              key={i}
              className={clsx(
                "max-w-[88%] rounded-3xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-line motion-safe:animate-[admin-in_.35s_both]",
                m.from === "you" ? "justify-self-end rounded-br-lg bg-ink text-white" : "rounded-bl-lg bg-white/90",
              )}
            >
              {m.text}
            </p>
          ))}
          {busy && (
            <p className="max-w-[88%] rounded-3xl rounded-bl-lg bg-white/90 px-4 py-3 text-[14px] leading-relaxed whitespace-pre-line">
              {shown || <span className="inline-flex gap-1 py-1">{[0, 1, 2].map((d) => <span key={d} className="size-1.5 rounded-full bg-ink/40 motion-safe:animate-bounce" style={{ animationDelay: `${d * 120}ms` }} />)}</span>}
            </p>
          )}
          <div ref={end} />
        </div>

        <div className="sticky bottom-0 -mx-1 bg-[#f4f4f2]/95 px-1 pt-2">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} disabled={busy} className="min-h-9 flex-none rounded-full bg-white px-3.5 text-[12.5px] font-medium ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-white disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink"
          >
            <label htmlFor="ask" className="sr-only">
              Ask the assistant
            </label>
            <input id="ask" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about the site" className="min-h-10 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-ink/40" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="grid size-10 place-items-center rounded-full bg-ink text-white transition-opacity disabled:opacity-30">
              <AdminIcon name="send" className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </Sheet>
  );
}
