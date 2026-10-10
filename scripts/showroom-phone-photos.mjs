/**
 * Builds the phone-size copies of the 3D showroom's shoe photos: public/showroom/shoes/*.webp (640 px)
 * -> public/showroom/shoes-sm/*.webp (320 px). Phones load these instead; on a small screen they look the same
 * at about a third of the download.
 *
 *   node scripts/showroom-phone-photos.mjs
 *
 * Run it again after adding or replacing a photo, then bump SHOWROOM_ASSET_VERSION in src/lib/showroom.ts
 * so browsers that cached the old photo (see the /showroom headers in next.config.ts) fetch the new one.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/showroom/shoes";
const OUT = "public/showroom/shoes-sm";
const WIDTH = 320;

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => f.endsWith(".webp"));
let before = 0;
let after = 0;
for (const f of files) {
  const to = path.join(OUT, f);
  // alphaQuality keeps the cut-out edges clean; the shoes sit on the shelves through their alpha
  await sharp(path.join(SRC, f)).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(to);
  before += (await stat(path.join(SRC, f))).size;
  after += (await stat(to)).size;
}
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`${files.length} photos: ${kb(before)} -> ${kb(after)} in ${OUT}`);
