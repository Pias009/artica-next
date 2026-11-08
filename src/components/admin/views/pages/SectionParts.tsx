"use client";

import clsx from "clsx";
import Image from "next/image";
import { useId, useState, type ReactNode } from "react";
import { AdminIcon } from "../../ui";
import { uploadImage } from "../../upload-image";
import { SCENE_BG } from "../products/PhotoField";
import type { Item } from "@/lib/admin/product-draft";
import { LINE_LABEL } from "@/lib/products";
import { SEASON_IDS, SEASONS, type SeasonId } from "@/lib/season";

/*
 * The pieces of a home-page section the Pages view edits besides its words: its photos, the styles it names, and the
 * styles it shows (with the full product editor a click away).
 */

const label = "text-[12.5px] font-semibold text-ink/70";
/** Addresses next/image can show (a site photo, an upload, the site's Cloudinary): anything else isn't previewed. */
const PREVIEWABLE = /^(\/images\/[\w./-]+|\/api\/img\/[a-f0-9]{24}|https:\/\/res\.cloudinary\.com\/doulxmmm\/image\/upload\/[\w./,-]+)$/;
const chip = "min-h-9 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors";

/** A photo in a section: the one showing now, replaced by uploading another or giving a site photo's address. */
export function ImageField({ title, value, builtIn, onChange }: { title: string; value: string; builtIn: string; onChange: (v: string) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = value || builtIn;
  const ok = PREVIEWABLE.test(src);
  const take = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The photo couldn't be uploaded.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-ink/[0.06]">
      <span className="relative block aspect-square overflow-hidden rounded-xl bg-ink/[0.05]">
        {ok && <Image src={src} alt="" fill sizes="88px" className={src.endsWith(".svg") ? "object-contain p-2" : "object-cover"} />}
        {!ok && src && <span className="absolute inset-0 grid place-items-center p-1 text-center text-[10.5px] text-danger">Not a site photo</span>}
        {value && <span className="absolute top-1 left-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white">New</span>}
      </span>
      <div className="min-w-0">
        <p className={clsx(label, "truncate")} title={title}>
          {title}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <label htmlFor={id} className={clsx(chip, "inline-flex cursor-pointer items-center bg-ink text-white", busy && "pointer-events-none opacity-60")}>
            {busy ? "Uploading…" : "Upload photo"}
          </label>
          <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
          {value && (
            <button type="button" onClick={() => onChange("")} className={clsx(chip, "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink")}>
              Use original
            </button>
          )}
        </div>
        <input
          aria-label={`${title}: photo address`}
          value={value}
          placeholder={builtIn}
          onChange={(e) => onChange(e.target.value.trim())}
          className="mt-1.5 min-h-8 w-full rounded-full bg-white/80 px-3 text-[12px] ring-1 ring-ink/10 outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-ink"
        />
        {(error || (!ok && value)) && (
          <p role="alert" className="mt-1 text-[12px] font-medium text-danger">
            {error ?? "Upload a photo, or use an address starting /images/ or from the site's Cloudinary."}
          </p>
        )}
      </div>
    </div>
  );
}

/** A style a section names (a look's boot, the sample in the box): as built, another live style, or none. */
export function StyleField({ title, value, builtIn, items, onChange }: { title: string; value: string; builtIn: string; items: Item[]; onChange: (v: string) => void }) {
  const id = useId();
  const current = items.find((p) => p.slug === (value || builtIn));
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-ink/[0.06]">
      <span className={clsx("relative size-12 flex-none overflow-hidden rounded-xl", current ? SCENE_BG[current.scene] : "bg-ink/[0.05]")}>
        {current?.outer.src && <Image src={current.outer.src} alt="" fill sizes="48px" className="object-contain p-1" />}
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={clsx(label, "block truncate")} title={title}>
          {title}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 min-h-9 w-full rounded-full bg-white px-3 text-[13px] ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink"
        >
          <option value="">{builtIn ? `As built: ${items.find((p) => p.slug === builtIn)?.name ?? builtIn}` : "As built: no style named"}</option>
          {builtIn && <option value="none">No style</option>}
          {[...items]
            .filter((p) => p.live)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name} · {LINE_LABEL[p.line]} · {p.type}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

/** The season a list is for (the season's edit) or previewed in (the other showcases). */
export function SeasonTabs({ value, onChange, label: text }: { value: SeasonId; onChange: (s: SeasonId) => void; label: string }) {
  return (
    <div role="group" aria-label={text} className="flex flex-wrap gap-1">
      {SEASON_IDS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={s === value}
          onClick={() => onChange(s)}
          className={clsx("min-h-8 rounded-full px-3 text-[12px] font-semibold transition-colors", s === value ? "bg-ink text-white" : "bg-ink/[0.05] text-ink/65 hover:text-ink")}
        >
          {SEASONS[s].name}
        </button>
      ))}
    </div>
  );
}

const BADGE_TONE = "rounded-full px-2 py-0.5 text-[10.5px] font-semibold";

