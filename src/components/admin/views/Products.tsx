"use client";

import clsx from "clsx";
import Image from "next/image";
import { useMemo, useState } from "react";
import { describeProductAction } from "../ai-actions";
import { usePanel, useSaver } from "../panel-data";
import { AdminIcon, Card, Field, SaveBar, Segmented, Sheet, Toggle, useStream } from "../ui";
import { saveProductsAction } from "@/app/admin/content-actions";
import type { PanelProduct } from "@/lib/admin/panel";
import type { ProductEdit } from "@/lib/content/model";
import { LINE_LABEL, type ProductLine } from "@/lib/products";
import { SEASON_IDS, type SeasonId } from "@/lib/season";

/** A style as the view edits it: the catalogue as built, with the saved edits applied. */
type AdminProduct = PanelProduct & {
  live: boolean;
  featured: boolean;
  pins: SeasonId[];
  baseName: string;
  baseDesc: string;
  baseBadge: string | null;
};
type Badge = NonNullable<ProductEdit["badge"]>;

const toItems = (rows: PanelProduct[], edits: Record<string, ProductEdit>): AdminProduct[] =>
  rows.map((p) => {
    const e = edits[p.id] ?? {};
    return {
      ...p,
      baseName: p.name,
      baseDesc: p.desc,
      baseBadge: p.badge,
      name: e.name || p.name,
      desc: e.desc || p.desc,
      badge: e.badge === "none" ? null : (e.badge ?? p.badge),
      live: e.live !== false,
      featured: !!e.featured,
      pins: (e.seasons ?? []).filter((s) => !p.autoSeasons.includes(s)),
    };
  });

/** Only what differs from the catalogue as built is saved. */
const toEdits = (items: AdminProduct[]): Record<string, ProductEdit> =>
  Object.fromEntries(
    items.flatMap((p) => {
      const e: ProductEdit = {
        ...(!p.live && { live: false }),
        ...(p.featured && { featured: true }),
        ...(p.name.trim() && p.name.trim() !== p.baseName && { name: p.name.trim() }),
        ...(p.desc.trim() && p.desc.trim() !== p.baseDesc && { desc: p.desc.trim() }),
        ...(p.badge !== p.baseBadge && { badge: (p.badge ?? "none") as Badge }),
        ...(p.pins.length && { seasons: p.pins }),
      };
      return Object.keys(e).length ? [[p.id, e]] : [];
    }),
  );

const SCENE_BG: Record<string, string> = {
  sage: "bg-[#e6ebe3]",
  sand: "bg-[#efe8dd]",
  blush: "bg-[#f1e6e6]",
  stone: "bg-[#e8e8e6]",
};
const BADGES = ["None", "Top reorder", "New", "Trending"] as const;
const PAGE = 12; // styles shown at a time; "Show more" adds the next lot
type Sort = "asked" | "name" | "featured";
const SORTS: Record<Sort, (a: AdminProduct, b: AdminProduct) => number> = {
  asked: (a, b) => b.inquiries - a.inquiries,
  name: (a, b) => a.name.localeCompare(b.name),
  featured: (a, b) => Number(b.featured) - Number(a.featured) || b.inquiries - a.inquiries,
};

/**
 * The catalogue: what's live, what's featured, which seasons each style leads in, and its listing copy. Cards to
 * browse by eye or a dense list to work down, a page at a time, so the full range never lands at once.
 */
