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
import { LINE_LABEL, type ProductLine } from "@/lib/products";

type Sort = "name" | "asked" | "featured" | "category";
type Status = "all" | "live" | "hidden" | "featured" | "added";

const SORTS: Record<Sort, (a: Item, b: Item) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  asked: (a, b) => b.inquiries - a.inquiries || a.name.localeCompare(b.name),
  featured: (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
  category: (a, b) => categoryFor(a).localeCompare(categoryFor(b)) || a.name.localeCompare(b.name),
};
const STATUS: Record<Status, { label: string; test: (p: Item) => boolean }> = {
  all: { label: "All statuses", test: () => true },
  live: { label: "Live", test: (p) => p.live },
  hidden: { label: "Hidden", test: (p) => !p.live },
  featured: { label: "Featured", test: (p) => p.featured },
  added: { label: "Added here", test: (p) => p.added },
};

const same = (a: Item, b?: Item) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The whole catalogue as a list to filter and work down (/admin/products), with a full page to edit any style
 * (/admin/products/<id>) or add a new one (/admin/products/new). Mounted by their shared layout, so drafts survive
 * moving between them. Edits stay drafts until published; a new style is published from its own page, on its own.
 */
export function Products() {
  const panel = usePanel();
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
    STATUS[status].test(p) &&
    (skipCategory || !category || categoryFor(p) === category) &&
    words.every((w) => [p.name, p.type, categoryFor(p), p.color.name, p.spec, ...p.tags].join(" ").toLowerCase().includes(w));
  const found = items.filter((p) => passes(p)).sort(SORTS[sort]);
  // each category's count follows the other filters, so a chip never promises what clicking it won't show
  const counts = new Map<string, number>();
  for (const p of items) if (passes(p, true)) counts.set(categoryFor(p), (counts.get(categoryFor(p)) ?? 0) + 1);
  const chips = [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...items.map((p) => p.inquiries));

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
              ["asked", "Most asked"],
              ["featured", "Featured first"],
              ["category", "Category"],
            ]}
          />
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

      <p className="mt-3 mb-2 px-2 text-[13px] text-ink/55 tabular-nums">
        {found.length} {found.length === 1 ? "style" : "styles"} · {items.filter((p) => p.live).length} live · {items.filter((p) => p.featured).length} featured · inquiries in the last 90 days
      </p>

      <div className="overflow-hidden rounded-[24px] bg-white/70 ring-1 ring-white">
        <table className="w-full border-collapse text-left">
          <thead className="text-[12px] font-semibold text-ink/50">
            <tr className="border-b border-ink/[0.08]">
              <th scope="col" className="py-3 pl-4 font-semibold">
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
              <th scope="col" className="hidden px-3 font-semibold md:table-cell">
                Inquiries
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
                      </span>
                      <span className="block text-[12.5px] text-ink/55">
                        {LINE_LABEL[p.line]} · {p.type}
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
                  <span className="flex items-center gap-2.5">
                    <span className="h-1 w-16 overflow-hidden rounded-full bg-ink/10">
                      <span className="block h-full rounded-full bg-ink" style={{ width: `${(p.inquiries / max) * 100}%` }} />
                    </span>
                    <span className="text-[12.5px] text-ink/60 tabular-nums">{p.inquiries}</span>
                  </span>
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
