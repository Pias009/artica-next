"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePanel, useSaver } from "../panel-data";
import { AdminIcon, SaveBar, Segmented, Toggle } from "../ui";
import { SCENE_BG, type LibraryPhoto } from "./products/PhotoField";
import { FullPage, ProductAside, ProductForm } from "./products/ProductForm";
import { saveProductsAction } from "@/app/admin/content-actions";
import { autofill, blankDraft, fromTemplate, problems, toItem, toPayload, uniqueSlug, vocabOf, type Item } from "@/lib/admin/product-draft";
import { categoryFor } from "@/lib/product-categories";
import type { StyleFlag, StyleStats } from "@/lib/admin/panel";
import { quality, suggestions, type Suggestion } from "@/lib/admin/product-insights";
import { hasPrice, usd, type PriceList, type PriceRow } from "@/lib/admin/prices";
import { savePricesAction } from "@/app/admin/content-actions";
import { PriceFields } from "./products/PriceFields";
import { AvailabilityFields } from "./products/AvailabilityFields";
import { Arrange, type Merch } from "./products/Arrange";
import { StyleHistory } from "./products/StyleHistory";
import { saveMerchAction } from "@/app/admin/content-actions";
import { saveAvailabilityAction } from "@/app/admin/content-actions";
import { describe as describeAvail, type Availability } from "@/lib/availability";
import { LINE_LABEL, type ProductLine } from "@/lib/products";
import { SEASON_IDS, SEASONS, type SeasonId } from "@/lib/season";

type Sort = "name" | "asked" | "featured" | "category" | "viewed" | "added" | "rising";
type Status = "all" | "live" | "hidden" | "featured" | "added" | "attention" | "rising" | "incomplete" | "noprice" | "soldout" | "special";

const ZERO: StyleStats = { views: 0, adds: 0, inquiries: 0, before: 0, won: 0, flags: [] };
type Stat = (p: Item) => StyleStats;

