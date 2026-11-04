"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminIcon, Field, Segmented } from "../../ui";
import { Chips, Combo, fieldInput, fieldLabel, SuggestedTag } from "./Combo";
import { PhotoField, SCENE_BG, type LibraryPhoto } from "./PhotoField";
import { describeDraftAction } from "@/app/admin/product-actions";
import { descFor, material, nameIdeas, similarStyles, specFor, tagsFor, withLine, type Item, type Vocab } from "@/lib/admin/product-draft";
import { CATEGORIES, categoryFor } from "@/lib/product-categories";
import { LINE_LABEL, type Product, type ProductLine, type Scene } from "@/lib/products";
import { SEASON_IDS } from "@/lib/season";
import { IN_SEASON, seasonScore } from "@/lib/season-products";

const BADGES = ["None", "Top reorder", "New", "Trending"] as const;
const SCENES: Scene[] = ["sage", "sand", "blush", "stone"];
const pill = (on: boolean) => clsx("min-h-9 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors", on ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:text-ink");

const Section = ({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) => (
  <section className="rounded-[24px] bg-white/65 p-5 ring-1 ring-white sm:p-6">
    <h3 className="text-[16px] font-semibold">{title}</h3>
    {sub && <p className="mt-0.5 text-[13px] text-ink/55">{sub}</p>}
    <div className="mt-4 grid gap-4">{children}</div>
  </section>
);

export type FormProps = {
  item: Item;
  /** Other styles, for names already taken and repeats. */
  others: Item[];
  vocab: Vocab;
  library: LibraryPhoto[];
  /** The add page: fields fill themselves in until they're changed. */
  adding: boolean;
  touched?: ReadonlySet<string>;
  /** `keys` marks what the admin changed by hand, so suggestions leave it alone. */
  onChange: (patch: Partial<Item>, keys?: string[]) => void;
  onTemplate?: (t: Item) => void;
};

/** Every field of a style. The same form adds a new one and edits an existing one. */
export function ProductForm({ item: p, others, vocab, library, adding, touched, onChange, onTemplate }: FormProps) {
  const auto = (key: string) => adding && !touched?.has(key);
  const [writing, setWriting] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [from, setFrom] = useState("");

  const seasons = useMemo(() => SEASON_IDS.filter((s) => seasonScore({ ...p, pinnedSeasons: undefined } as Product, s) >= IN_SEASON), [p]);
  const ideas = useMemo(() => nameIdeas([...others, p]), [others, p]);
  const tagIdeas = useMemo(() => tagsFor(p).filter((t) => t !== p.line), [p]);
  const nameTaken = p.name.trim() && others.some((o) => o.name.trim().toLowerCase() === p.name.trim().toLowerCase());

  const write = async () => {
    setWriting(true);
    setAiNote(null);
    try {
      const text = await describeDraftAction({
        name: p.name,
        type: p.type,
        line: p.line,
        colour: p.color.name,
        materials: p.materials.map((m) => `${m.label}: ${m.value}`),
        sizes: p.sizes,
        rating: p.rating || null,
        current: p.desc,
      });
      if (text) {
        setUndo(p.desc);
        onChange({ desc: text }, ["desc"]);
      } else setAiNote("Give it a name and a type first.");
    } catch {
      setAiNote("Couldn't reach the server. Try again in a moment.");
    } finally {
      setWriting(false);
    }
  };

  const setMaterial = (i: number, patch: { label?: string; value?: string }) => {
    const m = p.materials[i];
    const next = material(patch.label ?? m.label, patch.value ?? m.value);
    onChange({ materials: p.materials.map((x, j) => (j === i ? next : x)) }, [`mat:${m.label}`, `mat:${next.label}`]);
  };

  return (
    <div className="grid min-w-0 gap-4">
      {adding && onTemplate && (
        <Section title="Start from an existing style" sub="Optional. Copies its make, materials and sizes, never its name or photos.">
          <Combo
            value={from}
            options={others.map((o) => ({ value: o.name, note: `${LINE_LABEL[o.line]} · ${o.type}` }))}
            placeholder="Type a style name"
            onChange={setFrom}
            onPick={(o) => {
              const t = others.find((x) => x.name === o.value);
              if (t) onTemplate(t);
            }}
          />
        </Section>
      )}

      <Section title="The basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Combo
            label="Style name"
            value={p.name}
            max={40}
            options={adding ? ideas : []}
            placeholder={adding ? "Pick an idea or type your own" : undefined}
            error={nameTaken ? "Another style already has this name." : null}
            hint={p.slug ? `Its address: /products/${p.slug}` : undefined}
            onChange={(v) => onChange({ name: v }, ["name"])}
          />
          <Combo
            label="Type of shoe"
            value={p.type}
            max={60}
            options={vocab.types}
            placeholder="e.g. Suede ankle zip boot"
            hint="Materials, tags and the description below follow from this."
            onChange={(v) => onChange({ type: v }, ["type"])}
          />
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div>
            <p className={clsx(fieldLabel, "mb-1.5")}>Line</p>
            <Segmented<ProductLine>
              label="Line"
              value={p.line}
              onChange={(l) => onChange(withLine(p, l), ["line"])}
              options={(Object.keys(LINE_LABEL) as ProductLine[]).map((l) => ({ id: l, label: LINE_LABEL[l] }))}
            />
          </div>
          <label className="min-w-60 flex-1">
            <span className={clsx(fieldLabel, "mb-1.5 block")}>Category</span>
            <select value={p.category ?? ""} onChange={(e) => onChange({ category: e.target.value || undefined }, ["category"])} className={fieldInput}>
              <option value="">Automatic: {categoryFor({ ...p, category: undefined })}</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Photos" sub="Shot on a plain background works best: the background is cut away so the shoe sits on the site's own backdrop.">
        <div className="grid gap-5 md:grid-cols-2">
          <PhotoField label="Main photo" shot={p.outer} scene={p.scene} library={library} hint="JPG, PNG, WebP or AVIF, up to 10 MB" onChange={(s) => onChange({ outer: s ?? { src: "", w: 0, h: 0 } })} />
          <PhotoField label="Second photo (optional)" shot={p.zip} scene={p.scene} library={library} hint="The other side, or the zip" onChange={(s) => onChange({ zip: s ?? undefined })} />
        </div>
        <div>
          <p className={clsx(fieldLabel, "mb-1.5 flex items-center gap-2")}>Backdrop {auto("scene") && <SuggestedTag />}</p>
          <div className="flex flex-wrap gap-2">
            {SCENES.map((s) => (
              <button key={s} type="button" aria-pressed={p.scene === s} onClick={() => onChange({ scene: s }, ["scene"])} className={clsx("flex min-h-9 items-center gap-2 rounded-full pr-3.5 pl-2 text-[13px] font-semibold capitalize ring-1 transition-colors", p.scene === s ? "bg-white ring-2 ring-ink" : "bg-white/60 text-ink/70 ring-ink/10 hover:text-ink")}>
                <span className={clsx("size-5 rounded-full ring-1 ring-ink/10", SCENE_BG[s])} />
                {s}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Combo label="Colour name" value={p.color.name} max={24} options={vocab.colors} placeholder="e.g. Black" onChange={(v) => onChange({ color: { ...p.color, name: v } }, ["color"])} onPick={(o) => o.hex && onChange({ color: { name: o.value, hex: o.hex } })} />
          <label>
            <span className={clsx(fieldLabel, "mb-1.5 flex items-center gap-2")}>Swatch {auto("hex") && p.color.name && <SuggestedTag />}</span>
            <span className="flex h-[47px] items-center gap-2.5 rounded-2xl bg-white/80 px-3 ring-1 ring-ink/10">
              <input type="color" value={p.color.hex} onChange={(e) => onChange({ color: { ...p.color, hex: e.target.value.toUpperCase() } }, ["hex"])} className="size-7 cursor-pointer rounded-full bg-transparent" aria-label="Colour swatch" />
              <span className="text-[13.5px] text-ink/60 tabular-nums">{p.color.hex.toUpperCase()}</span>
            </span>
          </label>
        </div>
      </Section>

      <Section title="Materials and make" sub="Shown on its page and used for search, season picks and Kai's answers.">
        <div className="grid gap-2.5">
          {p.materials.map((m, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2">
              <Combo value={m.label} placeholder="Detail, e.g. Collar" options={vocab.labels} onChange={(v) => setMaterial(i, { label: v })} />
              <div className="relative">
                <Combo value={m.value} placeholder="e.g. Wool herringbone" options={vocab.values[m.label] ?? []} onChange={(v) => setMaterial(i, { value: v })} />
                {adding && !touched?.has(`mat:${m.label}`) && m.value && (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                    <SuggestedTag />
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${m.label || "this detail"}`}
                onClick={() => onChange({ materials: p.materials.filter((_, j) => j !== i) }, [`mat:${m.label}`])}
                className="grid size-10 place-items-center rounded-full text-ink/50 hover:bg-ink/[0.06] hover:text-danger"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[2]">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div>
          <button type="button" onClick={() => onChange({ materials: [...p.materials, material("", "")] })} className="min-h-9 rounded-full bg-white px-3.5 text-[13px] font-semibold ring-1 ring-ink/10 hover:bg-white/70">
            Add a detail
          </button>
        </div>
      </Section>

      <Section title="Sizes" sub="Case packs follow the line; these say which sizes this style comes in.">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Combo label="Size range" value={p.sizes} max={30} options={vocab.sizes} suggested={auto("sizes")} onChange={(v) => onChange({ sizes: v }, ["sizes"])} />
          <Chips label="Sizes in the run" values={p.sizeRun} suggested={auto("sizeRun")} placeholder="Add a size" onChange={(v) => onChange({ sizeRun: v }, ["sizeRun"])} />
        </div>
      </Section>

      <Section title="The listing">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className={clsx(fieldLabel, "flex items-center gap-2")}>Description {auto("desc") && p.desc && <SuggestedTag />}</p>
            <div className="flex items-center gap-1.5">
              {!adding && descFor(p) !== p.desc && (
                <button type="button" onClick={() => (setUndo(p.desc), onChange({ desc: descFor(p) }, ["desc"]))} className="min-h-9 rounded-full px-3 text-[12.5px] font-semibold text-ink/60 hover:text-ink">
                  Suggest from the details
                </button>
              )}
              <button type="button" disabled={writing} onClick={write} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60">
                <AdminIcon name="sparkle" className="size-4" /> {writing ? "Writing…" : "Write with AI"}
              </button>
            </div>
          </div>
          <textarea aria-label="Description" rows={5} value={p.desc} onChange={(e) => (setUndo(null), onChange({ desc: e.target.value }, ["desc"]))} className={clsx(fieldInput, "resize-y leading-relaxed")} />
          <div className="mt-1 flex items-center justify-between gap-3 text-[12px]">
            <span className={aiNote ? "font-medium text-danger" : "text-ink/45"}>
              {aiNote}
              {undo !== null && !aiNote && (
                <button type="button" onClick={() => (onChange({ desc: undo }, ["desc"]), setUndo(null))} className="font-semibold text-ink/70 underline">
                  Undo
                </button>
              )}
            </span>
            <span className={clsx("tabular-nums", p.desc.length > 600 ? "font-semibold text-danger" : "text-ink/45")}>{p.desc.length}/600</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Short spec" value={p.spec} max={80} placeholder="e.g. Suede · Block heel" onChange={(v) => onChange({ spec: v }, ["spec"])} />
            {auto("spec") && p.spec ? (
              <p className="mt-1.5">
                <SuggestedTag />
              </p>
            ) : (
              !adding &&
              specFor(p) &&
              specFor(p) !== p.spec && (
                <button type="button" onClick={() => onChange({ spec: specFor(p) }, ["spec"])} className="mt-1.5 text-[12.5px] font-semibold text-ink/60 underline hover:text-ink">
                  Use “{specFor(p)}”
                </button>
              )
            )}
          </div>
          <Combo label="Cold rating (optional)" value={p.rating ?? ""} max={16} options={vocab.ratings} placeholder="e.g. −25°C" onChange={(v) => onChange({ rating: v || undefined }, ["rating"])} />
        </div>
        <Chips
          label="Search and filter tags"
          values={p.tags.filter((t) => t !== p.line)}
          options={vocab.tags}
          ideas={tagIdeas}
          suggested={auto("tags")}
          placeholder="Add a tag"
          onChange={(v) => onChange({ tags: [p.line, ...v.map((t) => t.toLowerCase())] }, ["tags"])}
        />
        <div>
          <p className={clsx(fieldLabel, "mb-1.5")}>Badge</p>
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <button key={b} type="button" aria-pressed={(p.badge ?? "None") === b} onClick={() => onChange({ badge: b === "None" ? undefined : b })} className={pill((p.badge ?? "None") === b)}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className={clsx(fieldLabel, "mb-1")}>Leads in these seasons</p>
          <p className="mb-2 text-[12px] text-ink/50">Seasons marked auto come from its kind and materials; add others to put it forward then too.</p>
          <div className="flex flex-wrap gap-2">
            {SEASON_IDS.map((s) => {
              const isAuto = seasons.includes(s);
              const on = isAuto || p.pins.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} disabled={isAuto} onClick={() => onChange({ pins: on ? p.pins.filter((x) => x !== s) : [...p.pins, s] })} className={pill(on)}>
                  {s}
                  {isAuto && <span className="ml-1 text-[11px] font-medium normal-case opacity-70">auto</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}

/** The side of the page: how the style reads, what's still missing, and what it might repeat. */
export function ProductAside({ item: p, others, adding, missing }: { item: Item; others: Item[]; adding: boolean; missing: string[] }) {
  const similar = adding ? similarStyles(p, others) : [];
  return (
    <aside className="grid gap-4 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-[24px] bg-white/65 p-3 ring-1 ring-white">
        <div className={clsx("relative grid aspect-[5/4] place-items-center overflow-hidden rounded-[18px]", SCENE_BG[p.scene])}>
          {p.outer.src ? (
            <Image src={p.outer.src} alt="" fill sizes="340px" className="object-contain p-[8%] drop-shadow-[0_14px_14px_rgb(18_20_22/.22)]" />
          ) : (
            <p className="text-[13px] text-ink/45">The main photo shows here</p>
          )}
          {p.badge && <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">{p.badge}</span>}
        </div>
        <div className="px-2 pt-3 pb-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15.5px] font-semibold">{p.name || "Style name"}</p>
              <p className="truncate text-[12.5px] text-ink/55">
                {LINE_LABEL[p.line]} · {categoryFor(p)}
              </p>
            </div>
            {p.color.name && <span className="size-4 flex-none rounded-full ring-2 ring-white" style={{ background: p.color.hex }} title={p.color.name} />}
          </div>
          {p.spec && <p className="mt-2 text-[12.5px] text-ink/70">{p.spec}</p>}
          <p className="mt-1 text-[12.5px] text-ink/55">{p.sizes}</p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-[24px] bg-white/65 p-5 ring-1 ring-white">
          <p className="text-[13.5px] font-semibold">Before it can go live</p>
          <ul className="mt-2 grid gap-1.5 text-[13px] text-ink/70">
            {missing.map((m) => (
              <li key={m} className="flex gap-2">
                <span aria-hidden="true" className="mt-[7px] size-1.5 flex-none rounded-full bg-[#b45309]" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {similar.length > 0 && (
        <div className="rounded-[24px] bg-white/65 p-5 ring-1 ring-white">
          <p className="text-[13.5px] font-semibold">Already in the catalogue?</p>
          <ul className="mt-2 grid gap-1 text-[13px]">
            {similar.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/products/${s.id}`} prefetch={false} className="font-medium underline">
                  {s.name}
                </Link>{" "}
                <span className="text-ink/55">
                  · {s.color.name} {s.type.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

/** Covers the whole screen, the panel's own bars included, with its top bar always in reach. */
export function FullPage({ title, sub, actions, children }: { title: string; sub?: string; actions: ReactNode; children: ReactNode }) {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    head.current?.focus();
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#eeede9] text-ink">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink/10 bg-[#eeede9]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <Link href="/admin/products" prefetch={false} scroll={false} className="flex min-h-10 items-center gap-1.5 rounded-full pr-3 pl-2 text-[13.5px] font-semibold text-ink/65 hover:bg-ink/[0.06] hover:text-ink">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-none stroke-current stroke-[1.9]">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All products
        </Link>
        <div className="min-w-0 flex-1 basis-40">
          <h2 ref={head} tabIndex={-1} className="truncate text-[20px] leading-tight font-semibold tracking-[-0.01em] outline-none">
            {title}
          </h2>
          {sub && <p className="truncate text-[12.5px] text-ink/55">{sub}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </header>
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 pb-24 sm:px-6">{children}</div>
    </div>
  );
}
