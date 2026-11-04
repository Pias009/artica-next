// The admin panel's Products view: suggestions, what saving sends, what the server accepts, and how the site applies it.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import "./helpers/resolve-ts.mjs";

const { isPhotoSrc, isUploadId, signParams, webpSize } = await import("../src/lib/admin/cloudinary.ts");
const { autofill, blankDraft, descFor, fromTemplate, matchOptions, nameIdeas, problems, similarStyles, specFor, tagsFor, toItem, toPayload, uniqueSlug, vocabOf, withLine } = await import("../src/lib/admin/product-draft.ts");
const { AddedSchema, ProductsPayload } = await import("../src/lib/admin/product-schema.ts");
const { categoryFor } = await import("../src/lib/product-categories.ts");
const { allProducts, applyProductEdits, builtInProducts, byId, categoryOf, getProduct, groupOf, products } = await import("../src/lib/products.ts");
const { publicContent, withDefaults } = await import("../src/lib/content/model.ts");

const built = builtInProducts();
const vocab = vocabOf(built);
const items = () => built.map((base) => toItem({ base, added: false, inquiries: 0 }));
const fill = (patch, touched = []) => autofill({ ...blankDraft(), ...patch }, new Set(touched), built, vocab);
const photo = { src: "https://res.cloudinary.com/doulxmmm/image/upload/v1/chime-long/added/x.webp", w: 800, h: 600 };
/** A finished new style, as the add page would send it. */
const fresh = (over = {}) => {
  const p = fill({ name: "Wren", type: "Suede ankle zip boot", outer: photo, color: { name: "Black", hex: "#000000" }, ...over });
  return { ...p, slug: uniqueSlug(p.name, built.map((b) => b.slug)) };
};

afterEach(() => applyProductEdits({}));

/* ---------- categories: the move out of products.ts changes nothing ---------- */

test("every built-in style keeps a category, and kids' lace-ups stay with their ankle boots", () => {
  for (const p of built) assert.ok(categoryOf(p), p.name);
  assert.equal(categoryFor({ type: "Lace-up boot", line: "kids" }), "Ankle boots");
  assert.equal(categoryFor({ type: "Lace-up boot", line: "men" }), "Lace-up boots");
  assert.equal(categoryFor({ type: "Lace-up boot", line: "men", category: "Hiker boots" }), "Hiker boots");
});

/* ---------- suggestions ---------- */

test("the type fills in materials, tags, spec and description", () => {
  const p = fill({ type: "Suede ankle zip boot", color: { name: "Black", hex: "#000000" } });
  assert.deepEqual(p.materials.map((m) => [m.label, m.value]), [["Upper", "Suede"], ["Closure", "Side zip"], ["Outsole", "Rubber lug"]]);
  assert.deepEqual(p.tags, ["women", "suede", "zip"]);
  assert.equal(p.spec, "Suede · Rubber lug");
  assert.equal(p.desc, "Black suede ankle zip boot with side zip and rubber lug outsole");
});

test("what the admin typed is never overwritten", () => {
  const p = fill({ type: "Suede ankle boot", desc: "Mine", spec: "Mine too", materials: [{ icon: "boot", label: "Upper", value: "Velvet" }] }, ["desc", "spec", "mat:Upper"]);
  assert.equal(p.desc, "Mine");
  assert.equal(p.spec, "Mine too");
  assert.equal(p.materials.find((m) => m.label === "Upper").value, "Velvet");
});

test("a material the admin removed stays removed", () => {
  const p = fill({ type: "Suede ankle boot", materials: [] }, ["mat:Upper"]);
  assert.equal(p.materials.find((m) => m.label === "Upper"), undefined);
});

test("details the form doesn't know about are kept", () => {
  const p = fill({ type: "Suede boot", materials: [{ icon: "layers", label: "Collar", value: "Wool" }] });
  assert.equal(p.materials.find((m) => m.label === "Collar").value, "Wool");
});

