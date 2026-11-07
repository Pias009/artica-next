"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRef, useState } from "react";
import { Field } from "../ui";
import { uploadImage } from "../upload-image";
import type { SeasonCampaignConfig } from "@/components/home/EditorialCampaignBanner";
import type { HeroSeasonCopy } from "@/components/home/HeroSpotlight";
import { CAMPAIGN_PHOTOS, type SeasonCopy } from "@/lib/season-copy";

type Style = { slug: string; name: string; line: string };

/**
 * One season's words and photo: the hero (badge, headline, line) and the campaign banner (tag, headline, line, accent
 * colour, photo, styles shown worn). Each box shows the built-in words faded; an empty box keeps them.
 */
export function SeasonEditor({
  label,
  hero,
  campaign,
  value,
  styles,
  pending,
  error,
  onSave,
}: {
  label: string;
  hero: HeroSeasonCopy;
  campaign: SeasonCampaignConfig;
  value: SeasonCopy;
  styles: Style[];
  pending: boolean;
  error: string | null;
  onSave: (v: SeasonCopy) => void;
}) {
  const [h, setH] = useState(value.hero ?? {});
  const [c, setC] = useState(value.campaign ?? {});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const image = c.image || campaign.image;
  const accent = c.accentColor || campaign.accentColor;
  const worn = c.wornSlugs?.length ? c.wornSlugs : campaign.wornSlugs;
  const dirty = JSON.stringify({ hero: h, campaign: c }) !== JSON.stringify({ hero: value.hero ?? {}, campaign: value.campaign ?? {} });

  const upload = async (f: File) => {
    setUploadError(null);
    setUploading("Uploading…");
    try {
      const src = await uploadImage(f);
      setC({ ...c, image: src });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "The photo couldn't be uploaded.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      <section aria-label={`${label} hero`} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <h3 className="text-[14px] font-semibold">Home page hero</h3>
        <p className="-mt-2 text-[12.5px] text-ink/55">The first thing visitors see while it&apos;s {label.toLowerCase()} for them.</p>
        <Field label="Badge" value={h.eyebrowBadge ?? ""} max={40} placeholder={hero.eyebrowBadge} onChange={(v) => setH({ ...h, eyebrowBadge: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Headline, start" value={h.headlineLead ?? ""} max={60} placeholder={hero.headlineLead} onChange={(v) => setH({ ...h, headlineLead: v })} />
          <Field label="Headline, purple italic end" value={h.headlineAccent ?? ""} max={60} placeholder={hero.headlineAccent} onChange={(v) => setH({ ...h, headlineAccent: v })} />
        </div>
        <Field label="Supporting line" value={h.description ?? ""} max={160} multiline placeholder={hero.description} onChange={(v) => setH({ ...h, description: v })} />
      </section>

      <section aria-label={`${label} campaign`} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <h3 className="text-[14px] font-semibold">Campaign banner</h3>
        <div
          className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-ink"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void upload(f);
          }}
        >
          <Image src={image} alt="" fill sizes="480px" className="object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgb(12_13_14/.75),transparent_60%)]" />
          <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[11.5px] font-semibold text-white">{c.seasonTag || campaign.seasonTag}</span>
          <p className="absolute inset-x-4 bottom-3 text-[15px] leading-snug font-semibold text-white">
            {c.headlineLead || campaign.headlineLead}
            <span style={{ color: accent }}>{c.headlineAccent || campaign.headlineAccent}</span>
          </p>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Photo</p>
          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
            {[campaign.image, ...CAMPAIGN_PHOTOS.filter((p) => p !== campaign.image), ...(c.image && !CAMPAIGN_PHOTOS.includes(c.image) && c.image !== campaign.image ? [c.image] : [])].map((src) => (
              <button
                key={src}
                type="button"
                aria-pressed={image === src}
                aria-label={src === campaign.image ? "Built-in photo" : `Use photo ${src.split("/").pop()}`}
                onClick={() => setC({ ...c, image: src === campaign.image ? "" : src })}
                className={clsx("relative h-14 w-24 flex-none overflow-hidden rounded-lg ring-2 ring-offset-1", image === src ? "ring-ink" : "ring-transparent hover:ring-ink/30")}
              >
                <Image src={src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
          <button
            type="button"
            onClick={() => file.current?.click()}
            disabled={!!uploading}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/25 bg-white/70 text-[13.5px] font-semibold hover:border-ink/50 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {uploading ?? "Upload a photo from your computer"}
          </button>
          {uploadError && <p className="mt-1 text-[12.5px] text-danger">{uploadError}</p>}
          <p className="mt-1 text-[12px] text-ink/50">Or drop a photo on the preview. Wide photos work best (16:9 or wider); it&apos;s resized for the web before upload. The first one above is the built-in photo.</p>
        </div>
        <Field label="Photo description (for screen readers)" value={c.alt ?? ""} max={200} multiline placeholder={campaign.alt} onChange={(v) => setC({ ...c, alt: v })} />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Tag" value={c.seasonTag ?? ""} max={30} placeholder={campaign.seasonTag} onChange={(v) => setC({ ...c, seasonTag: v })} />
          <label className="grid gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink/70">Accent colour</span>
            <span className="flex items-center gap-2">
              <input type="color" aria-label="Accent colour" value={accent} onChange={(e) => setC({ ...c, accentColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg" />
              {c.accentColor && (
                <button type="button" onClick={() => setC({ ...c, accentColor: "" })} className="text-[12px] font-semibold text-ink/60 underline">
                  Reset
                </button>
              )}
            </span>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Headline, start" value={c.headlineLead ?? ""} max={70} placeholder={campaign.headlineLead} onChange={(v) => setC({ ...c, headlineLead: v })} />
          <Field label="Headline, coloured end" value={c.headlineAccent ?? ""} max={70} placeholder={campaign.headlineAccent} onChange={(v) => setC({ ...c, headlineAccent: v })} />
        </div>
        <Field label="Supporting line" value={c.description ?? ""} max={200} multiline placeholder={campaign.description} onChange={(v) => setC({ ...c, description: v })} />
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink/70">Styles shown worn (up to 2)</p>
          <div className="flex flex-wrap gap-2">
            {[0, 1].map((k) => (
              <select
                key={k}
                aria-label={`Worn style ${k + 1}`}
                value={worn[k] ?? ""}
                onChange={(e) => {
                  const next = [...worn];
                  next[k] = e.target.value;
                  setC({ ...c, wornSlugs: next.filter(Boolean) });
                }}
                className="min-h-10 flex-1 rounded-full bg-white px-3 text-[13px] ring-1 ring-ink/10 outline-none"
              >
                <option value="">None</option>
                {styles.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name} · {s.line}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="rounded-2xl bg-danger px-4 py-2 text-[13px] font-medium text-white">{error}</p>}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 bg-[#f4f4f2]/95 py-3">
        <button
          type="button"
          onClick={() => {
            setH({});
            setC({});
          }}
          className="min-h-10 px-2 text-[13px] font-semibold text-ink/60 hover:text-ink"
        >
          Back to the built-in words
        </button>
        <button type="button" disabled={!dirty || pending} onClick={() => onSave({ hero: h, campaign: c })} className="min-h-10 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white disabled:opacity-40">
          {pending ? "Publishing…" : `Publish ${label.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}
