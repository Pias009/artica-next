// Where the sign-in page may offer "Skip sign-in (dev)": `npm test`. Local `next dev` on this machine, or a Vercel
// preview deployment. Never production, never any other server.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { skipAllowed } from "../src/lib/admin/cookie.ts";

const KEYS = ["NODE_ENV", "VERCEL_ENV"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
function set(env) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
}
afterEach(() => set(Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined))));

test("local dev: only when addressed to this machine", () => {
  set({ NODE_ENV: "development" });
  for (const host of ["localhost:3000", "localhost", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST:3000"]) assert.equal(skipAllowed(host), "local", host);
  for (const host of ["192.168.1.20:3000", "example.com", "localhost.evil.com", "evil.com:3000", "", null, undefined]) assert.equal(skipAllowed(host), false, String(host));
});

test("Vercel preview deployments: allowed, whatever the host", () => {
  set({ NODE_ENV: "production", VERCEL_ENV: "preview" });
  assert.equal(skipAllowed("artica-next-b4dav93tu-pias009s-projects.vercel.app"), "preview");
});

test("never on production, a non-Vercel server, or Vercel's local development", () => {
  for (const env of [
    { NODE_ENV: "production", VERCEL_ENV: "production" },
    { NODE_ENV: "production" },
    { NODE_ENV: "production", VERCEL_ENV: "development" },
  ]) {
    set(env);
    assert.equal(skipAllowed("localhost:3000"), false, JSON.stringify(env));
  }
});