test("the colour name brings its swatch, until a swatch is picked", () => {
  assert.equal(fill({ color: { name: "tan", hex: "#000000" } }).color.hex, built.find((b) => b.color.name === "Tan").color.hex);
  assert.equal(fill({ color: { name: "tan", hex: "#123456" } }, ["hex"]).color.hex, "#123456");
});

test("synthetic leather isn't tagged leather", () => {
  const material = (value) => [{ icon: "boot", label: "Upper", value }];
  assert.ok(!tagsFor({ type: "Boot", line: "men", materials: material("Synthetic leather") }).includes("leather"));
  assert.ok(tagsFor({ type: "Boot", line: "men", materials: material("Leather") }).includes("leather"));
});

test("sizes and tags follow the line; sizes changed by hand don't", () => {
  const women = blankDraft();
  const men = withLine(women, "men");
  assert.equal(men.sizes, "US 7–13");
  assert.ok(men.tags.includes("men") && !men.tags.includes("women"));
  assert.equal(withLine({ ...women, sizes: "EU 36–41" }, "men").sizes, "EU 36–41");
});

test("suggestions match word starts, starts of the value first, and hide an exact match", () => {
  const options = [{ value: "Ankle zip boot" }, { value: "Zip sneaker" }, { value: "Crazy boot" }];
  assert.deepEqual(matchOptions(options, "zi").map((o) => o.value), ["Zip sneaker", "Ankle zip boot"]);
  assert.deepEqual(matchOptions(options, "boot zip").map((o) => o.value), ["Ankle zip boot"]);
  assert.deepEqual(matchOptions(options, "zip sneaker"), []);
  assert.equal(matchOptions(options, "", 2).length, 2);
});

test("name ideas never repeat a style's name, and a taken address is numbered", () => {
  const ideas = nameIdeas([...built, { name: "wren" }]).map((o) => o.value);
  assert.ok(ideas.length > 5 && !ideas.includes("Wren"));
  for (const b of built) assert.ok(!ideas.includes(b.name), b.name);
  assert.equal(uniqueSlug("Mira Tall!", ["mira-tall"]), "mira-tall-2");
  assert.equal(uniqueSlug("Mira Tall!", ["mira-tall", "mira-tall-2"]), "mira-tall-3");
  assert.equal(uniqueSlug("!!!", []), "");
});

test("a template copies the make, never the name, address or photos", () => {
  const { item } = fromTemplate(blankDraft(), byId.p01);
  assert.equal(item.name, "");
  assert.equal(item.outer.src, "");
  assert.equal(item.type, byId.p01.type);
  assert.deepEqual(item.materials, byId.p01.materials);
});

test("a close repeat of a style is pointed out", () => {
  const p = byId.p01;
  const near = similarStyles({ ...blankDraft(), type: p.type, line: p.line, color: p.color, materials: p.materials }, built);
  assert.equal(near[0].id, "p01");
  assert.deepEqual(similarStyles(blankDraft(), built), []);
});

test("the checklist names what's missing, and clears when it's done", () => {
  assert.ok(problems(blankDraft(), []).length >= 5);
  assert.deepEqual(problems(fresh(), items()), []);
  assert.ok(problems(fresh({ name: "MIRA" }), items()).some((m) => /already has this name/.test(m)));
  assert.ok(problems(fresh({ outer: { src: "", w: 0, h: 0 } }), items()).includes("Add a main photo"));
});

test("no built-in style trips the checklist: publishing an edit never gets stuck on what was already there", () => {
  const all = items();
  for (const p of all) assert.deepEqual(problems(p, all), [], p.name);
});

/* ---------- what saving sends ---------- */

test("an untouched catalogue saves nothing", () => {
  assert.deepEqual(toPayload(items()), { edits: {}, added: [] });
});

test("only what changed is saved for a built-in style", () => {
  const list = items();
  const p = list.find((x) => x.id === "p02");
  Object.assign(p, { name: "Mira High  ", badge: undefined, zip: undefined, rating: "−10°C", category: "Boots", live: false, featured: true });
  assert.deepEqual(toPayload(list).edits, { p02: { name: "Mira High", category: "Boots", badge: "none", zip: null, rating: "−10°C", live: false, featured: true } });
});

