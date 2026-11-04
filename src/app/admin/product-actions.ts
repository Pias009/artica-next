"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { cutoutUrl, isUploadId, PHOTO_CLOUD, signParams, UPLOAD_FOLDER, UPLOAD_FORMATS, webpSize } from "@/lib/admin/cloudinary";
import { describeFacts } from "@/lib/assistant/admin-ai";
import { CASE_PACK, PACK } from "@/lib/products";

/* The add and edit pages' photo and description helpers: each checks the admin first. */

/** Lets the browser send one photo to Cloudinary. The signature fixes the folder and formats, and lasts an hour. */
export async function signUploadAction() {
  await requireAdmin();
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !apiKey || !secret) return { ok: false as const, error: "Uploads need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on this server." };
  if (cloud !== PHOTO_CLOUD) return { ok: false as const, error: `Uploads have to go to the ${PHOTO_CLOUD} Cloudinary account: the site can't show photos from ${cloud}.` };
  const params = { allowed_formats: UPLOAD_FORMATS, folder: UPLOAD_FOLDER, timestamp: Math.floor(Date.now() / 1000) };
  return { ok: true as const, cloud, apiKey, params, signature: signParams(params, secret) };
}

export type Cutout = { status: "pending" } | { status: "ready"; shot: { src: string; w: number; h: number } } | { status: "failed" };

/** The photo with its background removed. Cloudinary makes it on first request, answering 423 until it's done. */
export async function cutoutAction(id: string): Promise<Cutout> {
  await requireAdmin();
  if (!isUploadId(String(id))) return { status: "failed" };
  const src = cutoutUrl(id);
  try {
    const res = await fetch(src);
    if (res.status === 423) return { status: "pending" };
    if (!res.ok) {
      console.error("[admin] cutout failed", res.status, res.headers.get("x-cld-error"));
      return { status: "failed" };
    }
    const size = webpSize(Buffer.from(await res.arrayBuffer()));
    return size ? { status: "ready", shot: { src, ...size } } : { status: "failed" };
  } catch (e) {
    console.error("[admin] cutout failed", e);
    return { status: "failed" };
  }
}

const Draft = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.string().trim().min(1).max(60),
  line: z.enum(["men", "women", "kids"]),
  colour: z.string().trim().max(24),
  materials: z.array(z.string().max(120)).max(12),
  sizes: z.string().trim().max(30),
  rating: z.string().trim().max(16).nullable(),
  current: z.string().trim().max(600),
});

/** A listing description from the form as it stands, saved or not. Empty when the name or type is missing. */
export async function describeDraftAction(draft: unknown) {
  await requireAdmin();
  const d = Draft.safeParse(draft);
  if (!d.success) return "";
  const pack = CASE_PACK[d.data.line].map(([s, n]) => `${s}×${n}`).join(", ");
  return describeFacts({ ...d.data, casePack: `${PACK} pairs per case, sizes ${pack}` });
}