export function Products() {
  const panel = usePanel();
  const initial = useMemo(() => toItems(panel.products, panel.content.products), [panel]);
  const [saved, setSaved] = useState(initial);
  const [items, setItems] = useState(initial);
  const saver = useSaver((v: AdminProduct[]) => saveProductsAction(toEdits(v)), setSaved);
  const [line, setLine] = useState<ProductLine | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("asked");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const { shown, busy } = useStream(draft, run);

  const changes = useMemo(() => items.filter((p, i) => JSON.stringify(p) !== JSON.stringify(saved[i])).length, [items, saved]);
  const edit = (id: string, patch: Partial<AdminProduct>) => setItems((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const found = items.filter((p) => (line === "all" || p.line === line) && (p.name + p.type).toLowerCase().includes(query.toLowerCase())).sort(SORTS[sort]);
  const list = found.slice(0, limit);
  // a new filter or order starts again from the first page
  const fresh =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setLimit(PAGE);
    };
  const open = items.find((p) => p.id === openId) ?? null;
  const max = Math.max(1, ...items.map((p) => p.inquiries));

  return (
    <>
      <Card i={0} className="flex flex-wrap items-center justify-between gap-3 py-4!">
        <Segmented
          label="Line"
          value={line}
          onChange={fresh(setLine)}
          options={[
            { id: "all", label: "All" },
            ...(Object.keys(LINE_LABEL) as ProductLine[]).map((l) => ({
              id: l,
              label: LINE_LABEL[l],
            })),
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex basis-full items-center gap-2 rounded-full bg-white/80 px-4 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink sm:basis-auto">
            <span className="sr-only">Find a style</span>
            <input
              value={query}
              onChange={(e) => fresh(setQuery)(e.target.value)}
              placeholder="Find a style"
              className="min-h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-ink/40 sm:w-44"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => fresh(setSort)(e.target.value as Sort)}
              className="min-h-10 appearance-none rounded-full bg-white/80 pr-9 pl-4 text-[13.5px] font-medium ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink"
            >
              <option value="asked">Most asked</option>
              <option value="name">Name A–Z</option>
              <option value="featured">Featured first</option>
            </select>
            <AdminIcon name="down" className="pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-ink/50" />
          </label>
          <div role="group" aria-label="Layout" className="flex rounded-full bg-ink/[0.06] p-1">
            {(["grid", "list"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={layout === l}
                aria-label={l === "grid" ? "Cards" : "List"}
                onClick={() => setLayout(l)}
                className={clsx(
                  "grid size-9 place-items-center rounded-full transition-colors",
                  layout === l ? "bg-white text-ink shadow-[0_1px_3px_rgb(18_20_22/.15)]" : "text-ink/50 hover:text-ink",
                )}
              >
                <AdminIcon name={l} className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </Card>

      <p className="mt-4 mb-3 px-1 text-[13px] text-ink/55 tabular-nums">
        {found.length} {found.length === 1 ? "style" : "styles"} · {items.filter((p) => p.live).length} live · {items.filter((p) => p.featured).length} featured
        · inquiries in the last 90 days
      </p>

      {layout === "list" ? (
        <Card i={1} className="p-2! sm:p-2!">
          <ul className="divide-y divide-ink/[0.07]">
            {list.map((p) => (
              <li
                key={p.id}
                className={clsx(
                  "grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl px-2 py-2 transition-colors hover:bg-white/60 md:grid-cols-[56px_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:gap-x-5",
                  !p.live && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(p.id)}
                  aria-label={`Edit ${p.name}`}
                  className={clsx("grid size-14 place-items-center rounded-xl", SCENE_BG[p.scene])}
                >
                  <Image src={p.image} alt="" width={56} height={56} className="max-h-[84%] w-auto max-w-[80%] -scale-x-100 object-contain" />
                </button>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold">
                    <span className="truncate">{p.name}</span>
                    {p.badge && <span className="flex-none rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">{p.badge}</span>}
                  </p>
                  <p className="truncate text-[12.5px] text-ink/55">
                    {LINE_LABEL[p.line]} · {p.type}
                  </p>
                </div>
                <div className="hidden items-center gap-3 md:flex">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${(p.inquiries / max) * 100}%` }} />
                  </div>
                  <span className="w-7 text-right text-[12.5px] text-ink/60 tabular-nums">{p.inquiries}</span>
                </div>
                <label className="hidden items-center gap-2 text-[12.5px] font-medium md:flex">
                  <Toggle label={`${p.name} live`} checked={p.live} onChange={(v) => edit(p.id, { live: v })} /> Live
                </label>
                <label className="flex items-center gap-2 text-[12.5px] font-medium">
                  <span className="hidden sm:inline">Featured</span>
                  <Toggle label={`Feature ${p.name}`} checked={p.featured} onChange={(v) => edit(p.id, { featured: v })} />
                </label>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p, i) => (
            <li key={p.id} className="contents">
              <Card i={i + 1} className={clsx("flex flex-col p-3! transition-opacity", !p.live && "opacity-60")}>
                <button
                  type="button"
                  onClick={() => setOpenId(p.id)}
                  className={clsx("group relative grid aspect-[5/4] place-items-center overflow-hidden rounded-[20px]", SCENE_BG[p.scene])}
                  aria-label={`Edit ${p.name}`}
                >
                  <Image
                    src={p.image}
                    alt=""
                    width={260}
                    height={208}
                    className="w-[72%] -scale-x-100 object-contain drop-shadow-[0_14px_14px_rgb(18_20_22/.22)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-1.5 group-hover:-rotate-3"
                  />
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
                    <span className="size-4 flex-none rounded-full ring-2 ring-white" style={{ background: p.hex }} title={p.color} />
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[12px] text-ink/55">
                      <span>Inquiries</span>
                      <span className="tabular-nums">{p.inquiries}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full origin-left rounded-full bg-ink motion-safe:animate-[admin-in_.9s_both]"
                        style={{ width: `${(p.inquiries / max) * 100}%` }}
                      />
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
      )}

      {found.length > list.length ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-white/80 px-5 text-[13.5px] font-semibold ring-1 ring-ink/10 transition-colors hover:bg-white"
          >
            Show {Math.min(PAGE, found.length - list.length)} more
            <span className="font-medium text-ink/50 tabular-nums">
              {list.length} of {found.length}
            </span>
          </button>
        </div>
      ) : (
        !found.length && <p className="mt-6 text-center text-[14px] text-ink/55">No styles match “{query}”.</p>
      )}

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
              <Image
                src={open.image}
                alt={open.name}
                width={320}
                height={180}
                className="h-[80%] w-auto -scale-x-100 object-contain drop-shadow-[0_14px_14px_rgb(18_20_22/.22)]"
              />
            </div>
            <Field label="Style name" value={open.name} max={40} onChange={(v) => edit(open.id, { name: v })} />
            <p className="-mt-3 text-[12px] text-ink/50">
              Its address stays /products/{open.slug}.{" "}
              <a href={`/products/${open.slug}`} target="_blank" rel="noreferrer" className="font-semibold underline">
                View on the site
              </a>
            </p>
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Badge</p>
              <div className="flex flex-wrap gap-2">
                {BADGES.map((b) => {
                  const on = (open.badge ?? "None") === b;
                  const built = (open.baseBadge ?? "None") === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={on}
                      title={built ? "The built-in badge" : undefined}
                      onClick={() => edit(open.id, { badge: b === "None" ? null : b })}
                      className={clsx(
                        "min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                        on ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink",
                      )}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Leads in these seasons</p>
              <p className="mb-2 text-[12px] text-ink/50">Seasons marked auto come from its kind and materials; add others to put it forward then too.</p>
              <div className="flex flex-wrap gap-2">
                {SEASON_IDS.map((s) => {
                  const auto = open.autoSeasons.includes(s);
                  const on = auto || open.pins.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      disabled={auto}
                      onClick={() =>
                        edit(open.id, {
                          pins: on ? open.pins.filter((x) => x !== s) : [...open.pins, s],
                        })
                      }
                      className={clsx(
                        "min-h-9 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors",
                        on ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink",
                      )}
                    >
                      {s}
                      {auto && <span className="ml-1 text-[11px] font-medium opacity-70">auto</span>}
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
                  onClick={async () => {
                    setDraft("…");
                    const text = await describeProductAction(open.id, open.name);
                    setDraft(text);
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
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-ink/60 hover:text-ink"
                  >
                    Keep mine
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <SaveBar
        count={changes}
        pending={saver.pending}
        error={saver.error}
        onDiscard={() => (setItems(saved), saver.clearError())}
        onSave={() => saver.save(items)}
      />
    </>
  );
}
