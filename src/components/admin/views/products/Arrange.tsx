"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState } from "react";
import { AdminIcon } from "../../ui";
import { SCENE_BG } from "./PhotoField";
import type { Item } from "@/lib/admin/product-draft";
import { DEFAULT_ARRIVALS, DEFAULT_HOT, MAX_ARRIVALS, MAX_HOT } from "@/lib/merch";
import { LINE_LABEL } from "@/lib/products";

export type Merch = { hot: string[]; arrivals: string[]; order: string[] };

/**
 * Products → Arrange: which styles the home page's two showcases hold, and the order featured styles come in across the
 * site. Lists are drafts until saved, like everything else in the panel.
 */
export function Arrange({ items, value, onSave, pending, error }: { items: Item[]; value: Merch; onSave: (m: Merch) => void; pending: boolean; error: string | null }) {
  const [m, setM] = useState<Merch>(value);
  const live = items.filter((p) => p.live);
  const bySlug = (slugs: string[]) => slugs.flatMap((s) => live.filter((p) => p.slug === s).map((p) => p.id));
  const featured = live.filter((p) => p.featured);
  // the featured styles in the saved order, then any newly featured ones
  const order = [...m.order.filter((id) => featured.some((p) => p.id === id)), ...featured.filter((p) => !m.order.includes(p.id)).map((p) => p.id)];
  const dirty = JSON.stringify({ ...m, order }) !== JSON.stringify({ ...value, order: [...value.order.filter((id) => featured.some((p) => p.id === id)), ...featured.filter((p) => !value.order.includes(p.id)).map((p) => p.id)] });
  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="rounded-2xl bg-danger px-4 py-2.5 text-[13.5px] font-medium text-white">
          {error}
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        <List
          title="The styles buyers reorder"
          sub={`Home page deck, up to ${MAX_HOT}. Empty: the season's styles first, topped up from the reorder list.`}
          ids={m.hot}
          max={MAX_HOT}
          items={live}
          onChange={(hot) => setM({ ...m, hot })}
          start={() => setM({ ...m, hot: bySlug(DEFAULT_HOT) })}
        />
        <List
          title="New arrivals"
          sub={`Home page panels, up to ${MAX_ARRIVALS}. Empty: the built-in list, the season's best first.`}
          ids={m.arrivals}
          max={MAX_ARRIVALS}
          items={live}
          onChange={(arrivals) => setM({ ...m, arrivals })}
          start={() => setM({ ...m, arrivals: bySlug(DEFAULT_ARRIVALS) })}
        />
        <List
          title="Featured order"
          sub="Featured styles lead the catalogue and every list on the site, in this order. Feature or unfeature styles in the list."
          ids={order}
          items={live}
          fixed
          onChange={(o) => setM({ ...m, order: o })}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-[13px] text-ink/55">Unsaved changes</span>}
        <button type="button" disabled={!dirty || pending} onClick={() => onSave({ ...m, order })} className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-40">
          {pending ? "Publishing…" : "Publish arrangement"}
        </button>
      </div>
    </div>
  );
}

function List({ title, sub, ids, max, items, onChange, start, fixed = false }: { title: string; sub: string; ids: string[]; max?: number; items: Item[]; onChange: (ids: string[]) => void; start?: () => void; fixed?: boolean }) {
  const rows = ids.flatMap((id) => items.filter((p) => p.id === id));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = rows.map((p) => p.id);
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
  const [drag, setDrag] = useState<number | null>(null);
  return (
    <section aria-label={title} className="rounded-[24px] bg-white/80 p-4 ring-1 ring-white">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-ink/55">{sub}</p>
      {rows.length ? (
        <ol className="mt-3 grid gap-1.5">
          {rows.map((p, i) => (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => {
                e.preventDefault();
                if (drag !== null && drag !== i) {
                  move(drag, i);
                  setDrag(i);
                }
              }}
              onDragEnd={() => setDrag(null)}
              className={clsx("flex items-center gap-2 rounded-2xl bg-ink/[0.035] py-1.5 pr-1.5 pl-2", drag === i && "opacity-50")}
            >
              <span className="w-5 text-[12px] text-ink/40 tabular-nums">{i + 1}</span>
              <span className={clsx("relative size-10 flex-none rounded-lg", SCENE_BG[p.scene])}>{p.outer.src && <Image src={p.outer.src} alt="" fill sizes="40px" className="object-contain p-0.5" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                <span className="block truncate text-[11.5px] text-ink/50">
                  {LINE_LABEL[p.line]} · {p.type}
                </span>
              </span>
              <button type="button" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-8 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-25">
                <AdminIcon name="up" className="size-4" />
              </button>
              <button type="button" aria-label={`Move ${p.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} className="grid size-8 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-25">
                <AdminIcon name="down" className="size-4" />
              </button>
              {!fixed && (
                <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(rows.filter((x) => x.id !== p.id).map((x) => x.id))} className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] hover:text-ink">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[2.2]">
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-3 rounded-2xl bg-ink/[0.035] px-3 py-3 text-[13px] text-ink/60">
          {fixed ? "No featured styles yet." : "Automatic."}
          {start && (
            <button type="button" onClick={start} className="ml-2 font-semibold text-ink underline">
              Start from what shows now
            </button>
          )}
        </div>
      )}
      {!fixed && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            aria-label={`Add a style to ${title}`}
            value=""
            disabled={!!max && rows.length >= max}
            onChange={(e) => e.target.value && onChange([...rows.map((x) => x.id), e.target.value])}
            className="min-h-9 flex-1 rounded-full bg-white px-3 text-[13px] ring-1 ring-ink/10 outline-none disabled:opacity-50"
          >
            <option value="">{max && rows.length >= max ? `Full (${max})` : "Add a style…"}</option>
            {items
              .filter((p) => !rows.some((r) => r.id === p.id))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {LINE_LABEL[p.line]} · {p.type}
                </option>
              ))}
          </select>
          {rows.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="min-h-9 px-2 text-[12.5px] font-semibold text-ink/60 hover:text-ink">
              Back to automatic
            </button>
          )}
        </div>
      )}
    </section>
  );
}
