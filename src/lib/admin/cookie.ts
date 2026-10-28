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
 *  - "preview": a Vercel preview deployment. Those sit behind Vercel's own login (Deployment Protection), so only
 *    people on the Vercel team reach them; keep that protection on.
 * Never on production (the live site) or any other server: the real sign-in is the only way in there.
 */
export function skipAllowed(host: string | null | undefined): false | "local" | "preview" {
  if (process.env.NODE_ENV === "development") {
    const name = (host ?? "").replace(/:\d+$/, "").toLowerCase();
    return name === "localhost" || name === "127.0.0.1" || name === "[::1]" ? "local" : false;
  }
  return process.env.VERCEL_ENV === "preview" ? "preview" : false;
}
