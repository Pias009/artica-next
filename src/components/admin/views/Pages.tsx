"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { sectionIdeasAction } from "../ai-actions";
import { usePanel, useSaver } from "../panel-data";
import { AdminIcon, Card, CardHead, Field, SaveBar, Shimmer, Toggle } from "../ui";
import { FullPage, ProductAside, ProductForm } from "./products/ProductForm";
import type { LibraryPhoto } from "./products/PhotoField";
import { ImageField, SeasonTabs, SectionProducts, StyleField } from "./pages/SectionParts";
import { saveMerchAction, savePagesAction, saveProductsAction, type SaveResult } from "@/app/admin/content-actions";
import { HOME_LISTS, liveCatalog, SHOWN_NOTE } from "@/lib/admin/home-products";
import type { PanelData } from "@/lib/admin/panel";
import type { Block } from "@/lib/admin/page-blocks";
import { autofill, blankDraft, fromTemplate, problems, toItem, toPayload, uniqueSlug, vocabOf, type Item } from "@/lib/admin/product-draft";
import type { Merch, PageEdit } from "@/lib/content/model";
import type { CopyIdea } from "@/lib/assistant/admin-ai";
import { FOOTER_BLOCK, homeOrder } from "@/lib/home-sections";
import { categoryFor } from "@/lib/product-categories";
import { LINE_LABEL } from "@/lib/products";
import { SEASONS, type SeasonId } from "@/lib/season";

type Section = {
  id: string;
  label: string;
  kind: string;
  copy: boolean;
  visible: boolean;
  title: string;
  sub: string;
  /** The words as built, shown as the placeholder (other pages; the home page's live in the sections themselves). */
  builtTitle?: string;
  /** null: this heading has no supporting line to rewrite. */
  builtSub?: string | null;
  hideable: boolean;
  movable: boolean;
  /** Home sections whose words follow the season: edited in Seasons. */
  seasonal?: boolean;
  /**
   * Every other piece of the section: its words, photos (kind "image") and the styles it names (kind "style"), each
   * with its label, what shows as built, and the admin's value ("" keeps what's built).
   */
  fields: { key: string; label: string; text: string; value: string; kind: "text" | "image" | "style" }[];
  /** The styles the section shows on the page now (ids), for sections that show styles. */
  products?: string[];
};
type AdminPage = {
  path: string;
  name: string;
  summary: string;
  group: string;
  views: number;
  published: boolean;
  title: string;
  description: string;
  sections: Section[];
  /** The page couldn't be read for its headings just now. */
  unread: boolean;
};

/** Words compared as the page shows them: spacing and line breaks don't count as a change. */
const norm = (t: string) => t.replace(/\s+/g, " ").trim();
/** What to save for a box: its words if they differ from the site's own, else nothing (the site keeps its own). */
const own = (value: string, built: string | null | undefined) => (norm(value) && norm(value) !== norm(built ?? "") ? value.trim() : "");
/** Whether a field was changed from what's built: a text box against its words, a photo or style when chosen. */
export const isChanged = (f: { kind: string; value: string; text: string }) => (f.kind === "text" ? !!own(f.value, f.text) : !!f.value.trim());

/** A field with its value: text boxes start with the words showing now; photos and styles empty ("as built"). */
const withValue = (f: Block["fields"][number], saved?: string) => ({ ...f, kind: f.kind ?? "text", value: saved ?? (f.kind === "text" || !f.kind ? f.text : "") });

/**
 * The site's pages with the saved edits applied: the home page's sections (shown, hidden, ordered, rewritten), and on
 * every other page its intro and section headings, read from the page itself (rewritten, sections shown or hidden).
 */