test("clearing a built-in's rating and blanking its name", () => {
  const list = items();
  const p = list.find((x) => x.id === "p04");
  Object.assign(p, { rating: undefined, name: "   " });
  assert.deepEqual(toPayload(list).edits, { p04: { rating: null } });
});

test("a new style saves as a whole record, with its listing flags alongside", () => {
  const p = { ...fresh(), live: false, featured: true };
  const { edits, added } = toPayload([p]);
  assert.deepEqual(edits, { [p.id]: { live: false, featured: true } });
  assert.equal(added[0].name, "Wren");
  assert.equal(added[0].slug, "wren");
  assert.ok(!("base" in added[0]) && !("live" in added[0]) && !("inquiries" in added[0]));
});

/* ---------- what the server accepts ---------- */

const accepts = (edits = {}, added = []) => ProductsPayload.safeParse({ edits, added });
const refused = (edits, added) => {
  const r = accepts(edits, added);
  assert.equal(r.success, false);
  return r.error.issues[0].message;
};
const record = (over) => ({ ...toPayload([fresh()]).added[0], ...over });

test("a new style from the form is accepted", () => {
  const { edits, added } = toPayload([{ ...fresh(), featured: true }]);
  assert.equal(accepts(edits, added).success, true);
});

test("every built-in style would pass as a record: the limits fit the real catalogue", () => {
  for (const p of built) {
    const r = AddedSchema.safeParse({ ...p, id: "nabcdefg", slug: "any-slug" });
    assert.equal(r.success, true, `${p.name}: ${r.error?.issues[0].message}`);
  }
});

test("refuses unknown styles, stolen addresses and duplicates", () => {
  assert.match(refused({ nope: { live: false } }), /Unknown style/);
  assert.match(refused({}, [record({ slug: "mira" })]), /already uses the address/);
  assert.match(refused({}, [record({ id: "p01" })]), /Unknown style/);
  const twin = record();
  assert.match(refused({}, [twin, { ...twin, id: "nother123" }]), /already uses the address/);
});

test("refuses a new style with something missing", () => {
  assert.match(refused({}, [record({ name: "  " })]), /name is needed/);
  assert.match(refused({}, [record({ materials: [] })]), /at least one material/);
  assert.match(refused({}, [record({ sizeRun: [] })]), /at least one size/);
});

test("refuses photos from anywhere the site can't load, and addresses that aren't addresses", () => {
  for (const src of ["https://evil.example/x.png", "https://res.cloudinary.com/other/image/upload/x.png", "javascript:alert(1)", "/images/../secret", "https://res.cloudinary.com/doulxmmm/image/upload/x.png?a=1", ""]) {
    assert.equal(isPhotoSrc(src), false, src);
    assert.equal(accepts({}, [record({ outer: { src, w: 10, h: 10 } })]).success, false, src);
  }
  assert.equal(accepts({}, [record({ slug: "../admin" })]).success, false);
  assert.equal(accepts({}, [record({ slug: "Has Space" })]).success, false);
});

test("refuses text past its limit, with a message saying which field", () => {
  assert.match(refused({ p01: { name: "x".repeat(41) } }), /name can be at most 40/);
  assert.match(refused({ p01: { desc: "x".repeat(601) } }), /description can be at most 600/);
  assert.equal(accepts({ p01: { category: "Made up" } }).success, false);
  assert.equal(accepts({ p01: { category: "" } }).success, true);
  assert.equal(accepts({ p01: { color: { name: "Red", hex: "red" } } }).success, false);
});

/* ---------- how the site applies it ---------- */

test("every field of a built-in style can change, in place, and goes back when the edit does", () => {
  const before = byId.p01;
  const { name, spec, zip } = before;
  applyProductEdits({ p01: { name: "New", type: "Chelsea boot", sizes: "EU 36–41", spec: "S", materials: [], color: { name: "Red", hex: "#FF0000" }, scene: "sand", zip: null, line: "men" } });
  assert.equal(byId.p01, before, "same object: home sections hold on to it");
  assert.equal(before.name, "New");
  assert.equal(before.zip, undefined);
  assert.equal(categoryOf(before), "Chelsea boots");
  assert.equal(before.tags[0], "men");
  assert.ok(!before.tags.includes("women"));
  applyProductEdits({});
  assert.equal(before.name, name);
  assert.equal(before.spec, spec);
  assert.equal(before.zip, zip);
  assert.equal(before.line, "women");
  assert.equal(before.tags[0], "women");
});