const SORTS: Record<Sort, (st: Stat) => (a: Item, b: Item) => number> = {
  name: () => (a, b) => a.name.localeCompare(b.name),
  asked: () => (a, b) => b.inquiries - a.inquiries || a.name.localeCompare(b.name),
  featured: () => (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
  category: () => (a, b) => categoryFor(a).localeCompare(categoryFor(b)) || a.name.localeCompare(b.name),
  viewed: (st) => (a, b) => st(b).views - st(a).views || a.name.localeCompare(b.name),
  added: (st) => (a, b) => st(b).adds - st(a).adds || st(b).views - st(a).views,
  rising: (st) => (a, b) => st(b).inquiries - st(b).before - (st(a).inquiries - st(a).before) || st(b).inquiries - st(a).inquiries,
};
const STATUS: Record<Status, { label: string; test: (p: Item, st: Stat, prices: PriceList, avail: Record<string, Availability>) => boolean }> = {
  all: { label: "All statuses", test: () => true },
  live: { label: "Live", test: (p) => p.live },
  hidden: { label: "Hidden", test: (p) => !p.live },
  featured: { label: "Featured", test: (p) => p.featured },
  added: { label: "Added here", test: (p) => p.added },
  rising: { label: "Rising interest", test: (p, st) => st(p).flags.includes("rising") },
  attention: { label: "Needs attention", test: (p, st) => p.live && st(p).flags.some((f) => f !== "rising") },
  incomplete: { label: "Listing incomplete", test: (p) => quality(p).score < 100 },
  noprice: { label: "No price yet", test: (p, _st, prices) => !hasPrice(prices[p.id]) },
  special: { label: "In stock or in production", test: (p, _s, _p, avail) => avail[p.id]?.status === "stock" || avail[p.id]?.status === "production" },
  soldout: { label: "Sold out", test: (p, _s, _p, avail) => avail[p.id]?.status === "soldout" },
};

/** What each flag means, in a few words, for the list and the style's page. */
export const FLAG: Record<StyleFlag, { label: string; tone: string; tip: string }> = {
  rising: { label: "Rising", tone: "bg-[#2f8f5b]/12 text-[#21734a]", tip: "More inquiries this month than last. Feature it, or give it the Trending badge." },
  falling: { label: "Falling", tone: "bg-[#b45309]/12 text-[#92400e]", tip: "Half the inquiries of last month or fewer. Out of season, or a new photo or name may help." },
  "looked-not-asked": { label: "Looked at, not asked for", tone: "bg-danger/10 text-danger", tip: "Opened often but never added or asked about: check its photo, description and colours." },
  "no-views": { label: "Nobody opened it", tone: "bg-ink/[0.07] text-ink/60", tip: "No visits to its page in 30 days. Feature it, pin it to a season, or think about hiding it." },
};

const same = (a: Item, b?: Item) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The whole catalogue as a list to filter and work down (/admin/products), with a full page to edit any style
 * (/admin/products/<id>) or add a new one (/admin/products/new). Mounted by their shared layout, so drafts survive
 * moving between them. Edits stay drafts until published; a new style is published from its own page, on its own.
 */
export function Products() {
  const panel = usePanel();
  const st: Stat = (p) => panel.styleStats?.[p.id] ?? ZERO;
  const initial = useMemo(() => panel.products.map((r) => toItem(r, panel.content.products[r.id])), [panel.products, panel.content.products]);
  const [saved, setSaved] = useState(initial);
  const [items, setItems] = useState(initial);
  const afterSave = useRef<(() => void) | null>(null);
  const saver = useSaver(
    (v: Item[]) => saveProductsAction(toPayload(v)),
    (v) => {
      setSaved(v);
      // what was saved on its own (a new style, a deletion) joins the drafts; other drafts stay as they are
      setItems((cur) => [...cur.filter((c) => !c.added || v.some((x) => x.id === c.id)), ...v.filter((x) => !cur.some((c) => c.id === x.id))]);
      afterSave.current?.();
      afterSave.current = null;
    },
  );

  const router = useRouter();
  // what follows /admin/products/: "new", a style's id, or nothing for the list
  const sub = usePathname().split("/")[3] ?? "";
  const [line, setLine] = useState<ProductLine | "all">("all");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(blankDraft);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  // which style's Delete has been pressed once, so asking on one never carries over to another
  const [confirming, setConfirming] = useState<string | null>(null);
  // the desk's private prices: saved on their own, straight away (they change nothing on the site)
  const [prices, setPrices] = useState<PriceList>(() => panel.content.prices ?? {});
  const priceSaver = useSaver(
    (rows: Record<string, PriceRow>) => savePricesAction(rows),
    (rows) => setPrices((cur) => ({ ...cur, ...rows })),
    "Prices saved. They stay private: only the panel and reply drafts use them.",
  );
  // availability: saved on its own, straight away, and shown on the site
  const [avail, setAvail] = useState<Record<string, Availability>>(() => panel.content.availability ?? {});
  const availSaver = useSaver(
    (rows: Record<string, Availability>) => saveAvailabilityAction(rows),
    (rows) => setAvail((cur) => ({ ...cur, ...rows })),
    "Availability saved. The site shows it on the next page load.",
  );
  // the home page's showcases and the featured order (Products → Arrange)
  const [merch, setMerch] = useState<Merch>(() => panel.content.merch ?? { hot: [], arrivals: [], order: [] });
  const merchSaver = useSaver((m: Merch) => saveMerchAction(m), setMerch);
  // the styles ticked in the list, for changing many at once, and the filters they were ticked under
  const [ticked, setTicked] = useState<{ under: string; ids: ReadonlySet<string> }>({ under: "", ids: new Set() });

  const vocab = useMemo(() => vocabOf(items), [items]);
  const library = useMemo<LibraryPhoto[]>(() => items.flatMap((p) => [p.outer, ...(p.zip ? [p.zip] : [])].map((s) => ({ ...s, name: p.name }))), [items]);
  const changes = useMemo(() => items.filter((p) => !same(p, saved.find((s) => s.id === p.id))).length, [items, saved]);
  const edit = (id: string, patch: Partial<Item>) => setItems((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const leave = () => router.push("/admin/products");

  // nothing to lose by leaving the page unless there are drafts
  const dirty = changes > 0 || !!draft.name.trim() || !!draft.type.trim() || !!draft.outer.src;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ---------- the add page ---------- */

  const changeDraft = (patch: Partial<Item>, keys: string[] = []) => {
    const next = new Set([...touched, ...keys]);
    setTouched(next);
    const merged = autofill({ ...draft, ...patch }, next, items, vocab);
    setDraft({ ...merged, slug: uniqueSlug(merged.name, items.map((p) => p.slug)) });
  };

  if (sub === "new") {
    const missing = problems(draft, items);
    const publish = (live: boolean) => {
      afterSave.current = () => {
        setDraft(blankDraft());
        setTouched(new Set());
        leave();
      };
      saver.save([...saved, { ...draft, live }]);
    };
    return (
      <FullPage
        title={draft.name.trim() || "New product"}
        sub={draft.name.trim() ? "New product" : "Fill in what you know: the rest suggests itself as you go."}
        actions={
          <>
            <button type="button" disabled={!!missing.length || saver.pending} onClick={() => publish(false)} className="min-h-10 rounded-full bg-white px-4 text-[13.5px] font-semibold ring-1 ring-ink/10 disabled:opacity-50">
              Save hidden
            </button>
            <button type="button" disabled={!!missing.length || saver.pending} onClick={() => publish(true)} className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-50">
              {saver.pending ? "Publishing…" : "Publish product"}
            </button>
          </>
        }
      >
        {saver.error && <ErrorNote text={saver.error} />}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ProductForm
            item={draft}
            others={items}
            vocab={vocab}
            library={library}
            adding
            touched={touched}
            onChange={changeDraft}
            onTemplate={(t) => {
              const { item, touched: keys } = fromTemplate(draft, t);
              const next = new Set(keys);
              setTouched(next);
              setDraft(autofill(item, next, items, vocab));
            }}
          />
          <ProductAside item={draft} others={items} adding missing={missing} />
        </div>
      </FullPage>
    );
  }

  /* ---------- arranging the home page's showcases ---------- */

  if (sub === "arrange") {
    return (
      <FullPage title="Arrange" sub="What the home page puts forward, and the order featured styles come in." actions={null}>
        <Arrange items={items} value={merch} onSave={merchSaver.save} pending={merchSaver.pending} error={merchSaver.error} />
      </FullPage>
    );
  }

  /* ---------- the edit page ---------- */

  const open = sub ? items.find((p) => p.id === sub) : null;
  if (open) {
    const others = items.filter((p) => p.id !== open.id);
    const missing = problems(open, items);
    const onSite = saved.find((s) => s.id === open.id);
    const edited = !open.added && JSON.stringify(toPayload([{ ...open, live: true, featured: false, pins: [] }]).edits) !== "{}";
    return (
      <FullPage
        title={open.name || "Untitled style"}
        sub={`${LINE_LABEL[open.line]} · ${categoryFor(open)}${open.added ? " · added here" : ""}`}
        actions={
          <>
            <label className="flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium">
              <Toggle label={`${open.name} live`} checked={open.live} onChange={(v) => edit(open.id, { live: v })} /> Live
            </label>
            <label className="flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium">
              <Toggle label={`Feature ${open.name}`} checked={open.featured} onChange={(v) => edit(open.id, { featured: v })} /> Featured
            </label>
            {onSite?.live && (
              <a href={`/products/${open.slug}`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center rounded-full bg-white px-4 text-[13.5px] font-semibold ring-1 ring-ink/10">
                View on site
              </a>
            )}
            {edited && (
              <button type="button" onClick={() => edit(open.id, { ...toItem({ base: open.base, added: false, inquiries: open.inquiries }), live: open.live, featured: open.featured, pins: open.pins })} className="min-h-10 rounded-full px-3 text-[13.5px] font-semibold text-ink/60 hover:text-ink">
                Restore original
              </button>
            )}
            {open.added &&
              (confirming === open.id ? (
                <button
                  type="button"
                  disabled={saver.pending}
                  onClick={() => {
                    afterSave.current = leave;
                    saver.save(saved.filter((s) => s.id !== open.id));
                  }}
                  className="min-h-10 rounded-full bg-danger px-4 text-[13.5px] font-semibold text-white disabled:opacity-60"
                >
                  {saver.pending ? "Deleting…" : "Delete for good"}
                </button>
              ) : (
                <button type="button" onClick={() => setConfirming(open.id)} className="min-h-10 rounded-full px-3 text-[13.5px] font-semibold text-danger hover:bg-danger/[0.06]">
                  Delete
                </button>
              ))}
            <button type="button" disabled={!changes || !!missing.length || saver.pending} onClick={() => saver.save(items)} className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-50">
              {saver.pending ? "Publishing…" : changes ? `Publish ${changes} ${changes === 1 ? "change" : "changes"}` : "Published"}
            </button>
          </>
        }
      >
        {saver.error && <ErrorNote text={saver.error} />}
        <Performance s={st(open)} total={open.inquiries} live={open.live} listing={quality(open)} />
        <section aria-label="Availability" className="mb-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-white">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-semibold">Availability</h2>
            <span className="text-[12px] text-ink/50">Shown on its page and cards, and in Kai&apos;s answers. Saved straight away.</span>
          </div>
          {availSaver.error && <ErrorNote text={availSaver.error} />}
          <AvailabilityFields key={JSON.stringify(avail[open.id] ?? {})} value={avail[open.id]} pending={availSaver.pending} onSave={(a) => availSaver.save({ [open.id]: a })} />
        </section>
        <section aria-label="Your prices" className="mb-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-white">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-semibold">Your prices</h2>
            <span className="text-[12px] text-ink/50">Per pair, USD FOB. Private: never shown on the site; Kai&apos;s reply drafts and quotes use them.</span>
          </div>
          {priceSaver.error && <ErrorNote text={priceSaver.error} />}
          <PriceFields key={JSON.stringify(prices[open.id] ?? {})} value={prices[open.id]} pending={priceSaver.pending} onSave={(row) => priceSaver.save({ [open.id]: row })} />
        </section>
        {!open.added || saved.some((x) => x.id === open.id) ? <StyleHistory key={open.id} id={open.id} name={open.name} /> : null}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ProductForm item={open} others={others} vocab={vocab} library={library} adding={false} onChange={(patch) => edit(open.id, patch)} />
          <ProductAside item={open} others={others} adding={false} missing={missing} />
        </div>
      </FullPage>
    );
  }

  if (sub) {
    return (
      <FullPage title="Product not found" actions={null}>
        <p className="text-[14px] text-ink/60">No product has this address. It may have been deleted.</p>
      </FullPage>
    );
  }

  /* ---------- the list ---------- */

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const passes = (p: Item, skipCategory = false) =>
    (line === "all" || p.line === line) &&
    STATUS[status].test(p, st, prices, avail) &&
    (skipCategory || !category || categoryFor(p) === category) &&
    words.every((w) => [p.name, p.type, categoryFor(p), p.color.name, p.spec, ...p.tags].join(" ").toLowerCase().includes(w));
  const found = items.filter((p) => passes(p)).sort(SORTS[sort](st));
  // each category's count follows the other filters, so a chip never promises what clicking it won't show
  const counts = new Map<string, number>();
  for (const p of items) if (passes(p, true)) counts.set(categoryFor(p), (counts.get(categoryFor(p)) ?? 0) + 1);
  const chips = [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const maxViews = Math.max(1, ...items.map((p) => st(p).views));
  // a selection belongs to the filters it was made under: changing them starts afresh, so nothing out of view is
  // ever changed; changing the ticked styles themselves (hiding them under "Live") keeps the selection
  const under = JSON.stringify([line, category, status, words]);
  const picked: ReadonlySet<string> = ticked.under === under ? ticked.ids : new Set();
  const setPicked = (ids: ReadonlySet<string>) => setTicked({ under, ids });
  const chosen = items.filter((p) => picked.has(p.id));
  const allPicked = found.length > 0 && found.every((p) => picked.has(p.id));
  const tick = (id: string, on: boolean) => setPicked(on ? new Set([...picked, id]) : new Set([...picked].filter((x) => x !== id)));
  const bulk = (patch: (p: Item) => Partial<Item>) => setItems((all) => all.map((p) => (chosen.some((c) => c.id === p.id) ? { ...p, ...patch(p) } : p)));

  return (
    <>
      <div className="z-20 rounded-[24px] bg-white/85 p-3 shadow-[0_14px_34px_-22px_rgb(18_20_22/.5)] ring-1 ring-white backdrop-blur-xl lg:sticky lg:top-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented<ProductLine | "all">
            label="Line"
            value={line}
            onChange={setLine}
            options={[{ id: "all", label: "All" }, ...(Object.keys(LINE_LABEL) as ProductLine[]).map((l) => ({ id: l, label: LINE_LABEL[l] }))]}
          />
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
            <span className="sr-only">Find a style</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find by name, type, colour or material" className="min-h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-ink/40" />
          </label>
          <Select label="Status" value={status} onChange={setStatus} options={(Object.keys(STATUS) as Status[]).map((s) => [s, STATUS[s].label])} />
          <Select
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              ["name", "Name A–Z"],
              ["asked", "Most asked (90 days)"],
              ["viewed", "Most viewed"],
              ["added", "Most added to lists"],
              ["rising", "Rising interest"],
              ["featured", "Featured first"],
              ["category", "Category"],
            ]}
          />
          <Link href="/admin/products/arrange" prefetch={false} className="flex min-h-10 flex-none items-center rounded-full bg-white px-4 text-[13.5px] font-semibold ring-1 ring-ink/10 hover:bg-ink/[0.03]">
            Arrange
          </Link>
          <Link href="/admin/products/new" prefetch={false} className="flex min-h-10 flex-none items-center gap-1.5 rounded-full bg-ink pr-4 pl-3 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[.98]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[2.2]">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            {draft.name.trim() ? "Continue new product" : "Add product"}
          </Link>
        </div>
        <div role="group" aria-label="Category" className="mt-2.5 flex flex-wrap gap-1.5">
          {[["All categories", total, null] as const, ...chips.map(([c, n]) => [c, n, c] as const)].map(([label, n, id]) => (
            <button
              key={label}
              type="button"
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              className={clsx("flex min-h-8 flex-none items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold whitespace-nowrap transition-colors", category === id ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/70 hover:text-ink")}
            >
              {label} <span className={clsx("font-medium tabular-nums", category === id ? "text-white/65" : "text-ink/45")}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      <Suggestions
        items={items}
        list={suggestions(items, (id) => panel.styleStats?.[id] ?? ZERO, panel.visitors?.searches)}
        onApply={(a) => edit(a.id, { ...a.patch, badge: a.patch.badge === null ? undefined : (a.patch.badge as Item["badge"]) ?? items.find((p) => p.id === a.id)?.badge })}
        onShowIncomplete={() => setStatus("incomplete")}
      />

      <p className="mt-3 mb-2 px-2 text-[13px] text-ink/55 tabular-nums">
        {found.length} {found.length === 1 ? "style" : "styles"} · {items.filter((p) => p.live).length} live · {items.filter((p) => p.featured).length} featured · interest over the last 30 days
      </p>

      {chosen.length > 0 && (
        <BulkBar
          ids={chosen.filter((p) => p.live).map((p) => p.id)}
          onPrices={(row) => priceSaver.save(Object.fromEntries(chosen.map((p) => [p.id, row])))}
          onAvailability={(a) => availSaver.save(Object.fromEntries(chosen.map((p) => [p.id, a])))}
          availPending={availSaver.pending}
          pricePending={priceSaver.pending}
          count={chosen.length}
          deletable={chosen.filter((p) => p.added).length}
          pending={saver.pending}
          onClear={() => setPicked(new Set())}
          onPatch={bulk}
          onDelete={() => {
            const gone = new Set(chosen.filter((p) => p.added).map((p) => p.id));
            afterSave.current = () => setPicked(new Set());
            saver.save(saved.filter((x) => !gone.has(x.id)));
          }}
        />
      )}

      <div className="overflow-hidden rounded-[24px] bg-white/70 ring-1 ring-white">
        <table className="w-full border-collapse text-left">
          <thead className="text-[12px] font-semibold text-ink/50">
            <tr className="border-b border-ink/[0.08]">
              <th scope="col" className="w-10 py-3 pl-4">
                <input
                  type="checkbox"
                  aria-label={allPicked ? "Untick all" : `Tick all ${found.length} shown`}
                  checked={allPicked}
                  ref={(el) => {
                    if (el) el.indeterminate = found.some((p) => picked.has(p.id)) && !allPicked;
                  }}
                  onChange={(e) => setPicked(e.target.checked ? new Set([...picked, ...found.map((p) => p.id)]) : new Set([...picked].filter((id) => !found.some((p) => p.id === id))))}
                  className="size-4 accent-ink"
                />
              </th>
              <th scope="col" className="py-3 pl-2 font-semibold">
                Style
              </th>
              <th scope="col" className="hidden px-3 font-semibold lg:table-cell">
                Category
              </th>
              <th scope="col" className="hidden px-3 font-semibold xl:table-cell">
                Colour
              </th>
              <th scope="col" className="hidden px-3 font-semibold xl:table-cell">
                Sizes
              </th>
              <th scope="col" className="hidden px-3 font-semibold md:table-cell" title="Last 30 days: visits that opened it, that added it to their list, and inquiries naming it">
                Viewed · Added · Asked
              </th>
              <th scope="col" className="hidden px-3 font-semibold lg:table-cell" title="Your price per pair at 300+ pairs (private)">
                Price
              </th>
              <th scope="col" className="hidden px-3 font-semibold sm:table-cell">
                Live
              </th>
              <th scope="col" className="px-3 pr-4 font-semibold">
                Featured
              </th>
            </tr>
          </thead>
          <tbody>
            {found.map((p) => (
              <tr key={p.id} className={clsx("border-b border-ink/[0.06] transition-colors last:border-0 hover:bg-white/70", !same(p, saved.find((s) => s.id === p.id)) && "bg-[#b45309]/[0.06]")}>
                <td className="py-2 pl-4">
                  <input type="checkbox" aria-label={`Tick ${p.name}`} checked={picked.has(p.id)} onChange={(e) => tick(p.id, e.target.checked)} className="size-4 accent-ink" />
                </td>
                <td className="py-2 pl-2">
                  <Link href={`/admin/products/${p.id}`} prefetch={false} scroll={false} className="flex min-w-0 items-center gap-3 rounded-xl" aria-label={`Edit ${p.name}`}>
                    <span className={clsx("relative block size-14 flex-none rounded-xl", SCENE_BG[p.scene], !p.live && "opacity-50")}>
                      {p.outer.src && <Image src={p.outer.src} alt="" fill sizes="56px" className="object-contain p-1" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14.5px] font-semibold">
                        {p.name}
                        {p.badge && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">{p.badge}</span>}
                        {!p.live && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-semibold text-ink/60">Hidden</span>}
                        {p.added && <span className="rounded-full bg-[#2f8f5b]/12 px-2 py-0.5 text-[11px] font-semibold text-[#21734a]">Added here</span>}
                        {avail[p.id] && avail[p.id].status !== "order" && (
                          <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", avail[p.id].status === "soldout" ? "bg-[#b45309]/12 text-[#92400e]" : "bg-[#2563eb]/10 text-[#1e40af]")}>
                            {describeAvail(avail[p.id]).label}
                          </span>
                        )}
                      </span>
                      <span className="block text-[12.5px] text-ink/55">
                        {LINE_LABEL[p.line]} · {p.type}
                        {quality(p).score < 100 && <span className="ml-1.5 font-semibold text-[#92400e]">· listing {quality(p).score}%</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 text-[13px] text-ink/70 lg:table-cell">{categoryFor(p)}</td>
                <td className="hidden px-3 xl:table-cell">
                  <span className="flex items-center gap-2 text-[13px] text-ink/70">
                    <span className="size-3.5 flex-none rounded-full ring-1 ring-ink/15" style={{ background: p.color.hex }} />
                    {p.color.name}
                  </span>
                </td>
                <td className="hidden px-3 text-[13px] whitespace-nowrap text-ink/70 xl:table-cell">{p.sizes}</td>
                <td className="hidden px-3 md:table-cell">
                  <Interest s={st(p)} max={maxViews} live={p.live} />
                </td>
                <td className="hidden px-3 text-[13px] whitespace-nowrap tabular-nums lg:table-cell">
                  {prices[p.id]?.t300 ? usd(prices[p.id].t300!) : hasPrice(prices[p.id]) ? <span className="text-ink/60">from tier</span> : <span className="text-ink/35">–</span>}
                </td>
                <td className="hidden px-3 sm:table-cell">
                  <Toggle label={`${p.name} live`} checked={p.live} onChange={(v) => edit(p.id, { live: v })} />
                </td>
                <td className="px-3 pr-4">
                  <Toggle label={`Feature ${p.name}`} checked={p.featured} onChange={(v) => edit(p.id, { featured: v })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!found.length && (
          <div className="px-4 py-12 text-center">
            <p className="text-[14px] text-ink/60">No styles match these filters.</p>
            <button
              type="button"
              onClick={() => {
                setLine("all");
                setCategory(null);
                setStatus("all");
                setQuery("");
              }}
              className="mt-2 text-[13.5px] font-semibold underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <SaveBar count={changes} pending={saver.pending} error={saver.error} onDiscard={() => (setItems(saved), saver.clearError())} onSave={() => saver.save(items)} />
    </>
  );
}

/** Last 30 days in one cell: views as a bar, then adds and inquiries, with a trend arrow and the style's flags. */
function Interest({ s, max, live }: { s: StyleStats; max: number; live: boolean }) {
  const trend = s.inquiries - s.before;
  const flags = s.flags.filter((f) => live || f === "rising");
  return (
    <span className="grid gap-1">
      <span className="flex items-center gap-2.5">
        <span className="h-1 w-14 overflow-hidden rounded-full bg-ink/10">
          <span className="block h-full rounded-full bg-ink" style={{ width: `${(s.views / max) * 100}%` }} />
        </span>
        <span className="text-[12.5px] whitespace-nowrap text-ink/60 tabular-nums">
          {s.views} · {s.adds} · <b className="font-semibold text-ink">{s.inquiries}</b>
          {trend !== 0 && <span className={clsx("ml-1", trend > 0 ? "text-[#21734a]" : "text-[#92400e]")}>{trend > 0 ? `▲${trend}` : `▼${-trend}`}</span>}
        </span>
      </span>
      {flags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {flags.map((f) => (
            <span key={f} title={FLAG[f].tip} className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", FLAG[f].tone)}>
              {FLAG[f].label}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** The style's page: how it's doing, and what to do about it. */
function Performance({ s, total, live, listing }: { s: StyleStats; total: number; live: boolean; listing: ReturnType<typeof quality> }) {
  const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  const tiles: [string, string, string][] = [
    ["Viewed", String(s.views), "visits that opened it"],
    ["Added to a list", String(s.adds), `${rate(s.adds, s.views)} of viewers`],
    ["Inquiries", String(s.inquiries), s.before ? `${s.before} the month before` : "none the month before"],
    ["Won", String(s.won), `of ${total} inquiries in 90 days`],
  ];
  const flags = s.flags.filter((f) => live || f === "rising");
  return (
    <section aria-label="How this style is doing" className="mb-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold">How it&apos;s doing</h2>
        <span className="text-[12px] text-ink/50">Last 30 days, from the site&apos;s visitor log and inquiries</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl bg-ink/[0.04] px-3 py-2.5">
            <dt className="text-[12px] font-semibold text-ink/55">{k}</dt>
            <dd className="text-[22px] leading-tight font-light tabular-nums">{v}</dd>
            <dd className="text-[11.5px] text-ink/50">{sub}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        <span className={clsx("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", listing.score === 100 ? "bg-[#2f8f5b]/12 text-[#21734a]" : "bg-[#b45309]/12 text-[#92400e]")}>Listing {listing.score}%</span>
        <span className="text-ink/65">{listing.missing.length ? `To finish it: ${listing.missing.join(", ").toLowerCase()}.` : "Complete: photos, description, materials, tags and colour."}</span>
      </p>
      {flags.length > 0 && (
        <ul className="mt-2 grid gap-1.5">
          {flags.map((f) => (
            <li key={f} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className={clsx("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", FLAG[f].tone)}>{FLAG[f].label}</span>
              <span className="text-ink/65">{FLAG[f].tip}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const BADGES = ["Top reorder", "New", "Trending"] as const;

/** What to do with the ticked styles: each change joins the drafts, to review and publish like any other. */
function BulkBar({
  ids,
  onAvailability,
  availPending,
  onPrices,
  pricePending,
  count,
  deletable,
  pending,
  onClear,
  onPatch,
  onDelete,
}: {
  ids: string[];
  onAvailability: (a: Availability) => void;
  availPending: boolean;
  onPrices: (row: PriceRow) => void;
  pricePending: boolean;
  count: number;
  deletable: number;
  pending: boolean;
  onClear: () => void;
  onPatch: (patch: (p: Item) => Partial<Item>) => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState<{ title: string; for: string } | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [availOpen, setAvailOpen] = useState(false);
  const sheetHref = sheet && `/admin/line-sheet?${new URLSearchParams({ ids: ids.join(","), ...(sheet.title.trim() && { title: sheet.title.trim() }), ...(sheet.for.trim() && { for: sheet.for.trim() }) })}`;
  const btn = "min-h-9 rounded-full bg-white/15 px-3 text-[12.5px] font-semibold text-white hover:bg-white/25";
  const pick = "min-h-9 appearance-none rounded-full bg-white/15 px-3 text-[12.5px] font-semibold text-white outline-none hover:bg-white/25 [&>option]:text-ink";
  return (
    <div role="toolbar" aria-label={`Change ${count} ticked styles`} className="fixed top-3 left-1/2 z-40 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-[20px] bg-ink p-2 pl-4 text-white shadow-[0_14px_30px_-14px_rgb(18_20_22/.7)]">
      <span className="mr-2 text-[13px] font-semibold tabular-nums">{count} ticked</span>
      <button type="button" className={btn} onClick={() => onPatch(() => ({ live: true }))}>
        Show
      </button>
      <button type="button" className={btn} onClick={() => onPatch(() => ({ live: false }))}>
        Hide
      </button>
      <button type="button" className={btn} onClick={() => onPatch(() => ({ featured: true }))}>
        Feature
      </button>
      <button type="button" className={btn} onClick={() => onPatch(() => ({ featured: false }))}>
        Unfeature
      </button>
      <select
        aria-label="Set a badge"
        value=""
        className={pick}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onPatch(() => ({ badge: v === "none" ? undefined : (v as Item["badge"]) }));
        }}
      >
        <option value="">Badge…</option>
        {BADGES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
        <option value="none">No badge</option>
      </select>
      <select
        aria-label="Pin to a season"
        value=""
        className={pick}
        onChange={(e) => {
          const v = e.target.value as SeasonId;
          if (v) onPatch((p) => ({ pins: p.pins.includes(v) ? p.pins : [...p.pins, v] }));
        }}
      >
        <option value="">Pin to season…</option>
        {SEASON_IDS.map((x) => (
          <option key={x} value={x}>
            {SEASONS[x].name}
          </option>
        ))}
      </select>
      <select
        aria-label="Unpin from a season"
        value=""
        className={pick}
        onChange={(e) => {
          const v = e.target.value as SeasonId;
          if (v) onPatch((p) => ({ pins: p.pins.filter((x) => x !== v) }));
        }}
      >
        <option value="">Unpin…</option>
        {SEASON_IDS.map((x) => (
          <option key={x} value={x}>
            {SEASONS[x].name}
          </option>
        ))}
      </select>
      {availOpen ? (
        <span className="w-full rounded-2xl bg-white/10 p-2">
          <AvailabilityFields dark pending={availPending} saveLabel={`Set for ${count}`} onSave={(a) => (onAvailability(a), setAvailOpen(false))} />
        </span>
      ) : (
        <button type="button" className={btn} onClick={() => setAvailOpen(true)}>
          Availability…
        </button>
      )}
      {pricingOpen ? (
        <span className="rounded-2xl bg-white/10 p-1.5">
          <PriceFields dark pending={pricePending} saveLabel={`Set for ${count}`} onSave={(row) => (onPrices(row), setPricingOpen(false))} />
        </span>
      ) : (
        <button type="button" className={btn} onClick={() => setPricingOpen(true)} title="The same prices for every ticked style (private)">
          Set prices…
        </button>
      )}
      {ids.length > 0 &&
        (sheet ? (
          <span className="flex flex-wrap items-center gap-1.5 rounded-full bg-white/10 p-1">
            <input aria-label="Line sheet title" placeholder="Title (optional)" value={sheet.title} onChange={(e) => setSheet({ ...sheet, title: e.target.value })} className="min-h-8 w-40 rounded-full bg-white px-3 text-[12.5px] text-ink outline-none" />
            <input aria-label="Prepared for" placeholder="For (buyer, optional)" value={sheet.for} onChange={(e) => setSheet({ ...sheet, for: e.target.value })} className="min-h-8 w-44 rounded-full bg-white px-3 text-[12.5px] text-ink outline-none" />
            <a href={sheetHref!} target="_blank" rel="noreferrer" className="flex min-h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink">
              Open line sheet
            </a>
          </span>
        ) : (
          <button type="button" className={btn} onClick={() => setSheet({ title: "", for: "" })} title="A printable line sheet of the ticked live styles">
            Line sheet…
          </button>
        ))}
      {deletable > 0 &&
        (confirm ? (
          <button type="button" disabled={pending} onClick={onDelete} className="min-h-9 rounded-full bg-danger px-3 text-[12.5px] font-semibold text-white disabled:opacity-60">
            {pending ? "Deleting…" : `Delete ${deletable} for good`}
          </button>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="min-h-9 rounded-full px-3 text-[12.5px] font-semibold text-[#ffb4a8] hover:bg-white/10" title="Only styles added here can be deleted; built-in ones can be hidden">
            Delete {deletable} added
          </button>
        ))}
      <button type="button" onClick={onClear} className="ml-auto min-h-9 rounded-full px-3 text-[12.5px] font-semibold text-white/70 hover:text-white">
        Clear
      </button>
    </div>
  );
}

const GROUP: Record<Suggestion["kind"], string> = { badge: "Badges", visibility: "Visibility", feature: "Featuring", range: "Range gaps", search: "Searched, not found" };

/**
 * What the figures argue for, at the top of the list: one-click edits (they join the drafts, to review and publish),
 * gaps in the range and in search, and how complete the listings are.
 */
function Suggestions({ items, list, onApply, onShowIncomplete }: { items: Item[]; list: Suggestion[]; onApply: (a: NonNullable<Suggestion["apply"]>) => void; onShowIncomplete: () => void }) {
  const [open, setOpen] = useState(true);
  // worked out from the drafts, so an applied suggestion goes, and comes back if the drafts are discarded
  const shown = list;
  const scores = items.filter((p) => p.live).map((p) => quality(p).score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
  const incomplete = items.filter((p) => quality(p).score < 100).length;
  return (
    <section aria-label="Suggestions" className="mt-3 rounded-[24px] bg-white/80 p-4 ring-1 ring-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <AdminIcon name="sparkle" className="size-4" /> Suggestions
          <span className="rounded-full bg-ink/[0.07] px-2 py-0.5 text-[12px] font-semibold tabular-nums">{shown.length}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
          <button type="button" onClick={onShowIncomplete} className="flex min-h-9 items-center gap-2 rounded-full bg-ink/[0.05] px-3 font-semibold hover:bg-ink/[0.09]">
            Listings {avg}% complete
            <span className="font-medium text-ink/55">
              · {incomplete} to finish
            </span>
          </button>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-9 px-2 font-semibold text-ink/60 hover:text-ink">
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {open &&
        (shown.length ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(Object.keys(GROUP) as Suggestion["kind"][]).map((kind) => {
              const group = shown.filter((x) => x.kind === kind);
              if (!group.length) return null;
              return (
                <div key={kind}>
                  <h3 className="mb-1.5 px-1 text-[12px] font-semibold text-ink/50">{GROUP[kind]}</h3>
                  <ul className="grid gap-1.5">
                    {group.slice(0, 6).map((x) => (
                      <li key={x.key} className="flex items-center gap-3 rounded-2xl bg-ink/[0.035] px-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-semibold">{x.text}</span>
                          <span className="block text-[12px] text-ink/55">{x.why}</span>
                        </span>
                        {x.apply ? (
                          <button
                            type="button"
                            onClick={() => onApply(x.apply!)}
                            className="min-h-9 flex-none rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white"
                          >
                            {x.apply.label}
                          </button>
                        ) : (
                          x.href && (
                            <Link href={x.href.to} prefetch={false} className="min-h-9 flex-none content-center rounded-full bg-white px-3.5 text-[12.5px] font-semibold ring-1 ring-ink/10">
                              {x.href.label}
                            </Link>
                          )
                        )}
                      </li>
                    ))}
                    {group.length > 6 && <li className="px-3 text-[12px] text-ink/50">and {group.length - 6} more</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink/55">Nothing to act on right now. Suggestions come from the last 30 days of visits and inquiries.</p>
        ))}
    </section>
  );
}

const ErrorNote = ({ text }: { text: string }) => (
  <p role="alert" className="mb-4 rounded-2xl bg-danger px-4 py-2.5 text-[13.5px] font-medium text-white">
    {text}
  </p>
);

function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <label className="relative flex-none">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="min-h-10 appearance-none rounded-full bg-white pr-9 pl-4 text-[13.5px] font-medium ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink">
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
      <AdminIcon name="down" className="pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-ink/50" />
    </label>
  );
}
