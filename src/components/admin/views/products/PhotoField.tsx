"use client";

import clsx from "clsx";
import Image from "next/image";
import { useId, useState } from "react";
import { fieldLabel } from "./Combo";
import { cutoutAction, signUploadAction } from "@/app/admin/product-actions";
import type { Scene, Shot } from "@/lib/products";

export const SCENE_BG: Record<Scene, string> = {
  sage: "bg-[#e6ebe3]",
  sand: "bg-[#efe8dd]",
  blush: "bg-[#f1e6e6]",
  stone: "bg-[#e8e8e6]",
};

export type LibraryPhoto = Shot & { name: string };

const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary's limit for an image on the free plan
const CUTOUT_TRIES = 24; // 2 minutes, a try every 5 seconds

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends one photo to Cloudinary and, if asked, waits for the transparent cutout. Falls back to the photo as uploaded. */
export async function uploadPhoto(file: File, cut: boolean, status: (s: string) => void): Promise<{ shot: Shot; note?: string }> {
  const sign = await signUploadAction();
  if (!sign.ok) throw new Error(sign.error);
  const form = new FormData();
  for (const [k, v] of Object.entries(sign.params)) form.append(k, String(v));
  form.append("api_key", sign.apiKey);
  form.append("signature", sign.signature);
  form.append("file", file);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloud}/image/upload`, { method: "POST", body: form });
  const json = (await res.json()) as { error?: { message?: string }; public_id: string; secure_url: string; width: number; height: number };
  if (!res.ok) throw new Error(json.error?.message ?? "Cloudinary didn't accept that photo.");
  const plain = { shot: { src: json.secure_url, w: json.width, h: json.height } };
  if (!cut) return plain;
  status("Removing the background…");
  for (let i = 0; i < CUTOUT_TRIES; i++) {
    const c = await cutoutAction(json.public_id);
    if (c.status === "ready") return { shot: c.shot };
    if (c.status === "failed") break;
    await wait(5000);
  }
  return { ...plain, note: "The background couldn't be removed, so the photo is used as uploaded." };
}

/** One of a style's photos: drop or pick a file, or reuse a photo already in the catalogue. */
export function PhotoField({
  label,
  hint,
  shot,
  scene,
  library,
  onChange,
}: {
  label: string;
  hint?: string;
  shot?: Shot;
  scene: Scene;
  library: LibraryPhoto[];
  onChange: (s: Shot | null) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cut, setCut] = useState(true);
  const [browsing, setBrowsing] = useState(false);
  const [over, setOver] = useState(false);
  const [query, setQuery] = useState("");
  const has = !!shot?.src;

  const take = async (file?: File) => {
    if (!file) return;
    setError(null);
    setNote(null);
    if (!file.type.startsWith("image/")) return setError("That isn't an image. Use a JPG, PNG, WebP or AVIF photo.");
    if (file.size > MAX_BYTES) return setError("That photo is over 10 MB. Use a smaller one.");
    setStatus("Uploading…");
    try {
      const r = await uploadPhoto(file, cut, setStatus);
      onChange(r.shot);
      if (r.note) setNote(r.note);
      setBrowsing(false);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The upload didn't finish. Check your connection and try again.");
    } finally {
      setStatus(null);
    }
  };

  const found = library.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="min-w-0">
      <p className={clsx(fieldLabel, "mb-1.5")}>{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
        className={clsx(
          "relative grid aspect-[5/4] place-items-center overflow-hidden rounded-3xl transition-shadow",
          has ? SCENE_BG[scene] : "bg-white/60",
          over ? "ring-2 ring-ink" : !has && "ring-1 ring-ink/15 ring-dashed",
        )}
      >
        {has ? (
          <Image src={shot.src} alt={label} fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-contain p-[8%] drop-shadow-[0_14px_14px_rgb(18_20_22/.22)]" />
        ) : (
          <p className="px-6 text-center text-[13.5px] text-ink/55">Drop a photo here{hint && <span className="mt-1 block text-[12px] text-ink/45">{hint}</span>}</p>
        )}
        {status && (
          <div role="status" className="absolute inset-0 grid place-items-center bg-white/75 text-[14px] font-semibold">
            {status}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={clsx("flex min-h-9 cursor-pointer items-center rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2", status && "pointer-events-none opacity-60")}>
          {has ? "Replace" : "Upload"}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={!!status}
            onChange={(e) => {
              void take(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" aria-expanded={browsing} onClick={() => setBrowsing((b) => !b)} className="min-h-9 rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink/70 ring-1 ring-ink/10 hover:text-ink">
          Use a catalogue photo
        </button>
        {has && (
          <button type="button" onClick={() => onChange(null)} className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-ink/55 hover:text-danger">
            Remove
          </button>
        )}
      </div>
      <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink/60">
        <input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} className="size-4 accent-ink" /> Remove the background from uploads
      </label>

      {error && (
        <p role="alert" className="mt-2 text-[12.5px] font-medium text-danger">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="mt-2 text-[12.5px] text-ink/60">
          {note}
        </p>
      )}

      {browsing && (
        <div className="mt-3 rounded-2xl bg-white/70 p-3 ring-1 ring-ink/10">
          <input
            aria-label="Find a catalogue photo by style name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find by style name"
            className="mb-2.5 min-h-9 w-full rounded-full bg-white px-3.5 text-[13.5px] ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-ink"
          />
          <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {found.map((p) => (
              <li key={p.src}>
                <button
                  type="button"
                  aria-label={`Use the photo of ${p.name}`}
                  title={p.name}
                  onClick={() => {
                    onChange({ src: p.src, w: p.w, h: p.h });
                    setNote(null);
                    setBrowsing(false);
                  }}
                  className="relative block aspect-square w-full rounded-xl bg-[#ecebe7] transition-shadow hover:ring-2 hover:ring-ink"
                >
                  <Image src={p.src} alt="" fill sizes="96px" className="object-contain p-[8%]" />
                </button>
              </li>
            ))}
          </ul>
          {!found.length && <p className="py-3 text-center text-[13px] text-ink/55">No style by that name.</p>}
        </div>
      )}
    </div>
  );
}
