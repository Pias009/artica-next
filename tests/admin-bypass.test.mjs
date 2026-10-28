// When the admin sign-in may be skipped: `npm test`. Local testing under `next dev` on this machine, or a Vercel
// deployment during a short, dated window (ADMIN_OPEN_UNTIL). Never anywhere else.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { MAX_OPEN_DAYS, openUntil, signInSkipped } from "../src/lib/admin/cookie.ts";

const KEYS = ["NODE_ENV", "ADMIN_DEV_BYPASS", "ADMIN_OPEN_UNTIL", "VERCEL"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
function set(env) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
}
afterEach(() => set(Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined))));

const NOW = Date.UTC(2026, 9, 29, 12);
const day = (offset) => new Date(NOW + offset * 86_400_000).toISOString().slice(0, 10);

test("local: under next dev, with the flag, for localhost only", () => {
  set({ NODE_ENV: "development", ADMIN_DEV_BYPASS: "1" });
  for (const host of ["localhost:3000", "localhost", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST:3000"]) assert.equal(signInSkipped(host, NOW), "local", host);
  for (const host of ["192.168.1.20:3000", "example.com", "localhost.evil.com", "evil.com:3000", "", null, undefined]) assert.equal(signInSkipped(host, NOW), false, String(host));
  for (const flag of ["", "0", "true", "yes"]) {
    set({ NODE_ENV: "development", ADMIN_DEV_BYPASS: flag });
    assert.equal(signInSkipped("localhost:3000", NOW), false, flag);
  }
});

test("the local flag never opens a production server", () => {
  set({ NODE_ENV: "production", ADMIN_DEV_BYPASS: "1", VERCEL: "1" });
  assert.equal(signInSkipped("localhost:3000", NOW), false);
  set({ NODE_ENV: "production", ADMIN_DEV_BYPASS: "1" });
  assert.equal(signInSkipped("localhost:3000", NOW), false);
});

test("deployed: on Vercel through the given day, then sign-in comes back", () => {
  set({ NODE_ENV: "production", VERCEL: "1", ADMIN_OPEN_UNTIL: day(7) });
  assert.equal(signInSkipped("chime-long.vercel.app", NOW), "deployed");
  assert.equal(openUntil(NOW).toISOString().slice(0, 10), day(8), "open through the whole last day");
  set({ NODE_ENV: "production", VERCEL: "1", ADMIN_OPEN_UNTIL: day(0) });
  assert.equal(signInSkipped("x", NOW), "deployed", "today still counts");
  set({ NODE_ENV: "production", VERCEL: "1", ADMIN_OPEN_UNTIL: day(-1) });
  assert.equal(signInSkipped("x", NOW), false, "yesterday is over");
});

test("deployed: refused off Vercel, without a date, with junk, or too far ahead", () => {
  set({ NODE_ENV: "production", ADMIN_OPEN_UNTIL: day(7) });
  assert.equal(signInSkipped("x", NOW), false, "next start on any other host");
  for (const until of ["", "soon", "2026-13-45", "9999-12-31", day(MAX_OPEN_DAYS + 1)]) {
    set({ NODE_ENV: "production", VERCEL: "1", ADMIN_OPEN_UNTIL: until });
    assert.equal(signInSkipped("x", NOW), false, until);
  }
  set({ NODE_ENV: "production", VERCEL: "1", ADMIN_OPEN_UNTIL: day(MAX_OPEN_DAYS) });
  assert.equal(signInSkipped("x", NOW), "deployed", "the longest allowed window");
  set({ NODE_ENV: "development", VERCEL: "1", ADMIN_OPEN_UNTIL: day(7) });
  assert.equal(signInSkipped("192.168.1.20:3000", NOW), false, "dev never uses the deployed rule");
});
