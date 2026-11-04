/**
 * The admin session cookie, shared by proxy.ts (which only checks it's there) and auth.ts (which checks it properly).
 * __Host- needs https, which local dev doesn't have; the prefix pins a cookie to this host and "/".
 */
export const SESSION_COOKIE = `${process.env.NODE_ENV === "production" ? "__Host-" : ""}cl_admin`;