function toPages(d: PanelData, blocks: Record<string, Block[] | null>): AdminPage[] {
  return d.pages.map((p) => {
    const e = d.content.pages[p.path] ?? {};
    const sections =
      p.path === "/"
        ? homeOrder(e.sections).map(({ id, visible }) => {
            const meta = d.homeSections.find((h) => h.id === id)!;
            const copy = e.sections?.find((x) => x.id === id);
            // the words as built, read from the home page itself
            const built = blocks["/"]?.find((b) => b.id === id);
            return {
              id,
              label: meta.label,
              kind: meta.kind,
              copy: meta.copy,
              seasonal: "seasonal" in meta,
              visible,
              // the boxes hold the words showing now (the admin's, else the section's own), ready to edit
              title: copy?.title ?? built?.title ?? "",
              sub: copy?.sub ?? built?.sub ?? "",
              builtTitle: built?.title,
              builtSub: built ? (built.sub ?? "") : undefined,
              fields: (built?.fields ?? []).map((f) => withValue(f, e.copy?.[f.key])),
              products: built?.products,
              hideable: true,
              movable: true,
            } as Section;
          }).concat(footerOf(blocks["/"], e.copy))
        : (blocks[p.path] ?? []).filter((b) => b.id !== FOOTER_BLOCK.id).map((b) => ({
            id: b.id,
            label: b.label,
            kind: b.kind,
            copy: true,
            visible: !e.hidden?.includes(b.id),
            title: e.copy?.[`${b.id}.title`] ?? b.title,
            sub: e.copy?.[`${b.id}.sub`] ?? b.sub ?? "",
            builtTitle: b.title,
            builtSub: b.sub,
            fields: b.fields.map((f) => withValue(f, e.copy?.[f.key])),
            hideable: b.hideable,
            movable: false,
          }));
    return {
      ...p,
      published: e.published !== false,
      title: e.title ?? "",
      description: e.description ?? "",
      sections,
      unread: p.path !== "/" && !blocks[p.path],
    };
  });
}

/** The footer's box, read from the home page: its words only (it can't be moved or hidden), kept with the home page's. */
function footerOf(blocks: Block[] | null | undefined, saved: Record<string, string> | undefined): Section[] {
  const b = blocks?.find((x) => x.id === FOOTER_BLOCK.id);
  if (!b) return [];
  const { id, label, kind } = FOOTER_BLOCK;
  return [{ id, label, kind, copy: false, visible: true, title: "", sub: "", fields: b.fields.map((f) => withValue(f, saved?.[f.key])), hideable: false, movable: false }];
}

/** Only what differs from the site as built is saved. */
function toEdits(pages: AdminPage[], d: PanelData): Record<string, PageEdit> {
  const builtOrder = d.homeSections.map((h) => h.id).join();
  return Object.fromEntries(
    pages.flatMap((p) => {
      const home = p.path === "/";
      // the home page's own sections (the footer's box is listed with them, but has no place in their order)
      const ordered = p.sections.filter((x) => x.movable);
      const changed =
        home &&
        ordered.length &&
        (ordered.map((x) => x.id).join() !== builtOrder || ordered.some((x) => !x.visible || own(x.title, x.builtTitle) || own(x.sub, x.builtSub)));
      // every field the admin wrote; home headlines and lines live with the section order instead
      const copy = Object.fromEntries(
        p.sections.flatMap((x) => [
          ...(!home && own(x.title, x.builtTitle) ? [[`${x.id}.title`, own(x.title, x.builtTitle)]] : []),
          ...(!home && own(x.sub, x.builtSub) ? [[`${x.id}.sub`, own(x.sub, x.builtSub)]] : []),
          ...x.fields.filter(isChanged).map((f) => [f.key, f.value.trim()]),
        ]),
      );
      const hidden = home ? [] : p.sections.filter((x) => !x.visible).map((x) => x.id);
      const e: PageEdit = {
        ...(!p.published && { published: false }),
        ...(p.title.trim() && { title: p.title.trim() }),
        ...(p.description.trim() && { description: p.description.trim() }),
        ...(Object.keys(copy).length && { copy }),
        ...(hidden.length && { hidden }),
        ...(changed && {
          sections: ordered.map((x) => ({
            id: x.id,
            visible: x.visible,
            ...(own(x.title, x.builtTitle) && { title: own(x.title, x.builtTitle) }),
            ...(own(x.sub, x.builtSub) && { sub: own(x.sub, x.builtSub) }),
          })),
        }),
      };
      return Object.keys(e).length ? [[p.path, e]] : [];
    }),
  );
}

/** Where a section is on the live site: the home page's anchor before it, another page's heading, or the page's top. */
const onSite = (path: string, id: string) => (path === "/" ? `/#s-${id}` : id === "intro" ? path : `${path}#${id}`);

