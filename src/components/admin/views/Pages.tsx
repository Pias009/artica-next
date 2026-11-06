"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { sectionIdeasAction } from "../ai-actions";
import { usePanel, useSaver } from "../panel-data";
import { AdminIcon, Card, CardHead, Field, SaveBar, Shimmer, Toggle } from "../ui";
import { savePagesAction } from "@/app/admin/content-actions";
import type { PanelData } from "@/lib/admin/panel";
import type { Block } from "@/lib/admin/page-blocks";
import type { PageEdit } from "@/lib/content/model";
import type { CopyIdea } from "@/lib/assistant/admin-ai";
import { homeOrder } from "@/lib/home-sections";

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
            return {
              id,
              label: meta.label,
              kind: meta.kind,
              copy: meta.copy,
              visible,
              title: copy?.title ?? "",
              sub: copy?.sub ?? "",
              hideable: true,
              movable: true,
            };
          })
        : (blocks[p.path] ?? []).map((b) => ({
            id: b.id,
            label: b.label,
            kind: b.kind,
            copy: true,
            visible: !e.hidden?.includes(b.id),
            title: e.copy?.[`${b.id}.title`] ?? "",
            sub: e.copy?.[`${b.id}.sub`] ?? "",
            builtTitle: b.title,
            builtSub: b.sub,
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

/** Only what differs from the site as built is saved. */
function toEdits(pages: AdminPage[], d: PanelData): Record<string, PageEdit> {
  const builtOrder = d.homeSections.map((h) => h.id).join();
  return Object.fromEntries(
    pages.flatMap((p) => {
      const home = p.path === "/";
      const changed =
        home &&
        p.sections.length &&
        (p.sections.map((x) => x.id).join() !== builtOrder || p.sections.some((x) => !x.visible || x.title.trim() || x.sub.trim()));
      const copy = home
        ? {}
        : Object.fromEntries(
            p.sections.flatMap((x) => [
              ...(x.title.trim() ? [[`${x.id}.title`, x.title.trim()]] : []),
              ...(x.sub.trim() ? [[`${x.id}.sub`, x.sub.trim()]] : []),
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
          sections: p.sections.map((x) => ({
            id: x.id,
            visible: x.visible,
            ...(x.title.trim() && { title: x.title.trim() }),
            ...(x.sub.trim() && { sub: x.sub.trim() }),
          })),
        }),
      };
      return Object.keys(e).length ? [[p.path, e]] : [];
    }),
  );
}

const GROUPS = ["Shop", "Wholesale terms", "Buyer tools", "Company", "Legal"];

/** Every page on the site: its search listing, and its sections (show, hide, reorder, edit the copy with AI help). */
export function Pages({ blocks }: { blocks: Record<string, Block[] | null> }) {
  const panel = usePanel();
  const initial = useMemo(() => toPages(panel, blocks), [panel, blocks]);
  const [saved, setSaved] = useState<AdminPage[]>(initial);
  const [pages, setPages] = useState<AdminPage[]>(initial);
  const saver = useSaver((v: AdminPage[]) => savePagesAction(toEdits(v, panel)), setSaved);
  const [path, setPath] = useState("/");
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState<string | null>("hero");
  const [drag, setDrag] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [ideas, setIdeas] = useState<CopyIdea[] | null>(null);

  const page = pages.find((p) => p.path === path)!;
  const section = page.sections.find((s) => s.id === sectionId) ?? null;
  const changes = useMemo(() => pages.filter((p, i) => JSON.stringify(p) !== JSON.stringify(saved[i])).length, [pages, saved]);

  const editPage = (fn: (p: AdminPage) => AdminPage) => setPages((all) => all.map((p) => (p.path === path ? fn(p) : p)));
  const editSection = (id: string, patch: Partial<Section>) =>
    editPage((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  const move = (from: number, to: number) =>
    editPage((p) => {
      if (to < 0 || to >= p.sections.length) return p;
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
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,380px)]">
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
                          disabled={i === page.sections.length - 1}
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
      <Card i={3} className="lg:col-start-2 xl:sticky xl:top-6 xl:col-start-auto xl:self-start">
        {section ? (
          <>
            <CardHead title={section.label} sub={section.kind === "Intro" ? `The opening of ${page.name}` : `${section.kind} section on ${page.name}`} />
            {!section.copy ? (
              <p className="mt-4 text-[13.5px] text-ink/60">This section&apos;s words are part of its design. You can show, hide or move it.</p>
            ) : (
              <>
                <div className="mt-5 grid gap-4">
                  <Field
                    label="Headline"
                    value={section.title}
                    max={90}
                    multiline
                    placeholder={section.builtTitle || "The section's own headline"}
                    onChange={(v) => editSection(section.id, { title: v })}
                  />
                  {section.builtSub !== null && (
                    <Field
                      label="Supporting line"
                      value={section.sub}
                      max={section.kind === "Intro" ? 300 : 200}
                      multiline
                      placeholder={section.builtSub || "The section's own line"}
                      onChange={(v) => editSection(section.id, { sub: v })}
                    />
                  )}
                  <p className="-mt-2 text-[12px] text-ink/50">
                    Wrap the closing words in *asterisks* for the plum italic. Empty fields keep the site&apos;s own words.
                  </p>
                </div>
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
        onDiscard={() => (setPages(saved), saver.clearError())}
        onSave={() => saver.save(pages)}
      />
    </div>
  );
}
