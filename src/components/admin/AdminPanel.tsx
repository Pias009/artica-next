"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { Assistant } from "./Assistant";
import { VIEWS, type View } from "./data";
import { signOutAction } from "@/app/admin/actions";
import { AdminIcon, type AdminIconName } from "./ui";
import { Overview } from "./views/Overview";

/*
 * The admin panel UI, after the frosted-glass dashboard reference: a blurred room behind everything, frosted and dark
 * cards, a big light title, a rail of quick actions on the left and the section nav as a pill at the bottom.
 *
 * Mounted by src/app/admin/(dashboard) behind sign-in, which passes the signed-in admin. The views edit local state
 * (each shows a publish bar) until they're wired to server actions that check the admin first.
 *
 * Kept quick: the room is blurred once (a static image), so the cards need no live backdrop blur; only the two
 * floating bars blur what's behind them. Views other than the dashboard load on first visit.
 */

const loading = () => <div className="h-[60vh] animate-pulse rounded-[28px] bg-white/40" />;
const VIEW_PARTS = {
  overview: Overview,
  visitors: dynamic(() => import("./views/Visitors").then((m) => m.Visitors), { loading }),
  agent: dynamic(() => import("./views/Agent").then((m) => m.Agent), { loading }),
  pages: dynamic(() => import("./views/Pages").then((m) => m.Pages), { loading }),
  products: dynamic(() => import("./views/Products").then((m) => m.Products), { loading }),
  inquiries: dynamic(() => import("./views/Inquiries").then((m) => m.Inquiries), { loading }),
  seasons: dynamic(() => import("./views/Seasons").then((m) => m.Seasons), { loading }),
  settings: dynamic(() => import("./views/Settings").then((m) => m.Settings), { loading }),
} satisfies Record<View, ComponentType<never>>;

/** The open view lives in the URL hash (#inquiries), so views can be linked to and Back works. */
const onHash = (cb: () => void) => (window.addEventListener("hashchange", cb), () => window.removeEventListener("hashchange", cb));
const readView = (): View => {
  const h = window.location.hash.slice(1);
  return VIEWS.some((v) => v.id === h) ? (h as View) : "overview";
};

const RAIL: { icon: AdminIconName; label: string; action: "ask" | "overview" | "pages" | "inquiries" | "site" }[] = [
  { icon: "home", label: "Dashboard", action: "overview" },
  { icon: "sparkle", label: "Ask the assistant", action: "ask" },
  { icon: "page", label: "Pages", action: "pages" },
  { icon: "bell", label: "Inquiries", action: "inquiries" },
  { icon: "globe", label: "View the site", action: "site" },
];

