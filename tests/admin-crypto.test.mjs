// The admin panel's cryptography: `npm test`. Node runs the TypeScript module directly (type stripping).
import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, sameSecret, tokenHash, verifyPassword } from "../src/lib/admin/crypto.ts";

test("passwords: right one passes, wrong ones and short ones don't", async () => {
  const h = await hashPassword("correct horse battery staple");
  assert.match(h, /^scrypt\$15\$8\$1\$/);
  assert.equal(await verifyPassword("correct horse battery staple", h), true);
  assert.equal(await verifyPassword("correct horse battery stapl", h), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
  assert.notEqual(await hashPassword("correct horse battery staple"), h, "salted");
  await assert.rejects(hashPassword("short"));
});

test("comparing a password with the one in the environment: exact, whatever the lengths", () => {
  assert.equal(sameSecret("open sesame", "open sesame"), true);
  assert.equal(sameSecret("open sesame", "open sesamE"), false);
  assert.equal(sameSecret("open", "open sesame"), false);
  assert.equal(sameSecret("", "open sesame"), false);
});

test("session tokens are stored only as hashes", () => {
  assert.match(tokenHash("abc"), /^[0-9a-f]{64}$/);
  assert.notEqual(tokenHash("abc"), tokenHash("abd"));
});