/**
 * The styles a section shows, as cards: the photo, name and state of each, and a button to open it in the full editor.
 * `list`: the admin chooses them here (reorder, remove, add); without it the styles follow from elsewhere (`note`).
 */
export function SectionProducts({
  rows,
  automatic,
  list,
  note,
  head,
  onOpen,
  onCreate,
}: {
  rows: Item[];
  /** The rows are the automatic list (nothing chosen yet). */
  automatic?: string | null;
  list?: { max: number; candidates: Item[]; onChange: (ids: string[]) => void; onAuto: () => void };
  note?: string;
  head?: ReactNode;
  onOpen: (id: string) => void;
  onCreate?: () => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const ids = rows.map((p) => p.id);
  const move = (from: number, to: number) => {
    if (!list || to < 0 || to >= rows.length) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    list.onChange(next);
  };
  return (
    <section aria-label="Styles in this section" className="mt-4 rounded-2xl bg-white/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">
          Styles <span className="font-medium text-ink/50 tabular-nums">{list ? `${rows.length}/${list.max}` : rows.length}</span>
        </h3>
        {onCreate && (
          <button type="button" onClick={onCreate} className="flex min-h-8 items-center gap-1 rounded-full bg-ink pr-3 pl-2 text-[12px] font-semibold text-white">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[2.4]">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New product
          </button>
        )}
      </div>
      {head && <div className="mt-2.5">{head}</div>}
      {automatic && (
        <p className="mt-2.5 rounded-xl bg-ink/[0.04] px-3 py-2 text-[12.5px] text-ink/60">
          Automatic: {automatic}. Move, remove or add a style to choose them yourself.
        </p>
      )}
      {note && <p className="mt-2.5 text-[12.5px] text-ink/60">{note}</p>}
      {rows.length ? (
        <ol className="mt-2.5 grid gap-1.5">
          {rows.map((p, i) => (
            <li
              key={p.id}
              draggable={!!list}
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => {
                if (!list) return;
                e.preventDefault();
                if (drag !== null && drag !== i) {
                  move(drag, i);
                  setDrag(i);
                }
              }}
              onDragEnd={() => setDrag(null)}
              className={clsx("group flex items-center gap-2 rounded-2xl bg-white/80 py-1.5 pr-1 pl-1.5 ring-1 ring-ink/[0.05]", drag === i && "opacity-50", !p.live && "opacity-60")}
            >
              <button type="button" onClick={() => onOpen(p.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`Edit ${p.name}`}>
                <span className={clsx("relative size-12 flex-none overflow-hidden rounded-xl", SCENE_BG[p.scene])}>
                  {p.outer.src && <Image src={p.outer.src} alt="" fill sizes="48px" className="object-contain p-1" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{p.name || "Untitled style"}</span>
                  <span className="block truncate text-[11.5px] text-ink/50">
                    {LINE_LABEL[p.line]} · {p.type}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {!p.live && <span className={clsx(BADGE_TONE, "bg-ink/10 text-ink/65")}>Hidden</span>}
                    {p.featured && <span className={clsx(BADGE_TONE, "bg-[#2f8f5b]/12 text-[#21734a]")}>Featured</span>}
                    {p.badge && <span className={clsx(BADGE_TONE, "bg-ink text-white")}>{p.badge}</span>}
                  </span>
                </span>
                <span className="hidden flex-none rounded-full bg-ink/[0.05] px-2.5 py-1 text-[11.5px] font-semibold text-ink/65 group-hover:bg-ink group-hover:text-white sm:inline">Edit</span>
              </button>
              {list && (
                <span className="flex flex-none">
                  <button type="button" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-8 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-25">
                    <AdminIcon name="up" className="size-4" />
                  </button>
                  <button type="button" aria-label={`Move ${p.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} className="grid size-8 place-items-center rounded-full hover:bg-ink/[0.06] disabled:opacity-25">
                    <AdminIcon name="down" className="size-4" />
                  </button>
                  <button type="button" aria-label={`Remove ${p.name} from this section`} onClick={() => list.onChange(ids.filter((x) => x !== p.id))} className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] hover:text-ink">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[2.2]">
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2.5 rounded-xl bg-ink/[0.04] px-3 py-3 text-[12.5px] text-ink/60">No styles show here right now.</p>
      )}
      {list && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <select
            aria-label="Add a style to this section"
            value=""
            disabled={rows.length >= list.max}
            onChange={(e) => e.target.value && list.onChange([...ids, e.target.value])}
            className="min-h-9 min-w-0 flex-1 rounded-full bg-white px-3 text-[13px] ring-1 ring-ink/10 outline-none disabled:opacity-50"
          >
            <option value="">{rows.length >= list.max ? `Full (${list.max})` : "Add a style…"}</option>
            {list.candidates
              .filter((p) => !ids.includes(p.id))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {LINE_LABEL[p.line]} · {p.type}
                </option>
              ))}
          </select>
          {!automatic && (
            <button type="button" onClick={list.onAuto} className="min-h-9 px-2 text-[12.5px] font-semibold text-ink/60 hover:text-ink">
              Back to automatic
            </button>
          )}
        </div>
      )}
    </section>
  );
}
