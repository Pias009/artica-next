// The desk's private price list: `npm test`. Node runs the TypeScript module directly (type stripping).
import assert from "node:assert/strict";
import { test } from "node:test";
import { priceFor, quote } from "../src/lib/admin/prices.ts";

const row = { t300: 14, t600: 13, t1000: 12 };

test("the tier an order reaches sets the price", () => {
  assert.deepEqual(priceFor(row, 300), { price: 14, tier: "t300" });
  assert.deepEqual(priceFor(row, 599), { price: 14, tier: "t300" });
  assert.deepEqual(priceFor(row, 600), { price: 13, tier: "t600" });
  assert.deepEqual(priceFor(row, 2400), { price: 12, tier: "t1000" });
});

test("a missing tier falls back to the next smaller one, then to any price", () => {
  assert.deepEqual(priceFor({ t300: 14 }, 1200), { price: 14, tier: "t300" });
  assert.deepEqual(priceFor({ t300: 14, t1000: 12 }, 700), { price: 14, tier: "t300" });
  // only a big-order price: still a starting point for a small order
  assert.deepEqual(priceFor({ t1000: 12 }, 300), { price: 12, tier: "t1000" });
  assert.equal(priceFor({}, 300), null);
  assert.equal(priceFor(undefined, 300), null);
});

test("a quote prices each line and totals what it can", () => {
  const q = quote(
    [
      { productId: "a", name: "Nord", pairs: 600, color: "Black" },
      { productId: "b", name: "Tove", pairs: 300 },
    ],
    { a: row },
  );
  assert.equal(q.rows[0].price, 13);
  assert.equal(q.rows[0].total, 7800);
  assert.equal(q.rows[0].color, "Black");
  assert.equal(q.rows[1].price, null);
  assert.equal(q.total, 7800);
  assert.equal(q.complete, false);
  assert.deepEqual(q.missing, ["Tove"]);
  assert.equal(quote([{ productId: "a", name: "Nord", pairs: 300 }], { a: row }).complete, true);
});
