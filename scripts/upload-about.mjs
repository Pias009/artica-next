/**
 * Uploads the About page's photos and videos to Cloudinary (folder chime-long/about) and writes
 * src/lib/about-media.json ({ images: { <slug>: { src, w, h } }, videos: { <name>: { src, poster } } }), which
 * src/lib/about-photos.ts reads. The files come from a folder of web-ready copies (resized, metadata removed, videos
 * in H.264), by default .about-media/{images,videos}:
 *
 *   node --env-file=.env.local scripts/upload-about.mjs [folder]
 *
 * Re-running replaces a file with the same name (overwrite), so a corrected photo keeps its address.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
if (!cloud || !key || !secret) throw new Error("Set CLOUDINARY_* in .env.local");

const ROOT = process.argv[2] ?? ".about-media";
const OUT = "src/lib/about-media.json";
const FOLDER = "chime-long/about";

const sign = (params) =>
  createHash("sha1")
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + secret)
    .digest("hex");

async function upload(file, kind, name) {
  const params = { overwrite: "true", invalidate: "true", public_id: `${FOLDER}/${name}`, timestamp: Math.floor(Date.now() / 1000) };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append("api_key", key);
  form.append("signature", sign(params));
  form.append("file", new Blob([await readFile(file)]), path.basename(file));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`${file}: ${json.error?.message ?? res.status}`);
  return json;
}

const media = { images: {}, videos: {} };
const stem = (f) => f.replace(/\.[a-z0-9]+$/i, "");

for (const f of (await readdir(path.join(ROOT, "images"))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()) {
  const r = await upload(path.join(ROOT, "images", f), "image", stem(f));
  media.images[stem(f)] = { src: r.secure_url, w: r.width, h: r.height };
  console.log("image", stem(f), r.width, "x", r.height);
}
for (const f of (await readdir(path.join(ROOT, "videos"))).filter((f) => /\.(mp4|webm|mov)$/i.test(f)).sort()) {
  const r = await upload(path.join(ROOT, "videos", f), "video", stem(f));
  // the poster is a frame Cloudinary cuts from the video itself (2 s in), as a JPEG
  const poster = r.secure_url.replace("/video/upload/", "/video/upload/so_2,q_auto,w_1280/").replace(/\.[a-z0-9]+$/i, ".jpg");
  media.videos[stem(f)] = { src: r.secure_url, poster };
  console.log("video", stem(f), r.duration?.toFixed?.(1) ?? "", "s");
}

await writeFile(OUT, JSON.stringify(media, null, 1) + "\n");
console.log(`${Object.keys(media.images).length} images, ${Object.keys(media.videos).length} videos → ${OUT}`);
