"use client";

import clsx from "clsx";
import Image from "next/image";
import { useMemo, useState } from "react";
import { describeProduct } from "../ai";
import { PRODUCTS, SEASON_IDS, type AdminProduct } from "../data";
import { AdminIcon, Card, Field, SaveBar, Segmented, Sheet, Toggle, useStream } from "../ui";
import { LINE_LABEL, type ProductLine } from "@/lib/products";

const SCENE_BG: Record<AdminProduct["scene"], string> = { sage: "bg-[#e6ebe3]", sand: "bg-[#efe8dd]", blush: "bg-[#f1e6e6]", stone: "bg-[#e8e8e6]" };
const BADGES = ["None", "Top reorder", "New", "Trending"] as const;

/** The catalogue: what's live, what's featured, which seasons each style leads in, and its listing copy. */
export function Products() {
  const [saved, setSaved] = useState(PRODUCTS);
  const [items, setItems] = useState(PRODUCTS);
  const [line, setLine] = useState<ProductLine | "all">("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const { shown, busy } = useStream(draft, run);

  const changes = useMemo(() => items.filter((p, i) => JSON.stringify(p) !== JSON.stringify(saved[i])).length, [items, saved]);
  const edit = (id: string, patch: Partial<AdminProduct>) => setItems((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const list = items.filter((p) => (line === "all" || p.line === line) && (p.name + p.type).toLowerCase().includes(query.toLowerCase()));
  const open = items.find((p) => p.id === openId) ?? null;
  const max = Math.max(...items.map((p) => p.inquiries));

  return (
    <>
      <Card i={0} className="flex flex-wrap items-center justify-between gap-3 py-4!">
        <Segmented
          label="Line"
          value={line}
          onChange={setLine}
          options={[{ id: "all", label: "All" }, ...(Object.keys(LINE_LABEL) as ProductLine[]).map((l) => ({ id: l, label: LINE_LABEL[l] }))]}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-full bg-white/80 px-4 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
            <span className="sr-only">Find a style</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a style" className="min-h-10 w-44 bg-transparent text-[14px] outline-none placeholder:text-ink/40" />
          </label>
          <span className="text-[13px] text-ink/55 tabular-nums">
            {items.filter((p) => p.live).length} live · {items.filter((p) => p.featured).length} featured
          </span>
        </div>
      </Card>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((p, i) => (
          <li key={p.id} className="contents">
            <Card i={i + 1} className={clsx("flex flex-col p-3! transition-opacity", !p.live && "opacity-60")}>
              <button type="button" onClick={() => setOpenId(p.id)} className={clsx("group relative grid aspect-[5/4] place-items-center overflow-hidden rounded-[20px]", SCENE_BG[p.scene])} aria-label={`Edit ${p.name}`}>
                <Image src={p.outer.src} alt="" width={260} height={208} className="w-[72%] -scale-x-100 object-contain drop-shadow-[0_14px_14px_rgb(18_20_22/.22)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1.5 group-hover:-rotate-3" />
                {p.badge && <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">{p.badge}</span>}
              </button>
              <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{p.name}</p>
                    <p className="truncate text-[12.5px] text-ink/55">
                      {LINE_LABEL[p.line]} · {p.type}
                    </p>
                  </div>
                  <span className="size-4 flex-none rounded-full ring-2 ring-white" style={{ background: p.color.hex }} title={p.color.name} />
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[12px] text-ink/55">
                    <span>Inquiries</span>
                    <span className="tabular-nums">{p.inquiries}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full origin-left rounded-full bg-ink motion-safe:animate-[admin-in_.9s_both]" style={{ width: `${(p.inquiries / max) * 100}%` }} />
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12.5px] font-medium">
                  <label className="flex items-center gap-2">
                    <Toggle label={`${p.name} live`} checked={p.live} onChange={(v) => edit(p.id, { live: v })} /> Live
                  </label>
                  <label className="flex items-center gap-2">
                    Featured <Toggle label={`Feature ${p.name}`} checked={p.featured} onChange={(v) => edit(p.id, { featured: v })} />
                  </label>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Sheet
        open={!!open}
        onClose={() => {
          setOpenId(null);
          setDraft(null);
        }}
        title={open ? `Edit ${open.name}` : "Edit style"}
      >
        {open && (
          <div className="grid gap-5">
            <div className={clsx("grid aspect-[16/9] place-items-center rounded-3xl", SCENE_BG[open.scene])}>
              <Image src={open.outer.src} alt={open.name} width={320} height={180} className="h-[80%] w-auto -scale-x-100 object-contain drop-shadow-[0_14px_14px_rgb(18_20_22/.22)]" />
            </div>
            <Field label="Style name" value={open.name} max={24} onChange={(v) => edit(open.id, { name: v })} />
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Badge</p>
              <div className="flex flex-wrap gap-2">
                {BADGES.map((b) => {
                  const on = (open.badge ?? "None") === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={on}
                      onClick={() => edit(open.id, { badge: b === "None" ? undefined : b })}
                      className={clsx("min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors", on ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink")}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Leads in these seasons</p>
              <div className="flex flex-wrap gap-2">
                {SEASON_IDS.map((s) => {
                  const on = open.seasons.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => edit(open.id, { seasons: on ? open.seasons.filter((x) => x !== s) : [...open.seasons, s] })}
                      className={clsx("min-h-9 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors", on ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink")}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[12.5px] font-semibold text-ink/70">Listing description</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(describeProduct(open.name, open.type, open.rating));
                    setRun((r) => r + 1);
                  }}
                  className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
                >
                  <AdminIcon name="sparkle" className="size-4" /> {busy ? "Writing…" : "Write with AI"}
                </button>
              </div>
              <textarea
                aria-label="Listing description"
                rows={6}
                readOnly={!!draft}
                value={draft ? shown : open.desc}
                onChange={(e) => edit(open.id, { desc: e.target.value })}
                className={clsx(
                  "w-full resize-none rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed ring-1 outline-none focus:ring-2 focus:ring-ink",
                  draft ? "bg-ink/[0.04] ring-ink/20" : "bg-white/80 ring-ink/10",
                )}
              />
              {draft && !busy && (
                <div className="mt-2 flex gap-2 motion-safe:animate-[admin-in_.35s_both]">
                  <button
                    type="button"
                    onClick={() => {
                      edit(open.id, { desc: shown });
                      setDraft(null);
                    }}
                    className="min-h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
                  >
                    Use this
                  </button>
                  <button type="button" onClick={() => setDraft(null)} className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-ink/60 hover:text-ink">
                    Keep mine
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <SaveBar count={changes} onDiscard={() => setItems(saved)} onSave={() => setSaved(items)} />
    </>
  );
}
