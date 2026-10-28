// The desk's one-click status links: `npm test`. Node runs the TypeScript module directly (type stripping).
import assert from "node:assert/strict";
import { test } from "node:test";
import { deskPath, deskReady, deskToken, deskTokenOk } from "../src/lib/leads/desk.ts";

const SECRET = "a-long-enough-test-secret";
const REF = "CL-2026-0142";

test("a token opens only its own ref and status", () => {
  const t = deskToken(REF, "quoted", SECRET);
  assert.equal(deskTokenOk(REF, "quoted", t, SECRET), true);
  assert.equal(deskTokenOk(REF, "won", t, SECRET), false);
  assert.equal(deskTokenOk("CL-2026-0143", "quoted", t, SECRET), false);
  assert.equal(deskTokenOk(REF, "quoted", t, "another-secret-of-length"), false);
});

test("bad input is refused, not thrown", () => {
  assert.equal(deskTokenOk(REF, "quoted", "", SECRET), false);
  assert.equal(deskTokenOk(REF, "quoted", "short", SECRET), false);
  assert.equal(deskTokenOk(REF, "new", deskToken(REF, "quoted", SECRET), SECRET), false);
  assert.equal(deskTokenOk(REF, "deleted", "x", SECRET), false);
});

test("links stay off until a real secret is set", () => {
  assert.equal(deskReady(undefined), false);
  assert.equal(deskReady("short"), false);
  assert.equal(deskReady(SECRET), true);
  // with no secret no token checks out, even one made with an empty key
  assert.equal(deskTokenOk(REF, "quoted", deskToken(REF, "quoted", ""), undefined), false);
});

test("the path carries ref, status and token", () => {
  process.env.DESK_SECRET = SECRET;
  const url = new URL(deskPath(REF, "spam"), "https://example.com");
  assert.equal(url.pathname, `/desk/l/${REF}`);
  assert.equal(url.searchParams.get("s"), "spam");
  assert.equal(deskTokenOk(REF, "spam", url.searchParams.get("t"), SECRET), true);
});
