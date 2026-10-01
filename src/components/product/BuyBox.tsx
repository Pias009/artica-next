"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { byId, MOQ_CASES, PACK, STEP_CASES } from "@/lib/products";
import { useInquiry, useUI } from "@/lib/store";

/** Case-quantity stepper + add/update inquiry actions for a product page. */
export function BuyBox({ id }: { id: string }) {
  const p = byId[id];
  const line = useInquiry((s) => s.lines.find((l) => l.id === id));
  const setCases = useInquiry((s) => s.setCases);
  const remove = useInquiry((s) => s.remove);
  const { openDrawer, showToast } = useUI();
  // null = follow the saved line (or MOQ); a number once the buyer changes it here.
  const [draft, setDraft] = useState<number | null>(null);
  const cases = draft ?? line?.cases ?? MOQ_CASES;
  const dirty = !line || line.cases !== cases;

  const change = (dir: 1 | -1) => {
    const n = cases + dir * STEP_CASES;
    if (n < MOQ_CASES) return showToast(`MOQ is ${MOQ_CASES} cases per style`);
    setDraft(n);
  };

  const save = () => {
    setCases(id, cases);
    setDraft(null);
    showToast(line ? `${p.name} updated · ${cases * PACK} pairs` : `${p.name} added · ${cases * PACK} pairs`);
  };

  return (
    <div className="rounded-card bg-tile p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="block text-xs font-semibold text-ink-2">Quantity</span>
          <span className="block text-[13px] text-muted tabular-nums">
            {cases} cases · <b className="text-ink">{(cases * PACK).toLocaleString("en-US")} pairs</b>
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-surface p-1" role="group" aria-label="Cases">
          <button type="button" onClick={() => change(-1)} aria-label="Fewer cases" className="hit-44 relative grid size-9 place-items-center rounded-full hover:bg-chip">
            <Icon name="minus" />
          </button>
          <output className="min-w-10 text-center text-[15px] font-extrabold tabular-nums">{cases}</output>
          <button type="button" onClick={() => change(1)} aria-label="More cases" className="hit-44 relative grid size-9 place-items-center rounded-full hover:bg-chip">
            <Icon name="plus" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {dirty ? (
          <button type="button" onClick={save} className="btn btn-dark h-12">
            <Icon name={line ? "check" : "plus"} />
            {line ? "Update inquiry" : "Add to inquiry"}
          </button>
        ) : (
          <button type="button" onClick={() => openDrawer()} className="btn btn-dark h-12">
            <Icon name="list" />
            View inquiry list
          </button>
        )}
        <button type="button" onClick={() => openDrawer()} className="btn btn-line h-12">
          <Icon name="sample" />
          Request a sample
        </button>
      </div>
      {line && (
        <button
          type="button"
          onClick={() => {
            remove(id);
            setDraft(null);
          }}
          className="mt-3 text-xs text-muted underline"
        >
          Remove from inquiry list
        </button>
      )}
    </div>
  );
}
