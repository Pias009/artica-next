/**
 * Uploads the raw style photos in "Need to Add/<Line>/" to Cloudinary, then requests each
 * background-removed cutout once (Cloudinary builds it on first request) and writes
 * src/lib/cloudinary-shots.json ({ "<line>/<file stem>": { id, src, w, h } }).
 *
 *   node --env-file=.env.local scripts/upload-cloudinary.mjs
 *
 * Photos already in the manifest are not uploaded again, so re-running only adds new files.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
if (!cloud || !key || !secret) throw new Error("Set CLOUDINARY_* in .env.local");

const SRC = "Need to Add";
const OUT = "src/lib/cloudinary-shots.json";
/** Transparent cutout trimmed to the shoe, like the hand-cut photos in public/images (WebP keeps alpha at ~1/8 the PNG size). */
const CUTOUT = "e_background_removal/e_trim/c_limit,w_1400,h_1400/f_webp,q_90";
/** Supplier shots with a SKU label printed top-right: crop it off before the cutout. */
const LABELLED = new Set([
  "women/2a0fd60185fdba8494e548585077787",
  "women/308e8546f77064af693aefd35e11afa",
  "women/4c31c8ed1604a52be46661784403c63",
  "women/5384d7b56468083c165e48ad5209940",
  "women/5cc365c691deaabfb39e90662c7c0c7",
  "women/bbd7a7391462e36c00be3da3316c77f",
  "women/e23d38f68a76163235fd9c169e309f9",
]);

const sign = (params) =>
  createHash("sha1")
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + secret)
    .digest("hex");

async function upload(file, publicId) {
  const params = { overwrite: "false", public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append("api_key", key);
  form.append("signature", sign(params));
  form.append("file", new Blob([await readFile(file)]), path.basename(file));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`${file}: ${json.error?.message ?? res.status}`);
  return json.public_id;
}

/** Fetches the cutout until Cloudinary has finished it (423 while processing); returns its size. */
async function cutout(src) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(src);
    if (res.ok) {
      // Transparent WebP is always the extended (VP8X) format: 24-bit canvas width-1 / height-1 at bytes 24 and 27.
      const webp = Buffer.from(await res.arrayBuffer());
      if (webp.toString("ascii", 12, 16) !== "VP8X") throw new Error(`${src}: expected a transparent WebP`);
      return { w: webp.readUIntLE(24, 3) + 1, h: webp.readUIntLE(27, 3) + 1 };
    }
    if (res.status !== 423) throw new Error(`${src}: ${res.status} ${res.headers.get("x-cld-error") ?? ""}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`${src}: still processing`);
}

let manifest = {};
try {
  manifest = JSON.parse(await readFile(OUT, "utf8"));
} catch {}

for (const line of await readdir(SRC)) {
  const files = (await readdir(path.join(SRC, line))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  for (const f of files) {
    const k = `${line.toLowerCase()}/${path.parse(f).name}`;
    const id = manifest[k]?.id ?? (await upload(path.join(SRC, line, f), `chime-long/${k}`));
    const crop = LABELLED.has(k) ? "c_crop,g_south,h_0.75,w_1.0/" : "";
    const src = `https://res.cloudinary.com/${cloud}/image/upload/${crop}${CUTOUT}/${id}`;
    manifest[k] = { id, src, ...(await cutout(src)) };
    console.log(`✓ ${k} ${manifest[k].w}x${manifest[k].h}`);
  }
}
await writeFile(OUT, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${Object.keys(manifest).length} shots → ${OUT}`);