test("a new style joins every list, then leaves them all when deleted", () => {
  const [rec] = toPayload([fresh()]).added;
  const count = products.length;
  applyProductEdits({ [rec.id]: { featured: true } }, [rec]);
  assert.equal(products.length, count + 1);
  assert.equal(products[0].id, rec.id, "featured styles come first");
  assert.equal(getProduct("wren").name, "Wren");
  assert.equal(byId[rec.id].name, "Wren");
  assert.ok(allProducts.some((p) => p.id === rec.id));
  assert.ok(groupOf(byId[rec.id]).length >= 1);
  assert.ok(groupOf(byId.p01).some((p) => p.id === rec.id), "it joins its category");
  applyProductEdits({});
  assert.equal(products.length, count);
  assert.equal(getProduct("wren"), undefined);
  assert.equal(byId[rec.id], undefined);
});

test("applying again and again changes nothing", () => {
  const [rec] = toPayload([fresh()]).added;
  applyProductEdits({ p01: { name: "New" } }, [rec]);
  const once = JSON.stringify(products);
  applyProductEdits({ p01: { name: "New" } }, [rec]);
  assert.equal(JSON.stringify(products), once);
  assert.equal(allProducts.filter((p) => p.id === rec.id).length, 1);
});

test("a stored record can't replace a built-in style", () => {
  const name = byId.p01.name;
  applyProductEdits({}, [{ ...fresh(), id: "p01", slug: "evil", name: "Evil" }]);
  assert.equal(byId.p01.name, name);
  assert.equal(getProduct("evil"), undefined);
});

test("a hidden new style stays out of the page source; a live one is printed for the browser", () => {
  const [rec] = toPayload([fresh()]).added;
  const content = (live) => publicContent(withDefaults({ added: [rec], products: live ? {} : { [rec.id]: { live: false } } }));
  assert.equal(content(true).added.length, 1);
  assert.equal(content(false).added.length, 0);
});

test("a document saved or cached before new styles existed still loads", () => {
  assert.deepEqual(withDefaults({ products: { p01: { name: "Old" } } }).added, []);
  assert.deepEqual(publicContent(withDefaults(null)).added, []);
  // getContent() runs every cached copy through withDefaults, so it has to be safe to run twice
  const once = withDefaults({ added: [{ id: "nabcdefg" }], seasons: { auto: false } });
  assert.deepEqual(withDefaults(once), once);
});

test("suggested text is built only from what's typed", () => {
  assert.equal(descFor({ type: "", color: { name: "Red" }, materials: [] }), "");
  assert.equal(specFor({ materials: [] }), "");
  assert.equal(descFor({ type: "Boot", color: { name: "" }, materials: [] }), "Boot");
});

/* ---------- uploads ---------- */

test("the upload signature matches Cloudinary's documented example", () => {
  // https://cloudinary.com/documentation/authentication_signatures
  const params = { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 };
  assert.equal(signParams(params, "abcd"), "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("a cutout is only ever asked for in the upload folder", () => {
  assert.equal(isUploadId("chime-long/added/abc_123-x"), true);
  for (const id of ["chime-long/women/abc", "chime-long/added/../x", "chime-long/added/a/b", "https://evil.example", ""]) assert.equal(isUploadId(id), false, id);
});

test("reads a transparent WebP's size, and refuses anything else", () => {
  const webp = Buffer.alloc(30);
  webp.write("VP8X", 12, "ascii");
  webp.writeUIntLE(799, 24, 3);
  webp.writeUIntLE(599, 27, 3);
  assert.deepEqual(webpSize(webp), { w: 800, h: 600 });
  assert.equal(webpSize(Buffer.alloc(30)), null);
  assert.equal(webpSize(Buffer.alloc(4)), null);
});