export function AdminPanel({ admin }: { admin?: { name: string; email: string } }) {
  const view = useSyncExternalStore(onHash, readView, () => "overview" as View);
  const go = useCallback((v: View) => {
    window.location.hash = v === "overview" ? "" : v;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [assistant, setAssistant] = useState(false);
  const [prompt, setPrompt] = useState<{ text: string; n: number } | null>(null);
  const ask = useCallback((text?: string) => {
    setAssistant(true);
    if (text) setPrompt((p) => ({ text, n: (p?.n ?? 0) + 1 }));
  }, []);

  // ⌘K / Ctrl+K opens the assistant
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistant(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = VIEWS.find((v) => v.id === view)!;
  const Part = VIEW_PARTS[view] as ComponentType<{ onAsk?: (p: string) => void; onGo?: (v: View) => void }>;
  const active = VIEWS.findIndex((v) => v.id === view);

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip pb-36 text-ink">
      {/* the room, blurred once */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[#e9e8e4]">
        <Image src="/showroom/poster.jpg" alt="" fill priority sizes="100vw" quality={40} className="scale-110 object-cover opacity-90 blur-2xl" />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/.55),rgb(240_240_236/.35)_40%,rgb(240_240_236/.6))]" />
      </div>

      {/* quick actions */}
      <nav aria-label="Quick actions" className="fixed top-1/2 left-3 z-30 hidden -translate-y-1/2 flex-col gap-1 rounded-full bg-ink/80 p-1.5 shadow-[0_20px_40px_-18px_rgb(18_20_22/.6)] backdrop-blur-xl md:flex">
        {RAIL.map((r) => {
          const { action } = r;
          const on = (action === "overview" || action === "pages" || action === "inquiries") && view === action;
          const cls = clsx("grid size-11 place-items-center rounded-full transition-colors duration-200", on ? "bg-white text-ink" : "text-white/75 hover:bg-white/15 hover:text-white");
          return action === "site" ? (
            <a key={r.label} href="/" target="_blank" rel="noreferrer" aria-label={r.label} title={r.label} className={cls}>
              <AdminIcon name={r.icon} />
            </a>
          ) : (
            <button key={r.label} type="button" aria-label={r.label} title={r.label} onClick={() => (action === "ask" ? ask() : go(action))} className={cls}>
              <AdminIcon name={r.icon} />
            </button>
          );
        })}
      </nav>

      <div className="mx-auto w-full max-w-[1584px] px-4 sm:px-6 md:pl-20">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6 sm:pt-12">
          <div key={view} className="motion-safe:animate-[admin-in_.5s_cubic-bezier(.22,1,.36,1)_both]">
            <p className="text-[13px] font-medium text-ink/55">Chime Long · admin</p>
            <h1 className="text-[clamp(48px,8vw,112px)] leading-[0.95] font-light tracking-[-0.045em]">{meta.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => ask()}
              className="flex min-h-11 items-center gap-2.5 rounded-full bg-white/70 pr-2 pl-4 text-[13.5px] text-ink/60 ring-1 ring-white transition-colors hover:bg-white"
            >
              <AdminIcon name="sparkle" className="size-4 text-ink" />
              Ask anything
              <kbd className="rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11.5px] font-semibold">⌘K</kbd>
            </button>
            <AccountMenu admin={admin} />
          </div>
        </header>

        <main key={view}>
          <Part onAsk={ask} onGo={go} />
        </main>
      </div>

      {/* the section nav */}
      <nav aria-label="Admin sections" className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-3">
        <div className="flex max-w-full items-center gap-1.5 rounded-full bg-[#5d5f61]/70 p-1.5 shadow-[0_24px_48px_-20px_rgb(18_20_22/.7)] ring-1 ring-white/15 backdrop-blur-xl">
          <div className="relative flex overflow-x-auto">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[92px] rounded-full bg-white/25 ring-1 ring-white/30 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ transform: `translateX(${active * 92}px)` }}
            />
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-current={v.id === view ? "page" : undefined}
                onClick={() => go(v.id)}
                className={clsx("relative min-h-11 w-[92px] flex-none rounded-full text-[13.5px] font-medium transition-colors", v.id === view ? "text-white" : "text-white/65 hover:text-white")}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => ask()} aria-label="Ask the assistant" className="grid size-11 flex-none place-items-center rounded-full bg-ink text-white transition-transform hover:scale-105 active:scale-95">
            <AdminIcon name="sparkle" className="size-5" />
          </button>
        </div>
      </nav>

      <Assistant open={assistant} onClose={() => setAssistant(false)} prompt={prompt} />
    </div>
  );
}

/** The avatar: who's signed in, the security page (sessions, audit log) and sign out. */
function AccountMenu({ admin }: { admin?: { name: string; email: string } }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const initials = (admin?.name ?? "Chime Long")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full bg-ink text-[14px] font-semibold text-white transition-transform hover:scale-105 active:scale-95"
      >
        {initials}
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-40 mt-2 w-64 rounded-3xl bg-white/95 p-2 shadow-[0_24px_48px_-18px_rgb(18_20_22/.45)] ring-1 ring-ink/5 motion-safe:animate-[admin-in_.25s_cubic-bezier(.22,1,.36,1)_both]">
          <div className="px-3 pt-2 pb-3">
            <p className="truncate text-[14px] font-semibold">{admin?.name ?? "Admin"}</p>
            {admin?.email && <p className="truncate text-[12.5px] text-ink/55">{admin.email}</p>}
          </div>
          <a role="menuitem" href="/admin/security" className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-medium hover:bg-ink/[0.05]">
            <AdminIcon name="gear" className="size-4.5" /> Security
          </a>
          <form action={signOutAction}>
            <button role="menuitem" type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-[14px] font-medium text-danger hover:bg-danger/[0.06]">
              <AdminIcon name="logout" className="size-4.5" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
