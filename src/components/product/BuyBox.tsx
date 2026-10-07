"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon } from "../Icon";
import { useGroupInList } from "./ColorChooser";
import { byId, groupOf, MOQ_CASES, PACK, STEP_CASES } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Product-page order box: choose the colours, set cases per colour, then add them to the inquiry list or send the
 * inquiry straight away. The list mirrors the choice: unticking a colour that is already in it takes it out.
 */
export function BuyBox({ id }: { id: string }) {
  const p = byId[id];
  const group = groupOf(p);
  const ids = group.map((g) => g.id);
  const inList = useGroupInList(group);
  const savedCases = useInquiry((s) => s.lines.find((l) => l.id === (inList.includes(id) ? id : inList[0]))?.cases);
  const syncGroup = useInquiry((s) => s.syncGroup);
  const { openDrawer, showToast } = useUI();

  // null = follow the list (or this page's colour at MOQ); a value once the buyer changes it here.
  const [draftPicked, setDraftPicked] = useState<string[] | null>(null);
  const [draftCases, setDraftCases] = useState<number | null>(null);
  const picked = draftPicked ?? (inList.length ? inList : [id]);
  const cases = draftCases ?? savedCases ?? MOQ_CASES;
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const dirty = !inList.length || !same(picked, inList) || cases !== savedCases;
  const pairs = picked.length * cases * PACK;

  const flip = (gid: string) => setDraftPicked(picked.includes(gid) ? picked.filter((x) => x !== gid) : [...picked, gid]);

  const change = (dir: 1 | -1) => {
    const n = cases + dir * STEP_CASES;
    if (n < MOQ_CASES) return showToast(`MOQ is ${MOQ_CASES} cases per colour`);
    setDraftCases(n);
  };

  const save = () => {
    syncGroup(ids, picked, cases);
    setDraftPicked(null);
    setDraftCases(null);
    showToast(
      picked.length
        ? `${picked.length} colour${picked.length > 1 ? "s" : ""} in your list · ${fmt(pairs)} pairs`
        : `${p.name} removed from your list`,
    );
  };

  const send = () => {
    if (dirty) syncGroup(ids, picked, cases);
    setDraftPicked(null);
    setDraftCases(null);
    openDrawer();
  };

  return (
    <div className="rounded-card bg-tile p-4">
      {/* 1. colours */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-2">{group.length > 1 ? "Choose colours" : "Colour"}</span>
        {group.length > 1 && (
          <span className="text-[12.5px] text-muted tabular-nums">
            {picked.length} of {group.length} selected
          </span>
        )}
      </div>
      {group.length > 1 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Colours for this inquiry">
          {group.map((g) => {
            const on = picked.includes(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => flip(g.id)}
                  className={clsx(
                    "inline-flex h-10 items-center gap-2 rounded-full pr-3.5 pl-2 text-[13.5px] font-medium ring-1 transition-colors",
                    on ? "bg-ink text-white ring-ink" : "bg-white text-ink-2 ring-ink/10 hover:ring-ink/30",
                  )}
                >
                  <span className="size-5 flex-none rounded-full ring-2 ring-white/80 inset-ring inset-ring-ink/15" style={{ background: g.color.hex }} />
                  {g.name}
                  {on && <Icon name="check" className="size-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-[14px] font-medium">
          <span className="size-5 rounded-full inset-ring inset-ring-ink/15" style={{ background: p.color.hex }} />
          {p.color.name}
        </p>
      )}

      {/* 2. quantity per colour */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div>
          <span className="block text-[13px] font-semibold text-ink-2">Cases per colour</span>
          <span className="block text-[13px] text-muted tabular-nums">
            {picked.length > 1 ? `${picked.length} colours × ${cases} cases · ` : `${cases} cases · `}
            <b className="text-ink">{fmt(pairs)} pairs</b>
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-surface p-1" role="group" aria-label="Cases per colour">
          <button type="button" onClick={() => change(-1)} aria-label="Fewer cases" className="hit-44 relative grid size-9 place-items-center rounded-full hover:bg-chip">
            <Icon name="minus" />
          </button>
          <output className="min-w-10 text-center text-[15px] font-semibold tabular-nums">{cases}</output>
          <button type="button" onClick={() => change(1)} aria-label="More cases" className="hit-44 relative grid size-9 place-items-center rounded-full hover:bg-chip">
            <Icon name="plus" />
          </button>
        </div>
      </div>

      {/* 3. actions */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {dirty ? (
          <button type="button" onClick={save} disabled={!picked.length && !inList.length} className="btn btn-line h-12">
            <Icon name={inList.length ? "check" : "plus"} />
            {inList.length ? (picked.length ? "Update list" : "Remove from list") : "Add to list"}
          </button>
        ) : (
          <button type="button" onClick={() => openDrawer()} className="btn btn-line h-12">
            <Icon name="check" />
            In your list
          </button>
        )}
        <button type="button" onClick={send} disabled={!picked.length} className="btn btn-dark h-12">
          Send inquiry <Icon name="arrow" className="size-4" />
        </button>
      </div>
      <button type="button" onClick={() => openDrawer(undefined, undefined, `Sample request: ${picked.map((x) => byId[x].name).join(", ") || p.name}. One pair each.`)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <Icon name="sample" className="size-4" /> Request a sample first
      </button>
    </div>
  );
}
