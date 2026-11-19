"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../Icon";
import { byId, categoryOf, groupOf, type Product } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

/** The colours of one style group that are already in the inquiry list. */
export function useGroupInList(group: Product[]) {
  const lines = useInquiry((s) => s.lines);
  return group.filter((g) => lines.some((l) => l.id === g.id)).map((g) => g.id);
}

/**
 * The round + on a card that stands for several colours. Instead of adding one colour blindly, it opens a small chooser
 * over the photo: pick the colours, then save them to the list or send the inquiry straight away.
 */
export function GroupAddButton({ id, className }: { id: string; className?: string }) {
  const p = byId[id];
  const group = groupOf(p);
  const ids = group.map((g) => g.id);
  const name = categoryOf(p);
  const inList = useGroupInList(group);
  const syncGroup = useInquiry((s) => s.syncGroup);
  const { openDrawer, showToast } = useUI();
  const [open, setOpen] = useState(false);
  // null = mirror the list (or the card's own colour); an array once the buyer taps a swatch.
  const [draft, setDraft] = useState<string[] | null>(null);
  const picked = draft ?? (inList.length ? inList : [id]);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstSwatch = useRef<HTMLButtonElement>(null);
  // Move focus into the chooser only when it was opened from the keyboard (no focus ring after a mouse click).
  const fromKeyboard = useRef(false);

  const close = (refocus = true) => {
    setOpen(false);
    setDraft(null);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    if (fromKeyboard.current) firstSwatch.current?.focus();
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const flip = (gid: string) => setDraft(picked.includes(gid) ? picked.filter((x) => x !== gid) : [...picked, gid]);

  const save = () => {
    syncGroup(ids, picked);
    showToast(picked.length ? `${name} · ${picked.length} colour${picked.length > 1 ? "s" : ""} in your list` : `${name} removed`);
    close();
  };

  const send = () => {
    syncGroup(ids, picked);
    close(false);
    openDrawer();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    close();
  };

  return (
    <div ref={root} className="contents">
      <button
        ref={trigger}
        type="button"
        onClick={(e) => {
          if (open) return close();
          fromKeyboard.current = e.detail === 0;
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-on={inList.length > 0 || open}
        aria-label={`Choose colours: ${name}${inList.length ? `, ${inList.length} in your inquiry list` : ""}`}
        className={clsx(
          "hit-44 grid place-items-center rounded-full transition-[background-color,color,scale,opacity] duration-200 active:scale-95",
          inList.length ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink hover:text-white",
          className,
        )}
      >
        <Icon name={inList.length ? "check" : "plus"} className="size-[18px]" />
        {inList.length > 1 && (
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-white tabular-nums">{inList.length}</span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Choose colours: ${name}`}
          onKeyDown={onKey}
          className="absolute inset-2 z-[5] flex animate-rise-in flex-col rounded-ph bg-white/95 p-3 shadow-float ring-1 ring-line backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold">
              Choose colours <span className="font-normal text-muted tabular-nums">· {picked.length} of {group.length}</span>
            </p>
            <button type="button" onClick={() => close()} aria-label="Close colour chooser" className="hit-44 relative grid size-7 place-items-center rounded-full text-ink-2 hover:bg-chip">
              <Icon name="close" className="size-3.5" />
            </button>
          </div>

          <ul className="scrollbar-soft mt-2 grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
            {group.map((g, i) => {
              const on = picked.includes(g.id);
              return (
                <li key={g.id}>
                  <button
                    ref={i === 0 ? firstSwatch : undefined}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${g.name}, ${g.color.name}`}
                    onClick={() => flip(g.id)}
                    className={clsx(
                      "flex w-full flex-col items-center rounded-[10px] p-1 ring-1 transition-colors",
                      on ? "bg-ink/5 ring-ink" : "ring-transparent hover:ring-ink/20",
                    )}
                  >
                    <span className="relative block aspect-square w-full rounded-lg bg-tile">
                      <Image src={g.outer.src} alt="" fill sizes="72px" className="object-contain p-1.5" />
                      {on && (
                        <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-ink text-white">
                          <Icon name="check" className="size-2.5" />
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex w-full items-center justify-center gap-1 text-[11px] leading-tight text-ink-2">
                      <span className="size-2 flex-none rounded-full inset-ring inset-ring-ink/15" style={{ background: g.color.hex }} />
                      <span className="truncate">{g.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div data-dock-avoid className="mt-2 grid gap-1">
            <button type="button" onClick={send} disabled={!picked.length} className="btn btn-dark h-10! px-4! text-[13px]!">
              Send inquiry <Icon name="arrow" className="size-3.5" />
            </button>
            <button type="button" onClick={save} className="h-9 rounded-full text-[13px] font-semibold text-ink-2 hover:bg-chip hover:text-ink">
              {inList.length && !picked.length ? "Remove from list" : "Save to list"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
