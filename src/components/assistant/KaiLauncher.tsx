"use client";

import { deskOn } from "@/lib/content/live";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { useShownSeason } from "../season/live";
import "./kai.css";
import { useKai } from "./kai";
import { KaiAvatar, KaiChat, KaiModeTabs } from "./KaiChat";
import { ASSISTANT } from "@/lib/assistant/persona";
import { SEASONS } from "@/lib/season";

const NUDGE_KEY = "kai-nudged";
const NUDGE_AFTER = 15_000;

/**
 * Kai on every page: a button above the inquiry button, a one-time invitation after a visitor has looked around for
 * a while, and the chat in a panel (full screen on phones). Not on /assistant, which is the chat itself.
 */
export function KaiLauncher() {
  const pathname = usePathname();
  const season = useShownSeason();
  const open = useKai((s) => s.open);
  const setOpen = useKai((s) => s.setOpen);
  const picked = useKai((s) => s.mode);
  // a desk switched off in the admin panel (AI agent) isn't offered
  const mode = deskOn(picked) ? picked : picked === "plan" ? "trade" : "plan";
  const [nudge, setNudge] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const hidden = pathname === "/assistant";

  // invite once per tab, only if they haven't opened the chat
  useEffect(() => {
    if (hidden) return;
    let seen = false;
    try {
      seen = !!sessionStorage.getItem(NUDGE_KEY);
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setNudge(true);
      try {
        sessionStorage.setItem(NUDGE_KEY, "1");
      } catch {}
    }, NUDGE_AFTER);
    return () => clearTimeout(t);
  }, [hidden]);

  // on phones the chat covers the screen: hold the page still behind it
  useEffect(() => {
    if (!open || !matchMedia("(max-width: 767px)").matches) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (hidden || (!deskOn("trade") && !deskOn("plan"))) return null;
  const show = () => {
    setNudge(false);
    setOpen(true);
  };

  return (
    <>
      {nudge && !open && (
        <div role="status" className="kai-glass kai-dense kai-rise fixed right-[clamp(16px,3vw,32px)] bottom-[calc(150px+env(safe-area-inset-bottom,0px))] z-40 w-[min(300px,calc(100vw-32px))] rounded-[20px] p-4 text-[13.5px]">
          <button type="button" onClick={() => setNudge(false)} aria-label="Dismiss" className="absolute top-1 right-1 grid size-10 place-items-center rounded-full text-muted hover:bg-white/60">
            <Icon name="close" className="size-3.5" />
          </button>
          <p className="pr-8 font-semibold">Hi, I&rsquo;m {ASSISTANT.name}, the trade assistant.</p>
          <p className="mt-1 text-ink-2">
            Want the styles that sell best {season ? `this ${SEASONS[season].name.toLowerCase()}` : "right now"}, or help with MOQ and shipping?
          </p>
          <button type="button" onClick={show} className="-mb-1 mt-1 min-h-11 font-semibold text-brand underline underline-offset-2">
            Ask {ASSISTANT.name}
          </button>
        </div>
      )}

      <button
        ref={button}
        id="kai-launcher"
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-expanded={open}
        aria-controls="kai-panel"
        className={clsx(
          "kai-glass fixed right-[clamp(16px,3vw,32px)] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-40 flex h-[54px] items-center gap-2 rounded-full p-1.5 transition-[opacity,transform] duration-300 hover:-translate-y-0.5 md:pr-4",
          open && "max-md:pointer-events-none max-md:opacity-0",
        )}
      >
        <KaiAvatar className="size-10 text-[16px]" state={open ? undefined : nudge ? "thinking" : undefined} />
        <span className="hidden text-[14px] font-semibold md:inline">{open ? "Close" : `Ask ${ASSISTANT.name}`}</span>
        <span className="sr-only md:hidden">{open ? `Close ${ASSISTANT.name}` : `Ask ${ASSISTANT.name}, the trade assistant`}</span>
      </button>

      {open && (
        <section
          id="kai-panel"
          role="dialog"
          aria-label={`${ASSISTANT.name}, ${ASSISTANT.role}`}
          className="kai-glass kai-dense kai-open fixed isolate z-50 flex flex-col overflow-hidden max-md:inset-0 max-md:rounded-none max-md:border-0 md:right-[clamp(16px,3vw,32px)] md:bottom-[calc(150px+env(safe-area-inset-bottom,0px))] md:h-[min(660px,calc(100dvh-180px))] md:w-[410px] md:rounded-[28px]"
        >
          <span aria-hidden="true" className="kai-ambient" />
          <header className="flex items-center gap-2.5 border-b border-white/60 px-4 py-2.5 max-md:pt-[max(10px,env(safe-area-inset-top))]">
            <KaiAvatar className="size-10 text-[16px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-tight font-semibold">{ASSISTANT.name}</p>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[#2f9e6b] shadow-[0_0_0_3px_rgb(47_158_107/0.18)]" />
                {mode === "plan" ? "Planning desk" : "Trade assistant"} · AI
              </p>
            </div>
            <Link href="/assistant" onClick={() => setOpen(false)} aria-label="Open the full chat page" title="Full page" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/60 md:size-10">
              <Icon name="zoom" className="size-4" />
            </Link>
            <button type="button" onClick={() => (setOpen(false), button.current?.focus())} aria-label="Close" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-white/60 md:size-10">
              <Icon name="close" className="size-4" />
            </button>
          </header>
          <KaiModeTabs className="mx-4 mt-3" />
          <div className="min-h-0 flex-1">
            <KaiChat key={mode} mode={mode} autoFocus />
          </div>
        </section>
      )}
    </>
  );
}
