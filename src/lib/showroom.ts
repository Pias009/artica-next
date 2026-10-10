/**
 * Layout of the 3D showroom (from the client's Blender scene): which wall and shelf each style sits on,
 * and the photo used as its texture (in public/showroom/shoes). Product details come from products.ts by slug.
 */
import type { ProductLine } from "./products";

export type Wall = "left" | "front" | "right" | "island";
export type ShowroomShoe = {
  slug: string;
  wall: Wall;
  line: ProductLine;
  category: string;
  name: string;
  type: string;
  img: string;
  size: [number, number];
  img2?: string;
  size2?: [number, number];
};
/**
 * The showroom photos are cached by browsers for a year (next.config.ts). Bump this after replacing a photo
 * (and re-running scripts/showroom-phone-photos.mjs) so visitors fetch the new one.
 */
export const SHOWROOM_ASSET_VERSION = 1;

export type ShelfUnit = { start: number; L: number; bays: number; levels: number[]; title: string };

export const SHELF_UNITS: Record<Exclude<Wall, "island">, ShelfUnit> = {
  left: { start: 1, L: 5.2, bays: 4, levels: [0.42, 0.84, 1.26, 1.68, 2.1], title: "WOMEN · BOOTS" },
  front: { start: -2.7, L: 5.4, bays: 4, levels: [0.42, 0.84, 1.26, 1.68, 2.1], title: "WOMEN · SHOES & SANDALS" },
  right: { start: 6.2, L: 5.2, bays: 4, levels: [0.42, 0.84, 1.26, 1.68], title: "KIDS" },
};