/** Opens the section on the live site in a new tab, scrolled to it and outlined for a moment. */
function SiteLink({ path, id, label, hidden, big = false }: { path: string; id: string; label: string; hidden: boolean; big?: boolean }) {
  if (hidden)
    return big ? <span className="text-[12.5px] font-semibold text-ink/40">Hidden: not on the page</span> : null;
  return (
    <a
      href={onSite(path, id)}
      target="_blank"
      rel="noreferrer"
      aria-label={big ? undefined : `See ${label} on the page`}
      title="Opens the published page at this section"
      className={clsx(
        "flex flex-none items-center gap-1.5 rounded-full transition-colors",
        big ? "min-h-9 bg-ink px-3.5 text-[12.5px] font-semibold text-white hover:bg-ink/85" : "grid size-9 place-items-center text-ink/60 hover:bg-ink/[0.06] hover:text-ink",
      )}
    >
      {big && "See it on the page"}
      <AdminIcon name="up" className={clsx("rotate-45", big ? "size-3.5" : "size-4")} />
    </a>
  );
}

const GROUPS = ["Shop", "Wholesale terms", "Buyer tools", "Company", "Legal"];

/** Everything the view edits: the pages, the home page's showcases, and the styles shown in them. */
type Draft = { pages: AdminPage[]; merch: Merch; items: Item[] };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Every page on the site: its search listing, and its sections (show, hide, reorder, edit the copy with AI help). On
 * the home page each section also shows everything else in it: the styles it shows (chosen here for the showcases,
 * each one editable in the full product editor, and new ones added), its photos and the styles it names.
 */
