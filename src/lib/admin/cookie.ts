/**
 * The admin session cookie's name, shared by proxy.ts (which only checks it is there) and auth.ts (which checks it
 * against the database). __Host- needs https, which local dev doesn't have; the prefix pins it to this host and "/".
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-cl_admin" : "cl_admin";

const DAY = 86_400_000;
/** The furthest ahead ADMIN_OPEN_UNTIL may be; a later date is ignored, so open access can't be left on for good. */
export const MAX_OPEN_DAYS = 31;

/**
 * The end of open access on a deployment: ADMIN_OPEN_UNTIL=2026-11-05 means through that day (UTC). Null when unset,
 * unreadable, past, or more than MAX_OPEN_DAYS ahead.
 */
export function openUntil(now = Date.now()) {
  const day = Date.parse(`${process.env.ADMIN_OPEN_UNTIL ?? ""}T00:00:00Z`);
  if (!Number.isFinite(day)) return null;
  const end = day + DAY;
  return end > now && end - now <= (MAX_OPEN_DAYS + 1) * DAY ? new Date(end) : null;
}

/**
 * Whether sign-in is skipped for this request, and why. `host` is the request's Host header.
 *  - "local": `next dev` with ADMIN_DEV_BYPASS=1, addressed to this machine (a dev server reachable from the network
 *    still asks for sign-in). `next build` / `next start` are always production, so this can't reach a deployment.
 *  - "deployed": on Vercel only, while ADMIN_OPEN_UNTIL is a date from today up to MAX_OPEN_DAYS ahead. Anyone with
 *    the address can then read inquiries (buyers' names and emails) and change them: for a short test window only.
 */
export function signInSkipped(host: string | null | undefined, now = Date.now()): false | "local" | "deployed" {
  if (process.env.NODE_ENV === "development") {
    if (process.env.ADMIN_DEV_BYPASS !== "1") return false;
    const name = (host ?? "").replace(/:\d+$/, "").toLowerCase();
    return name === "localhost" || name === "127.0.0.1" || name === "[::1]" ? "local" : false;
  }
  return process.env.VERCEL === "1" && openUntil(now) ? "deployed" : false;
}
