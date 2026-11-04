"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Assistant } from "./Assistant";
import { VIEWS, viewHref, viewOf } from "./data";
import { signOutAction } from "@/app/admin/actions";
import { PanelDataProvider } from "./panel-data";
import { AdminIcon, Flash, type AdminIconName } from "./ui";
import type { PanelData } from "@/lib/admin/panel";

/*
 * The admin panel UI, after the frosted-glass dashboard reference: a blurred room behind everything, frosted and dark
 * cards, a big light title, a rail of quick actions on the left and the section nav as a pill at the bottom.
 *
 * The frame of the routes in src/app/admin/(dashboard), behind sign-in, with the signed-in admin and the real data
 * (lib/admin/panel.ts), shared with the views through PanelDataProvider. Each section is its own page at its own
 * address. Views keep edits as drafts and publish them with server actions (app/admin/content-actions.ts), which check
 * the admin and validate every field again.
 *
 * Kept quick: the room is blurred once (a static image), so the cards need no live backdrop blur; only the two
 * floating bars blur what's behind them.
 */

const RAIL: {
  icon: AdminIconName;
  label: string;
  action: "ask" | "overview" | "pages" | "inquiries" | "site";
}[] = [
  { icon: "home", label: "Dashboard", action: "overview" },
  { icon: "sparkle", label: "Ask the assistant", action: "ask" },
  { icon: "page", label: "Pages", action: "pages" },
  { icon: "bell", label: "Inquiries", action: "inquiries" },
  { icon: "globe", label: "View the site", action: "site" },
];

export function AdminPanel({ admin, data, children }: { admin?: { name: string; email: string }; data: PanelData; children: ReactNode }) {
  const view = viewOf(usePathname());
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

  // on narrow screens the section nav scrolls: keep the open section in view
  const tabs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = tabs.current;
    const on = box?.querySelector<HTMLElement>("[aria-current=page]");
    if (!box || !on || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({
      left: on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [view]);

  const meta = VIEWS.find((v) => v.id === view)!;
  const active = VIEWS.findIndex((v) => v.id === view);
  // the catalogue is worked through as a table: the whole width of the screen, and a small title
  const wide = view === "products";

  return (
    <PanelDataProvider data={data} ask={ask}>
      <div className="relative isolate min-h-dvh overflow-x-clip pb-36 text-ink">
        {/* the room, blurred once */}
        <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[#e9e8e4]">
          <Image src="/showroom/poster.jpg" alt="" fill priority sizes="100vw" quality={40} className="scale-110 object-cover opacity-90 blur-2xl" />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/.55),rgb(240_240_236/.35)_40%,rgb(240_240_236/.6))]" />
        </div>

        {/* quick actions */}
        <nav
          aria-label="Quick actions"
          className="fixed top-1/2 left-3 z-30 hidden -translate-y-1/2 flex-col gap-1 rounded-full bg-ink/80 p-1.5 shadow-[0_20px_40px_-18px_rgb(18_20_22/.6)] backdrop-blur-xl md:flex"
        >
          {RAIL.map((r) => {
            const { action } = r;
            const on = (action === "overview" || action === "pages" || action === "inquiries") && view === action;
            const cls = clsx(
              "grid size-11 place-items-center rounded-full transition-colors duration-200",
              on ? "bg-white text-ink" : "text-white/75 hover:bg-white/15 hover:text-white",
            );
            return action === "site" ? (
              <a key={r.label} href="/" target="_blank" rel="noreferrer" aria-label={r.label} title={r.label} className={cls}>
                <AdminIcon name={r.icon} />
              </a>
            ) : action === "ask" ? (
              <button key={r.label} type="button" aria-label={r.label} title={r.label} onClick={() => ask()} className={cls}>
                <AdminIcon name={r.icon} />
              </button>
            ) : (
              <Link key={r.label} href={viewHref(action)} prefetch={false} aria-label={r.label} title={r.label} className={cls}>
                <AdminIcon name={r.icon} />
              </Link>
            );
          })}
        </nav>

        <div className={clsx("mx-auto w-full px-4 sm:px-6 md:pl-20", !wide && "max-w-[1584px]")}>
          <header className={clsx("flex flex-wrap items-end justify-between gap-4", wide ? "pt-5 pb-4" : "pt-8 pb-6 sm:pt-12")}>
            <div key={view} className="motion-safe:animate-[admin-in_.5s_cubic-bezier(.22,1,.36,1)_both]">
              <p className="text-[13px] font-medium text-ink/55">Chime Long · admin</p>
              <h1 className={clsx("leading-[0.95] font-light tracking-[-0.045em]", wide ? "text-[clamp(30px,3vw,40px)]" : "text-[clamp(48px,8vw,112px)]")}>{meta.title}</h1>
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

          <main key={view}>{children}</main>
        </div>

        {/* the section nav */}
        <nav aria-label="Admin sections" className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-3">
          <div className="flex max-w-full items-center gap-1.5 rounded-full bg-[#5d5f61]/70 p-1.5 shadow-[0_24px_48px_-20px_rgb(18_20_22/.7)] ring-1 ring-white/15 backdrop-blur-xl">
            <div ref={tabs} className="relative flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[92px] rounded-full bg-white/25 ring-1 ring-white/30 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ transform: `translateX(${active * 92}px)` }}
              />
              {VIEWS.map((v) => (
                <Link
                  key={v.id}
                  href={viewHref(v.id)}
                  prefetch={false}
                  aria-current={v.id === view ? "page" : undefined}
                  className={clsx(
                    "relative grid min-h-11 w-[92px] flex-none place-items-center rounded-full text-[13.5px] font-medium transition-colors",
                    v.id === view ? "text-white" : "text-white/65 hover:text-white",
                  )}
                >
                  {v.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={() => ask()}
              aria-label="Ask the assistant"
              className="grid size-11 flex-none place-items-center rounded-full bg-ink text-white transition-transform hover:scale-105 active:scale-95"
            >
              <AdminIcon name="sparkle" className="size-5" />
            </button>
          </div>
        </nav>

        <Assistant open={assistant} onClose={() => setAssistant(false)} prompt={prompt} />
        <Flash />
        {!data.ready && (
          <p
            role="status"
            className="fixed top-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-danger px-4 py-2 text-[13px] font-semibold text-white shadow-lg"
          >
            No database connected (MONGODB_URI): nothing can be saved, and there&apos;s no live data to show.
          </p>
        )}
      </div>
    </PanelDataProvider>
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
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-64 rounded-3xl bg-white/95 p-2 shadow-[0_24px_48px_-18px_rgb(18_20_22/.45)] ring-1 ring-ink/5 motion-safe:animate-[admin-in_.25s_cubic-bezier(.22,1,.36,1)_both]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate text-[14px] font-semibold">{admin?.name ?? "Admin"}</p>
            {admin?.email && <p className="truncate text-[12.5px] text-ink/55">{admin.email}</p>}
          </div>
          <a role="menuitem" href="/admin/security" className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-medium hover:bg-ink/[0.05]">
            <AdminIcon name="gear" className="size-4.5" /> Security
          </a>
          <form action={signOutAction}>
            <button
              role="menuitem"
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-[14px] font-medium text-danger hover:bg-danger/[0.06]"
            >
              <AdminIcon name="logout" className="size-4.5" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
