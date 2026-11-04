import { createHash } from "node:crypto";

/*
 * Photos for styles made in the admin panel. The browser uploads straight to Cloudinary with a signature from the
 * server (a photo is too big for a server action, and the secret stays here), and the cutout is the same one
 * scripts/upload-cloudinary.mjs makes for the studio photos.
 */

/** The only cloud next.config.ts lets next/image load from. */
export const PHOTO_CLOUD = "doulxmmm";
export const UPLOAD_FOLDER = "chime-long/added";
export const UPLOAD_FORMATS = "jpg,jpeg,png,webp,avif";

/** Transparent cutout trimmed to the shoe. */
const CUTOUT = "e_background_removal/e_trim/c_limit,w_1400,h_1400/f_webp,q_90";

/** Cloudinary's signature: the parameters sorted and joined, then the secret, hashed with SHA-1. */
export const signParams = (params: Record<string, string | number>, secret: string) =>
  createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + secret,
    )
    .digest("hex");

export const isUploadId = (id: string) => new RegExp(`^${UPLOAD_FOLDER}/[\\w-]{1,120}$`).test(id);
export const cutoutUrl = (id: string) => `https://res.cloudinary.com/${PHOTO_CLOUD}/image/upload/${CUTOUT}/${id}`;

/** A photo a style may use: one of the site's own, or one on our cloud. Anything else next/image would refuse. */
export const isPhotoSrc = (src: string) =>
  !src.includes("..") && (/^\/images\/[\w./-]+$/.test(src) || new RegExp(`^https://res\\.cloudinary\\.com/${PHOTO_CLOUD}/image/upload/[^?#\\s]+$`).test(src));

/** A transparent WebP's size: always the extended (VP8X) format, with 24-bit width-1 and height-1 at bytes 24 and 27. */
export function webpSize(webp: Buffer) {
  if (webp.length < 30 || webp.toString("ascii", 12, 16) !== "VP8X") return null;
  return { w: webp.readUIntLE(24, 3) + 1, h: webp.readUIntLE(27, 3) + 1 };
}
