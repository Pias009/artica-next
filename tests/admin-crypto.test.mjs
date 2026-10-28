// The admin panel's cryptography: `npm test`. Node runs the TypeScript module directly (type stripping).
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { base32, fromBase32, hashPassword, newTotpSecret, open, otpauthUrl, seal, stepAt, tokenHash, totp, verifyPassword, verifyTotp } from "../src/lib/admin/crypto.ts";

test("passwords: right one passes, wrong ones and short ones don't", async () => {
  const h = await hashPassword("correct horse battery staple");
  assert.match(h, /^scrypt\$15\$8\$1\$/);
  assert.equal(await verifyPassword("correct horse battery staple", h), true);
  assert.equal(await verifyPassword("correct horse battery stapl", h), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
  assert.notEqual(await hashPassword("correct horse battery staple"), h, "salted");
  await assert.rejects(hashPassword("short"));
});

test("TOTP matches the RFC 6238 test vectors (SHA-1)", () => {
  const secret = base32(Buffer.from("12345678901234567890"));
  // RFC 6238 appendix B, last six digits
  for (const [t, code] of [[59, "287082"], [1111111109, "081804"], [1234567890, "005924"], [2000000000, "279037"]]) {
    assert.equal(totp(secret, Math.floor(t / 30)), code);
  }
  assert.deepEqual(fromBase32(secret), Buffer.from("12345678901234567890"));
});

test("TOTP: one step of drift either way, never reused, never malformed", () => {
  const s = newTotpSecret();
  const now = Date.UTC(2026, 9, 28, 12, 0, 10);
  const at = stepAt(now);
  assert.equal(verifyTotp(s, totp(s, at), now), at);
  assert.equal(verifyTotp(s, totp(s, at - 1), now), at - 1);
  assert.equal(verifyTotp(s, totp(s, at + 1), now), at + 1);
  assert.equal(verifyTotp(s, totp(s, at - 2), now), null);
  // replay: the step already used (or an older one) is refused
  assert.equal(verifyTotp(s, totp(s, at), now, at), null);
  assert.equal(verifyTotp(s, totp(s, at - 1), now, at), null);
  assert.equal(verifyTotp(s, totp(s, at + 1), now, at), at + 1);
  for (const bad of ["", "12345", "1234567", "abcdef", " 123456"]) assert.equal(verifyTotp(s, bad, now), null);
  assert.match(otpauthUrl("a@b.com", s), /^otpauth:\/\/totp\/Chime%20Long%20admin%3Aa%40b\.com\?secret=[A-Z2-7]+&/);
});

test("sealed secrets open only with their key and untampered", () => {
  const key = randomBytes(32).toString("base64");
  const sealed = seal("JBSWY3DPEHPK3PXP", key);
  assert.equal(open(sealed, key), "JBSWY3DPEHPK3PXP");
  assert.throws(() => open(sealed, randomBytes(32).toString("base64")));
  const parts = sealed.split(".");
  parts[3] = Buffer.from("tampered!").toString("base64url");
  assert.throws(() => open(parts.join("."), key));
  assert.throws(() => seal("x", "too-short"));
  assert.throws(() => seal("x", undefined));
});

test("session tokens are stored only as hashes", () => {
  assert.match(tokenHash("abc"), /^[0-9a-f]{64}$/);
  assert.notEqual(tokenHash("abc"), tokenHash("abd"));
});
