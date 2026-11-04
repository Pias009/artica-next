/**
 * The admin cookies, shared by proxy.ts (which only checks one is there) and auth.ts (which checks it properly).
 * __Host- needs https, which local dev doesn't have; the prefix pins a cookie to this host and "/".
 */
const HOST = process.env.NODE_ENV === "production" ? "__Host-" : "";
export const SESSION_COOKIE = `${HOST}cl_admin`;
/** Set by the sign-in page's "Skip sign-in (dev)" button. It counts only where skipAllowed() says so. */
export const SKIP_COOKIE = `${HOST}cl_admin_skip`;

/**
 * Where the sign-in page offers "Skip sign-in (dev)", and why. `host` is the request's Host header.
 *  - "local": `next dev`, addressed to this machine (a dev server reachable from the network still asks for sign-in).
 *  - "preview": a Vercel preview deployment, behind Vercel's own login (Deployment Protection); keep that on.
 *  - "no-data": any other deployment (production included) that has no database yet (no MONGODB_URI), so the panel
 *    has only sample data to show. The moment MONGODB_URI is set there, real buyers' data is behind /admin and the
 *    button goes: only the real sign-in opens it.
 *  - "flag": ADMIN_SKIP_SIGNIN=1 on this server, for a deployment still in development. It overrides everything above,
 *    database included: anyone with the link can open the panel, so remove it before launch.
 */
export function skipAllowed(host: string | null | undefined): false | "local" | "preview" | "no-data" | "flag" {
  if (process.env.ADMIN_SKIP_SIGNIN === "1") return "flag";
  if (process.env.NODE_ENV === "development") {
    const name = (host ?? "").replace(/:\d+$/, "").toLowerCase();
    return name === "localhost" || name === "127.0.0.1" || name === "[::1]" ? "local" : false;
  }
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return process.env.MONGODB_URI ? false : "no-data";
}