export function Pages({ blocks, season: siteSeason }: { blocks: Record<string, Block[] | null>; season: SeasonId }) {
  const panel = usePanel();
  const initial = useMemo<Draft>(
    () => ({
      pages: toPages(panel, blocks),
      merch: { seasonEdit: {}, ...panel.content.merch },
      items: panel.products.map((r) => toItem(r, panel.content.products[r.id])),
    }),
    [panel, blocks],
  );
  const [saved, setSaved] = useState<Draft>(initial);
  const [pages, setPages] = useState<AdminPage[]>(initial.pages);
  const [merch, setMerch] = useState<Merch>(initial.merch);
  const [items, setItems] = useState<Item[]>(initial.items);
  // each part goes through its own action, only when it changed; the first refusal stops the rest
  const saver = useSaver(async (v: Draft): Promise<SaveResult> => {
    const steps: (() => Promise<SaveResult>)[] = [];
    if (!same(v.pages, saved.pages)) steps.push(() => savePagesAction(toEdits(v.pages, panel)));
    if (!same(v.merch, saved.merch)) steps.push(() => saveMerchAction(v.merch));
    if (!same(v.items, saved.items)) steps.push(() => saveProductsAction(toPayload(v.items)));
    let last: SaveResult = { ok: true, at: new Date().toISOString() };
    for (const step of steps) {
      last = await step();
      if (!last.ok) return last;
    }
    return last;
  }, setSaved);
  const draftNow: Draft = { pages, merch, items };
  const [path, setPath] = useState("/");
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState<string | null>("hero");
  const [drag, setDrag] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [ideas, setIdeas] = useState<CopyIdea[] | null>(null);

  // the season the showcases are previewed in (and the season's edit is chosen for): the site's own to start with
  const [season, setSeason] = useState<SeasonId>(siteSeason);
  // the style open in the full editor, or a new one being made for the open section
  const [openId, setOpenId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<Item | null>(null);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());

  const page = pages.find((p) => p.path === path)!;
  const section = page.sections.find((s) => s.id === sectionId) ?? null;
  const changes = useMemo(
    () =>
      pages.filter((p, i) => !same(p, saved.pages[i])).length +
      (same(merch, saved.merch) ? 0 : 1) +
      items.filter((p) => !same(p, saved.items.find((s) => s.id === p.id))).length +
      saved.items.filter((s) => !items.some((p) => p.id === s.id)).length,
    [pages, merch, items, saved],
  );

  /* ---- the styles in the open home section ---- */

  const catalog = useMemo(() => liveCatalog(items, merch.order), [items, merch.order]);
  const vocab = useMemo(() => vocabOf(items), [items]);
  const library = useMemo<LibraryPhoto[]>(() => items.flatMap((p) => [p.outer, ...(p.zip ? [p.zip] : [])].filter((x) => x.src).map((x) => ({ ...x, name: p.name }))), [items]);
  const itemOf = (id: string) => items.find((p) => p.id === id);
  const home = path === "/";
  const listDef = home && section ? HOME_LISTS[section.id] : undefined;
  const chosenIds = listDef ? listDef.get(merch, season) : [];
  const autoRows = listDef && !chosenIds.length ? listDef.auto(season, catalog).flatMap((p) => itemOf(p.id) ?? []) : [];
  const productRows = listDef
    ? chosenIds.length
      ? chosenIds.flatMap((id) => itemOf(id) ?? [])
      : autoRows
    : (section?.products ?? []).flatMap((id) => itemOf(id) ?? []);
  const showsProducts = home && !!section && (!!listDef || !!section.products?.length);
  const setList = (ids: string[]) => listDef && setMerch((m) => listDef.set(m, season, ids));
  const editItem = (id: string, patch: Partial<Item>) => setItems((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const startNew = () => {
    setTouched(new Set());
    setNewDraft(blankDraft());
  };
  const changeNew = (patch: Partial<Item>, keys: string[] = []) => {
    if (!newDraft) return;
    const next = new Set([...touched, ...keys]);
    setTouched(next);
    const merged = autofill({ ...newDraft, ...patch }, next, items, vocab);
    setNewDraft({ ...merged, slug: uniqueSlug(merged.name, items.map((p) => p.slug)) });
  };
  // the new style joins the catalogue (a draft until published) and, in a showcase, the end of its list
  const addNew = () => {
    if (!newDraft) return;
    setItems((all) => [...all, { ...newDraft, live: true }]);
    if (listDef) {
      const ids = productRows.map((p) => p.id);
      if (ids.length < listDef.max) setList([...ids, newDraft.id]);
    }
    setNewDraft(null);
  };

  // Escape closes the product editor
  useEffect(() => {
    if (!openId && !newDraft) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && (setOpenId(null), setNewDraft(null));
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [openId, newDraft]);

  const editPage = (fn: (p: AdminPage) => AdminPage) => setPages((all) => all.map((p) => (p.path === path ? fn(p) : p)));
  const editSection = (id: string, patch: Partial<Section>) =>
    editPage((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  const move = (from: number, to: number) =>
    editPage((p) => {
      if (to < 0 || to >= p.sections.length || !p.sections[to].movable) return p;
      const s = [...p.sections];
      s.splice(to, 0, s.splice(from, 1)[0]);
      return { ...p, sections: s };
    });

  const askIdeas = async () => {
    if (!section) return;
    setIdeas(null);
    setThinking(true);
    const got = await sectionIdeasAction(section.label, section.title || section.builtTitle || "", section.sub || section.builtSub || "").catch(() => null);
    setIdeas(got);
    setThinking(false);
  };

  const list = pages.filter((p) => (p.name + p.path).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,460px)]">
      {/* the page list */}
      <Card i={0} className="lg:sticky lg:top-6 lg:row-span-2 lg:self-start xl:row-span-1">
        <CardHead title="Site pages" sub={`${pages.length} pages, ${pages.filter((p) => p.published).length} published · views in 7 days`} />
        <label className="mt-4 flex items-center gap-2 rounded-full bg-white/80 px-4 ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-ink">
          <AdminIcon name="page" className="size-4 text-ink/45" />
          <span className="sr-only">Find a page</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a page"
            className="min-h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-ink/40"
          />
        </label>
        <nav aria-label="Pages" className="mt-4 grid max-h-[62vh] gap-4 overflow-y-auto pr-1">
          {GROUPS.map((g) => {
            const items = list.filter((p) => p.group === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <p className="mb-1.5 px-2 text-[13px] font-semibold text-ink/50">{g}</p>
                <ul className="grid gap-0.5">
                  {items.map((p) => (
                    <li key={p.path}>
                      <button
                        type="button"
                        aria-current={p.path === path ? "page" : undefined}
                        onClick={() => {
                          setPath(p.path);
                          setSectionId(p.sections[0]?.id ?? null);
                          setIdeas(null);
                        }}
                        className={clsx(
                          "flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors duration-200",
                          p.path === path ? "bg-ink text-white" : "hover:bg-white/70",
                        )}
                      >
                        <span className={clsx("size-1.5 flex-none rounded-full", p.published ? "bg-emerald-500" : "bg-ink/25")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{p.name}</span>
                          <span className={clsx("block truncate text-[12px]", p.path === path ? "text-white/60" : "text-ink/45")}>{p.path}</span>
                        </span>
                        <span className={clsx("text-[12px] tabular-nums", p.path === path ? "text-white/60" : "text-ink/45")}>
                          {p.views.toLocaleString("en-US")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </Card>

      {/* the page and its sections */}
      <div className="grid content-start gap-4">
        <Card i={1}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12.5px] text-ink/50">{page.group}</p>
              <h2 className="mt-0.5 text-[24px] font-light tracking-[-0.01em]">{page.name}</h2>
              <a
                href={page.path}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold text-ink/60 hover:text-ink"
              >
                {page.path} <AdminIcon name="up" className="size-3.5 rotate-45" />
              </a>
            </div>
            <label className="flex items-center gap-3 rounded-full bg-white/70 py-2 pr-2 pl-4 text-[13px] font-semibold">
              Published
              <Toggle label="Published" checked={page.published} onChange={(v) => page.path !== "/" && editPage((p) => ({ ...p, published: v }))} />
            </label>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Search title" value={page.title} max={70} placeholder={page.name} onChange={(v) => editPage((p) => ({ ...p, title: v }))} />
            <Field
              label="Search description"
              value={page.description}
              max={170}
              multiline
              placeholder={page.summary}
              onChange={(v) => editPage((p) => ({ ...p, description: v }))}
            />
          </div>
          <p className="mt-3 text-[12.5px] text-ink/50">
            {page.path === "/"
              ? "The home page is always published."
              : page.published
                ? "Leave the fields empty to keep the page's own title and description."
                : "Unpublished: visitors get “page not found” and it leaves the sitemap."}
          </p>
        </Card>

        {page.sections.length === 0 ? (
          <Card i={2}>
            <CardHead title="Sections" sub={page.unread ? "Couldn't read this page just now" : "Nothing to rewrite here"} />
            <p className="mt-3 text-[13.5px] text-ink/60">
              {page.unread
                ? "The panel reads each page for its intro and headings. Reload the panel in a moment to try again."
                : "This page has no intro or section headings the panel can rewrite. Its search title and description are above."}
            </p>
          </Card>
        ) : (
          <Card i={2}>
            <CardHead
              title="Sections"
              sub={page.path === "/" ? "Drag to reorder; the eye shows or hides a section" : "Pick one to rewrite it; the eye shows or hides a section"}
              right={
                <span className="text-[13px] text-ink/50 tabular-nums">
                  {page.sections.filter((s) => s.visible).length}/{page.sections.length} shown
                </span>
              }
            />
            <ol className="mt-4 grid gap-1.5">
              {page.sections.map((s, i) => (
                <li
                  key={s.id}
                  draggable={s.movable}
                  onDragStart={() => setDrag(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (drag !== null && drag !== i) {
                      move(drag, i);
                      setDrag(i);
                    }
                  }}
                  onDragEnd={() => setDrag(null)}
                  className={clsx(
                    "group flex items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-2 transition-[background-color,box-shadow,opacity] duration-200",
                    s.id === sectionId ? "bg-white shadow-[0_6px_18px_-10px_rgb(18_20_22/.35)]" : "hover:bg-white/60",
                    drag === i && "opacity-50",
                    !s.visible && "text-ink/40",
                  )}
                >
                  <span className={clsx("text-ink/30", s.movable ? "cursor-grab active:cursor-grabbing" : "invisible")} aria-hidden="true">
                    <AdminIcon name="grip" className="size-5 stroke-[3]" />
                  </span>
                  <span className="w-6 text-[12px] text-ink/40 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSectionId(s.id);
                      setIdeas(null);
                    }}
                    className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="truncate text-[14px] font-medium">{s.label}</span>
                    <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink/55">{s.kind}</span>
                  </button>
                  <span className="flex opacity-60 transition-opacity group-hover:opacity-100">
                    <SiteLink path={page.path} id={s.id} label={s.label} hidden={!s.visible} />
                    {s.movable && (
                      <>
                        <button
                          type="button"
                          aria-label={`Move ${s.label} up`}
                          disabled={i === 0}
                          onClick={() => move(i, i - 1)}
                          className="grid size-9 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-25"
                        >
                          <AdminIcon name="up" className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${s.label} down`}
                          disabled={i === page.sections.length - 1 || !page.sections[i + 1].movable}
                          onClick={() => move(i, i + 1)}
                          className="grid size-9 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-25"
                        >
                          <AdminIcon name="down" className="size-4" />
                        </button>
                      </>
                    )}
                    {s.hideable && (
                      <button
                        type="button"
                        aria-label={s.visible ? `Hide ${s.label}` : `Show ${s.label}`}
                        aria-pressed={!s.visible}
                        onClick={() => editSection(s.id, { visible: !s.visible })}
                        className="grid size-9 place-items-center rounded-full hover:bg-ink/[0.06]"
                      >
                        <AdminIcon name={s.visible ? "eye" : "eyeOff"} className="size-4" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      {/* the selected section's copy, with AI help */}
      <Card i={3} className="lg:col-start-2 xl:sticky xl:top-6 xl:col-start-auto xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto">
        {section ? (
          <>
            <CardHead
              title={section.label}
              sub={section.kind === "Intro" ? `The opening of ${page.name}` : `${section.kind} section on ${page.name}`}
              right={<SiteLink path={page.path} id={section.id} label={section.label} hidden={!section.visible} big />}
            />
            {!section.visible && <p className="mt-3 rounded-xl bg-ink/[0.05] px-3 py-2 text-[12.5px] text-ink/60">Hidden on the site. Everything in it can still be edited, ready for when it&apos;s shown.</p>}
            {section.copy && (
              <div className="mt-4 grid gap-4">
                <Field label="Headline" value={section.title} max={90} multiline placeholder="Write the section's headline" onChange={(v) => editSection(section.id, { title: v })} />
                {section.builtSub !== null && (
                  <Field
                    label="Supporting line"
                    value={section.sub}
                    max={section.kind === "Intro" ? 300 : 200}
                    multiline
                    placeholder={section.builtSub ? "Write the supporting line" : "No supporting line yet. Write one to add it."}
                    onChange={(v) => editSection(section.id, { sub: v })}
                  />
                )}
                <p className="-mt-2 text-[12px] text-ink/50">
                  This is what the page shows now. Wrap the closing words in *asterisks* for the plum italic. Clear a box to go back to the site&apos;s own words.
                </p>
              </div>
            )}
            {showsProducts && (
              <SectionProducts
                rows={productRows}
                automatic={listDef && !chosenIds.length ? listDef.automatic : null}
                note={listDef ? undefined : SHOWN_NOTE[section.id]}
                head={
                  listDef ? (
                    <div className="grid gap-1.5">
                      <p className="text-[12px] text-ink/55">
                        {listDef.perSeason ? `The ${SEASONS[season].name.toLowerCase()} edit. Each season has its own list:` : "Previewed for the season:"}
                      </p>
                      <SeasonTabs value={season} onChange={setSeason} label={listDef.perSeason ? "Season" : "Preview for season"} />
                    </div>
                  ) : section.id !== "hero" && section.id !== "campaign" ? null : (
                    <p className="text-[12px] text-ink/55">As shown for {SEASONS[siteSeason].name.toLowerCase()}, the site&apos;s season.</p>
                  )
                }
                list={
                  listDef
                    ? {
                        max: listDef.max,
                        candidates: items.filter((p) => p.live),
                        onChange: setList,
                        onAuto: () => setList([]),
                      }
                    : undefined
                }
                onOpen={setOpenId}
                onCreate={section.id === "hero" || section.id === "campaign" || section.id === "up-close" ? undefined : startNew}
              />
            )}
            {section.fields.some((f) => f.kind === "image") && (
              <details open className="mt-4 rounded-2xl bg-white/60 p-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-[13px] font-semibold">
                  Photos{" "}
                  <span className="font-medium text-ink/50 tabular-nums">
                    {section.fields.filter((f) => f.kind === "image" && f.value.trim()).length}/{section.fields.filter((f) => f.kind === "image").length} changed
                  </span>
                </summary>
                <div className="mt-3 grid gap-2">
                  {section.fields
                    .filter((f) => f.kind === "image")
                    .map((f) => (
                      <ImageField
                        key={f.key}
                        title={f.label}
                        value={f.value}
                        builtIn={f.text}
                        onChange={(v) => editSection(section.id, { fields: section.fields.map((x) => (x.key === f.key ? { ...x, value: v } : x)) })}
                      />
                    ))}
                </div>
              </details>
            )}
            {section.fields.some((f) => f.kind === "style") && (
              <details open className="mt-4 rounded-2xl bg-white/60 p-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-[13px] font-semibold">
                  Styles named <span className="font-medium text-ink/50 tabular-nums">{section.fields.filter((f) => f.kind === "style").length}</span>
                </summary>
                <div className="mt-3 grid gap-2">
                  {section.fields
                    .filter((f) => f.kind === "style")
                    .map((f) => (
                      <StyleField
                        key={f.key}
                        title={f.label}
                        value={f.value}
                        builtIn={f.text}
                        items={items}
                        onChange={(v) => editSection(section.id, { fields: section.fields.map((x) => (x.key === f.key ? { ...x, value: v } : x)) })}
                      />
                    ))}
                </div>
              </details>
            )}
            {section.fields.some((f) => f.kind === "text") && (
              <details open className="mt-4 rounded-2xl bg-white/60 p-3 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-[13px] font-semibold">
                  All the section&apos;s text{" "}
                  <span className="font-medium text-ink/50 tabular-nums">
                    {section.fields.filter((f) => f.kind === "text" && isChanged(f)).length}/{section.fields.filter((f) => f.kind === "text").length} changed
                  </span>
                </summary>
                <div className="mt-3 grid gap-3">
                  {section.fields.filter((f) => f.kind === "text").map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      value={f.value}
                      max={Math.max(40, Math.ceil(f.text.length * 2.2))}
                      multiline={f.text.length > 48}
                      placeholder={f.text || "Write it"}
                      onChange={(v) => editSection(section.id, { fields: section.fields.map((x) => (x.key === f.key ? { ...x, value: v } : x)) })}
                    />
                  ))}
                  <p className="text-[12px] text-ink/50">Each box holds what the page shows now. Clear one to go back to the site&apos;s own words.</p>
                </div>
              </details>
            )}
            {!section.copy ? (
              section.seasonal ? (
                <p className="mt-4 text-[13.5px] text-ink/60">
                  Its headline, words and photo change with the season. Edit them for each season in{" "}
                  <a href="/admin/seasons" className="font-semibold text-ink underline">
                    Seasons
                  </a>
                  . Here you can show, hide or move it.
                </p>
              ) : section.kind === FOOTER_BLOCK.kind ? (
                <p className="mt-4 text-[13.5px] text-ink/60">It sits at the foot of every page (and under the list on the inquiry page), so these words show everywhere. Requests it sends arrive in Inquiries as &ldquo;Contact request&rdquo;.</p>
              ) : (
                <p className="mt-4 text-[13.5px] text-ink/60">{section.fields.length || showsProducts ? "Everything in it is above. You can also show, hide or move it." : "This section has no text to rewrite. You can show, hide or move it."}</p>
              )
            ) : (
              <>
                <div className="mt-5 rounded-3xl bg-ink p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                      <AdminIcon name="sparkle" className="size-4" /> Copy ideas
                    </p>
                    <button
                      type="button"
                      onClick={askIdeas}
                      disabled={thinking}
                      className="min-h-9 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-ink transition-transform hover:scale-[1.03] disabled:opacity-60"
                    >
                      {ideas ? "Try again" : "Suggest"}
                    </button>
                  </div>
                  <div aria-live="polite" className="mt-3 grid gap-2">
                    {thinking &&
                      [0, 1, 2].map((k) => (
                        <div key={k} className="grid gap-2 rounded-2xl bg-white/10 p-3">
                          <Shimmer className="w-1/3 opacity-60 invert" />
                          <Shimmer className="w-5/6 opacity-60 invert" />
                        </div>
                      ))}
                    {ideas?.map((idea, k) => (
                      <button
                        key={idea.tone}
                        type="button"
                        onClick={() =>
                          editSection(section.id, {
                            title: idea.title,
                            sub: idea.sub,
                          })
                        }
                        style={{ animationDelay: `${k * 90}ms` }}
                        className="rounded-2xl bg-white/10 p-3 text-left transition-colors hover:bg-white/20 motion-safe:animate-[admin-in_.45s_cubic-bezier(.22,1,.36,1)_both]"
                      >
                        <span className="text-[12px] font-semibold text-white/55">{idea.tone}</span>
                        <span className="mt-1 block text-[14px] font-semibold">{idea.title}</span>
                        <span className="block text-[12.5px] text-white/70">{idea.sub}</span>
                      </button>
                    ))}
                    {!thinking && !ideas && (
                      <p className="text-[12.5px] text-white/60">Three rewrites of this section in the site&apos;s voice. Pick one to use it.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-[14px] text-ink/55">Pick a section to edit its copy.</p>
        )}
      </Card>

      <SaveBar
        count={changes}
        pending={saver.pending}
        error={saver.error}
        onDiscard={() => (setPages(saved.pages), setMerch(saved.merch), setItems(saved.items), saver.clearError())}
        onSave={() => saver.save(draftNow)}
      />

      {/* the full product editor, over the view: a style from the section, or a new one for it */}
      {(() => {
        const open = openId ? itemOf(openId) : null;
        const p = newDraft ?? open;
        if (!p) return null;
        const adding = !!newDraft;
        const others = items.filter((x) => x.id !== p.id);
        const missing = problems(p, items);
        const close = () => (setOpenId(null), setNewDraft(null));
        return (
          <FullPage
            title={p.name.trim() || (adding ? "New product" : "Untitled style")}
            sub={adding ? `New product for ${section?.label ?? "the home page"}` : `${LINE_LABEL[p.line]} · ${categoryFor(p)} · in ${section?.label ?? "the home page"}`}
            back={{ label: `Back to ${section?.label ?? "Pages"}`, onClick: close }}
            actions={
              adding ? (
                <>
                  <button type="button" onClick={close} className="min-h-10 rounded-full px-3 text-[13.5px] font-semibold text-ink/60 hover:text-ink">
                    Cancel
                  </button>
                  <button type="button" disabled={!!missing.length} onClick={addNew} className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-50">
                    {listDef ? "Add to section" : "Add product"}
                  </button>
                </>
              ) : (
                <>
                  <label className="flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium">
                    <Toggle label={`${p.name} live`} checked={p.live} onChange={(v) => editItem(p.id, { live: v })} /> Live
                  </label>
                  <label className="flex min-h-10 items-center gap-2 px-1 text-[13px] font-medium">
                    <Toggle label={`Feature ${p.name}`} checked={p.featured} onChange={(v) => editItem(p.id, { featured: v })} /> Featured
                  </label>
                  <button type="button" onClick={close} className="min-h-10 rounded-full bg-white px-4 text-[13.5px] font-semibold ring-1 ring-ink/10">
                    Done
                  </button>
                  <button
                    type="button"
                    disabled={!changes || !!missing.length || saver.pending}
                    onClick={() => saver.save(draftNow)}
                    className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-50"
                  >
                    {saver.pending ? "Publishing…" : changes ? `Publish ${changes} ${changes === 1 ? "change" : "changes"}` : "Published"}
                  </button>
                </>
              )
            }
          >
            {saver.error && (
              <p role="alert" className="mb-4 rounded-2xl bg-danger px-4 py-2.5 text-[13.5px] font-medium text-white">
                {saver.error}
              </p>
            )}
            {adding && (
              <p className="mb-4 rounded-2xl bg-white/70 px-4 py-2.5 text-[13px] text-ink/65">
                Fill in what you know: the rest suggests itself as you go. It joins {listDef ? "this section and " : ""}the catalogue as a draft, and goes live when you publish.
              </p>
            )}
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <ProductForm
                item={p}
                others={others}
                vocab={vocab}
                library={library}
                adding={adding}
                touched={adding ? touched : undefined}
                onChange={adding ? changeNew : (patch) => editItem(p.id, patch)}
                onTemplate={
                  adding
                    ? (t) => {
                        const { item, touched: keys } = fromTemplate(p, t);
                        const next = new Set(keys);
                        setTouched(next);
                        setNewDraft(autofill(item, next, items, vocab));
                      }
                    : undefined
                }
              />
              <ProductAside item={p} others={others} adding={adding} missing={missing} />
            </div>
          </FullPage>
        );
      })()}
    </div>
  );
}