export const SHOWROOM: ShowroomShoe[] = [
  { slug: "gloss", wall: "front", line: "women", category: "Sneakers", name: "Gloss", type: "Patent platform high-top", img: "gloss", size: [640, 474] },
  { slug: "dune", wall: "front", line: "women", category: "Sneakers", name: "Dune", type: "High-top zip sneaker", img: "dune", size: [640, 404] },
  { slug: "aurum", wall: "front", line: "women", category: "Sneakers", name: "Aurum", type: "Zip sneaker", img: "aurum", size: [640, 321] },
  { slug: "zinnia", wall: "front", line: "women", category: "Sneakers", name: "Zinnia", type: "Zip sneaker", img: "zinnia", size: [640, 298] },
  { slug: "oslo", wall: "front", line: "women", category: "Loafers", name: "Oslo", type: "Block-heel patent loafer", img: "oslo", size: [640, 399] },
  { slug: "luna", wall: "front", line: "women", category: "Loafers", name: "Luna", type: "Block-heel loafer", img: "luna", size: [640, 302] },
  { slug: "bordeaux", wall: "front", line: "women", category: "Loafers", name: "Bordeaux", type: "Block-heel loafer", img: "bordeaux", size: [640, 295] },
  { slug: "bergen", wall: "front", line: "women", category: "Loafers", name: "Bergen", type: "Patent bit loafer", img: "bergen", size: [640, 240] },
  { slug: "ivy", wall: "front", line: "women", category: "Loafers", name: "Ivy", type: "Bit loafer", img: "ivy", size: [640, 249] },
  { slug: "astrid", wall: "front", line: "women", category: "Loafers", name: "Astrid", type: "Chain lug loafer", img: "astrid", size: [640, 289] },
  { slug: "onyx", wall: "front", line: "women", category: "Derbies & Mary Janes", name: "Onyx", type: "Patent derby", img: "onyx", size: [640, 312] },
  { slug: "jet", wall: "front", line: "women", category: "Derbies & Mary Janes", name: "Jet", type: "Patent derby", img: "jet", size: [640, 282] },
  { slug: "merlot", wall: "front", line: "women", category: "Derbies & Mary Janes", name: "Merlot", type: "Patent Mary Jane", img: "merlot", size: [640, 258] },
  { slug: "odette", wall: "front", line: "women", category: "Derbies & Mary Janes", name: "Odette", type: "Patent Mary Jane", img: "odette", size: [640, 246] },
  { slug: "nova", wall: "front", line: "women", category: "Pumps", name: "Nova", type: "Bow pump", img: "nova", size: [640, 255] },
  { slug: "scarlet", wall: "front", line: "women", category: "Pumps", name: "Scarlet", type: "Bow pump", img: "scarlet", size: [640, 259] },
  { slug: "sienna", wall: "front", line: "women", category: "Flats", name: "Sienna", type: "Cross-strap flat", img: "sienna", size: [640, 245] },
  { slug: "indigo", wall: "front", line: "women", category: "Flats", name: "Indigo", type: "Cross-strap flat", img: "indigo", size: [640, 250] },
  { slug: "noir", wall: "front", line: "women", category: "Flats", name: "Noir", type: "Ballet flat", img: "noir", size: [640, 246] },
  { slug: "isla", wall: "front", line: "women", category: "Flats", name: "Isla", type: "Ballet flat", img: "isla", size: [640, 244] },
  { slug: "cove-brown", wall: "front", line: "women", category: "Sandals & slides", name: "Cove Brown", type: "Buckle cork sandal", img: "cove-brown", size: [328, 163] },
  { slug: "cove-taupe", wall: "front", line: "women", category: "Sandals & slides", name: "Cove Taupe", type: "Buckle cork sandal", img: "cove-taupe", size: [336, 175] },
  { slug: "cove-grey", wall: "front", line: "women", category: "Sandals & slides", name: "Cove Grey", type: "Buckle cork sandal", img: "cove-grey", size: [304, 162] },
  { slug: "lido-black", wall: "front", line: "women", category: "Sandals & slides", name: "Lido Black", type: "Slingback cork sandal", img: "lido-black", size: [329, 170] },
  { slug: "lido-gold", wall: "front", line: "women", category: "Sandals & slides", name: "Lido Gold", type: "Slingback cork sandal", img: "lido-gold", size: [330, 167] },
  { slug: "capri", wall: "front", line: "women", category: "Sandals & slides", name: "Capri", type: "Two-strap cork slide", img: "capri", size: [328, 167] },
  { slug: "marina", wall: "front", line: "women", category: "Sandals & slides", name: "Marina", type: "Cut-out cork slide", img: "marina", size: [325, 156] },
  { slug: "riviera", wall: "front", line: "women", category: "Sandals & slides", name: "Riviera", type: "Colour-block wedge sandal", img: "riviera", size: [640, 345] },
  { slug: "sol", wall: "front", line: "women", category: "Sandals & slides", name: "Sol", type: "Strap wedge sandal", img: "sol", size: [640, 349] },
  { slug: "nord", wall: "island", line: "men", category: "Lace-up boots", name: "Nord", type: "Winter leather lace-up", img: "p04-men-leather-winter-lace-up-outer-view", size: [640, 449], img2: "p04-men-leather-winter-lace-up-zip-view", size2: [640, 454] },
  { slug: "tundra", wall: "island", line: "men", category: "Ankle boots", name: "Tundra", type: "Shearling leather zip boot", img: "p05-leather-shearling-zip-boot-outer-view", size: [640, 500] },
  { slug: "mira", wall: "left", line: "women", category: "Ankle boots", name: "Mira", type: "Suede ankle zip boot", img: "p01-women-suede-ankle-outer-view", size: [640, 595], img2: "p01-women-suede-ankle-zip-view", size2: [640, 575] },
  { slug: "harbor", wall: "left", line: "women", category: "Ankle boots", name: "Harbor", type: "Quilted-collar zip boot", img: "harbor", size: [640, 524] },
  { slug: "vega", wall: "left", line: "women", category: "Ankle boots", name: "Vega", type: "Buckle ankle boot", img: "vega", size: [640, 481] },
  { slug: "maple", wall: "left", line: "women", category: "Ankle boots", name: "Maple", type: "Buckle ankle boot", img: "maple", size: [640, 490] },
  { slug: "frost", wall: "left", line: "women", category: "Lace-up boots", name: "Frost", type: "Knit-cuff lace-up boot", img: "frost", size: [640, 625] },
  { slug: "raven", wall: "left", line: "women", category: "Lace-up boots", name: "Raven", type: "Knit-cuff lace-up boot", img: "raven", size: [640, 628] },
  { slug: "lynx", wall: "left", line: "women", category: "Lace-up boots", name: "Lynx", type: "Fur-cuff heeled boot", img: "lynx", size: [640, 569] },
  { slug: "sable", wall: "left", line: "women", category: "Lace-up boots", name: "Sable", type: "Fur-cuff heeled boot", img: "sable", size: [640, 564] },
  { slug: "fjord", wall: "left", line: "women", category: "Lace-up boots", name: "Fjord", type: "Lace-up zip boot", img: "fjord", size: [640, 443] },
  { slug: "ember", wall: "left", line: "women", category: "Lace-up boots", name: "Ember", type: "Lace-up zip boot", img: "ember", size: [640, 518] },
  { slug: "ink", wall: "left", line: "women", category: "Lace-up boots", name: "Ink", type: "Patent buckle lace-up boot", img: "ink", size: [640, 499] },
  { slug: "midnight", wall: "left", line: "women", category: "Lace-up boots", name: "Midnight", type: "Patent heeled lace-up boot", img: "midnight", size: [640, 603] },
  { slug: "polar", wall: "left", line: "women", category: "Combat boots", name: "Polar", type: "Lace-up combat boot", img: "polar", size: [640, 565] },
  { slug: "storm", wall: "left", line: "women", category: "Combat boots", name: "Storm", type: "Buckle combat boot", img: "storm", size: [640, 587] },
  { slug: "tove", wall: "left", line: "women", category: "Chelsea boots", name: "Tove", type: "Heeled chelsea boot", img: "tove", size: [640, 565] },
  { slug: "ash", wall: "left", line: "women", category: "Chelsea boots", name: "Ash", type: "Chelsea boot", img: "ash", size: [640, 563] },
  { slug: "slate", wall: "left", line: "women", category: "Chelsea boots", name: "Slate", type: "Chelsea boot", img: "slate", size: [640, 506] },
  { slug: "cedar", wall: "left", line: "women", category: "Chelsea boots", name: "Cedar", type: "Lug chelsea boot", img: "cedar", size: [640, 517] },
  { slug: "shadow", wall: "left", line: "women", category: "Chelsea boots", name: "Shadow", type: "Platform chelsea boot", img: "shadow", size: [640, 418] },
  { slug: "toffee", wall: "left", line: "women", category: "Chelsea boots", name: "Toffee", type: "Platform chelsea boot", img: "toffee", size: [640, 439] },
  { slug: "mira-tall", wall: "left", line: "women", category: "Tall boots", name: "Mira Tall", type: "Knee-high suede boot", img: "p02-women-tall-suede-outer-view", size: [358, 640], img2: "p02-women-tall-suede-zip-view", size2: [383, 640] },
  { slug: "eclipse", wall: "left", line: "women", category: "Tall boots", name: "Eclipse", type: "Patent knee-high boot", img: "eclipse", size: [349, 640] },
  { slug: "pop", wall: "right", line: "kids", category: "Ankle boots", name: "Pop", type: "Patent lace-up boot", img: "p03-pink-patent-lace-up-outer-view", size: [640, 507], img2: "p03-pink-patent-lace-up-zip-view", size2: [640, 494] },
  { slug: "petal", wall: "right", line: "kids", category: "Ankle boots", name: "Petal", type: "Strap ankle boot", img: "petal", size: [640, 491] },
  { slug: "puffin", wall: "right", line: "kids", category: "Snow boots", name: "Puffin", type: "Two-strap snow boot", img: "puffin", size: [640, 559] },
  { slug: "flurry", wall: "right", line: "kids", category: "Snow boots", name: "Flurry", type: "Faux-fur snow boot", img: "flurry", size: [420, 402] },
  { slug: "bluebell", wall: "right", line: "kids", category: "Hiker boots", name: "Bluebell", type: "Strap hiker boot", img: "bluebell", size: [547, 385] },
  { slug: "lilac", wall: "right", line: "kids", category: "Hiker boots", name: "Lilac", type: "Toggle-lace hiker boot", img: "lilac", size: [640, 514] },
  { slug: "blossom", wall: "right", line: "kids", category: "Hiker boots", name: "Blossom", type: "Quilted hiker boot", img: "blossom", size: [640, 415] },
  { slug: "scout", wall: "right", line: "kids", category: "Hiker boots", name: "Scout", type: "Strap work boot", img: "scout", size: [640, 503] },
  { slug: "rosie", wall: "right", line: "kids", category: "Sneakers", name: "Rosie", type: "High-top strap sneaker", img: "rosie", size: [640, 426] },
  { slug: "rook", wall: "right", line: "kids", category: "Sneakers", name: "Rook", type: "High-top strap sneaker", img: "rook", size: [640, 409] },
  { slug: "comet", wall: "right", line: "kids", category: "Sneakers", name: "Comet", type: "High-top sneaker", img: "comet", size: [640, 395] },
  { slug: "moss", wall: "right", line: "kids", category: "Sneakers", name: "Moss", type: "High-top sneaker", img: "moss", size: [640, 410] },
  { slug: "splash", wall: "right", line: "kids", category: "Sandals & slides", name: "Splash", type: "Closed-toe sport sandal", img: "splash", size: [599, 346] },
  { slug: "coral", wall: "right", line: "kids", category: "Sandals & slides", name: "Coral", type: "Closed-toe sport sandal", img: "coral", size: [640, 370] },
];
