"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { useDockHold } from "../Dock";
import { Icon } from "../Icon";
import { EmailForm } from "./SendInquiry";
import { byId, MOQ_CASES, PACK, products } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Opens the small "Ask inquiry" box, about one style (`product`) or the buyer's list. Pressed again while its box is
 * open, it closes it. Anywhere: the floating button, product pages, Quick View, the closing bands.
 */
export function AskInquiryButton({ product, onClick, children, ...rest }: ComponentPropsWithoutRef<"button"> & { product?: string }) {
  const ask = useUI((s) => s.ask);
  const openAsk = useUI((s) => s.openAsk);
  const closeAsk = useUI((s) => s.closeAsk);
  const mine = !!ask && ask.product === (product ?? null);
  return (
    <button
      type="button"
      data-ask-trigger
      aria-expanded={mine}
      aria-controls="ask-box"
      onClick={(e) => {
        onClick?.(e);
        if (mine) closeAsk();
        else openAsk(product);
      }}
      {...rest}
    >
      {children ?? (
        <>
          <Icon name="mail" className="size-4" /> Ask inquiry
        </>
      )}
    </button>
  );
}

/**
 * The small "Ask inquiry" box, bottom right above the floating buttons: the same ask as /send-inquiry in miniature, one
 * line, the inquiry's data (the style it was opened about, the list, or the line sheet) and the email box.
 * Rendered once, in SiteChrome; any AskInquiryButton opens it.
 */
export function AskBox() {
  const ask = useUI((s) => s.ask);
  const close = useUI((s) => s.closeAsk);
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);
  useDockHold(!!ask);

  // a new page closes it (the page has its own buttons)
  useEffect(() => close(), [pathname, close]);

  useEffect(() => {
    if (!ask) return;
    const back = document.activeElement as HTMLElement | null;
    const node = box.current;
    const t = setTimeout(() => box.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // a press outside closes it; its own buttons toggle it themselves
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element;
      if (!box.current?.contains(el) && !el.closest("[data-ask-trigger]")) close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      // focus was in the box (now gone, so on the body): give it back to whatever opened it
      const now = document.activeElement;
      if (back?.isConnected && (!now || now === document.body || node?.contains(now))) back.focus({ preventScroll: true });
    };
  }, [ask, close]);

  if (!ask) return null;
  return (
    <div
      ref={box}
      id="ask-box"
      role="dialog"
      aria-labelledby="ask-title"
      className="fixed right-[clamp(16px,3vw,32px)] bottom-[calc(86px+env(safe-area-inset-bottom,0px))] z-50 flex max-h-[calc(100dvh-110px-env(safe-area-inset-bottom,0px))] w-[min(calc(100vw-32px),380px)] origin-bottom-right animate-[ask-pop_.38s_cubic-bezier(.22,1,.36,1)_both] flex-col overflow-hidden rounded-shell bg-white shadow-[0_30px_60px_-20px_rgb(18_20_22/.45)] ring-1 ring-ink/8 motion-reduce:animate-none lg:bottom-[calc(150px+env(safe-area-inset-bottom,0px))] compact-dock:bottom-[calc(86px+env(safe-area-inset-bottom,0px))] lg:max-h-[calc(100dvh-180px)]"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="relative p-5 pb-4">
          <button type="button" onClick={close} aria-label="Close" className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-chip transition-colors hover:bg-chip-hover">
            <Icon name="close" className="size-4" />
          </button>
          <h2 id="ask-title" className="pr-10 font-headline text-[21px] leading-[1.15] font-semibold tracking-[-0.01em]">
            Add your email here. <em>We&rsquo;ll send you the details of your inquiry.</em>
          </h2>
          <AskData product={ask.product} />
        </div>
        <div className="bg-ink p-5 text-white">
          <AskForm key={ask.key} product={ask.product} />
        </div>
      </div>
    </div>
  );
}

/** The lines that go out: the buyer's list, plus the style the box was opened about (at MOQ) if it isn't on it. */
function useAskLines(product: string | null) {
  const list = useInquiry((s) => s.lines);
  const known = list.filter((l) => byId[l.id]);
  if (product && byId[product] && !known.some((l) => l.id === product)) return [...known, { id: product, cases: MOQ_CASES }];
  return known;
}

function AskForm({ product }: { product: string | null }) {
  const lines = useAskLines(product);
  const [round, setRound] = useState(0);
  return <EmailForm key={round} compact lines={lines} onAgain={() => setRound((r) => r + 1)} />;
}

/** A short box with the data: the style asked about, else the list in brief, else the line sheet. */
function AskData({ product }: { product: string | null }) {
  const lines = useAskLines(product);
  const p = product ? byId[product] : undefined;
  const pairs = lines.reduce((a, l) => a + l.cases * PACK, 0);

  if (p) {
    const cases = lines.find((l) => l.id === p.id)?.cases ?? MOQ_CASES;
    const others = lines.length - 1;
    return (
      <div className="mt-4 rounded-card bg-tile p-2.5">
        <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
          <span className="relative h-14 w-[60px] rounded-xl bg-photo">
            <Image src={p.outer.src} alt="" fill sizes="60px" className="object-contain p-1.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-semibold">{p.name}</span>
            <span className="block truncate text-[12.5px] text-muted">
              {p.color.name} · {p.sizes}
            </span>
            <span className="block text-[12.5px] text-ink-2 tabular-nums">
              {cases} cases · <b className="text-ink">{fmt(cases * PACK)} pairs</b>
            </span>
          </span>
        </div>
        {others > 0 && (
          <p className="mt-2 border-t border-line px-1 pt-2 text-[12.5px] text-muted">
            + {others} more style{others > 1 ? "s" : ""} from your list · {fmt(pairs)} pairs in all
          </p>
        )}
      </div>
    );
  }

  const shown = lines.length ? lines.map((l) => byId[l.id]) : products;
  return (
    <div className="mt-4 rounded-card bg-tile p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-semibold">{lines.length ? `Your inquiry · ${lines.length} style${lines.length > 1 ? "s" : ""}` : "The full line sheet"}</p>
        <Link href="/send-inquiry" className="text-[12.5px] font-semibold text-ink-2 underline hover:text-ink">
          Full page
        </Link>
      </div>
      <ul className="mt-2 grid grid-cols-4 gap-1.5">
        {shown.slice(0, 4).map((s) => (
          <li key={s.id} className="relative aspect-square rounded-lg bg-white">
            <Image src={s.outer.src} alt="" fill sizes="80px" className="object-contain p-1" />
          </li>
        ))}
      </ul>
      <p className={clsx("mt-2 text-[12.5px] text-muted", lines.length && "tabular-nums")}>
        {lines.length ? `${fmt(pairs)} pairs · line sheet and tier pricing for these styles` : `${products.length} styles · line sheet, tier pricing and sample timing`}
      </p>
    </div>
  );
}
