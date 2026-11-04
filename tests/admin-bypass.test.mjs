// Where the sign-in page may offer "Skip sign-in (dev)": `npm test`. Local `next dev` on this machine, a Vercel
// preview deployment, or a deployment with no database yet (sample data only). Never where real inquiries live, unless
// that server has been told to with ADMIN_SKIP_SIGNIN=1.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { skipAllowed } from "../src/lib/admin/cookie.ts";

const KEYS = ["NODE_ENV", "VERCEL_ENV", "MONGODB_URI", "ADMIN_SKIP_SIGNIN"];
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

test("production with no database: allowed, since there is only sample data", () => {
  set({ NODE_ENV: "production", VERCEL_ENV: "production" });
  assert.equal(skipAllowed("artica-next.vercel.app"), "no-data");
  set({ NODE_ENV: "production" });
  assert.equal(skipAllowed("example.com"), "no-data");
});

test("never once a database holds real inquiries (production, any server)", () => {
  const db = "mongodb+srv://user:pw@cluster0.example.mongodb.net/";
  for (const env of [
    { NODE_ENV: "production", VERCEL_ENV: "production", MONGODB_URI: db },
    { NODE_ENV: "production", MONGODB_URI: db },
    { NODE_ENV: "production", VERCEL_ENV: "development", MONGODB_URI: db },
  ]) {
    set(env);
    assert.equal(skipAllowed("localhost:3000"), false, JSON.stringify(env));
  }
});

test("ADMIN_SKIP_SIGNIN: opens production with a database, but only when exactly 1", () => {
  const db = "mongodb+srv://user:pw@cluster0.example.mongodb.net/";
  set({ NODE_ENV: "production", VERCEL_ENV: "production", MONGODB_URI: db, ADMIN_SKIP_SIGNIN: "1" });
  assert.equal(skipAllowed("artica-next.vercel.app"), "flag");
  for (const value of ["", "0", "true", "false"]) {
    set({ NODE_ENV: "production", VERCEL_ENV: "production", MONGODB_URI: db, ADMIN_SKIP_SIGNIN: value });
    assert.equal(skipAllowed("artica-next.vercel.app"), false, value);
  }
});
