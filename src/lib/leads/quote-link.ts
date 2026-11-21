import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The buyer's link to their quote page (/q/CL-2026-0142?t=…), sent in the details email. Like the desk's status links
 * (desk.ts) it carries an HMAC of the inquiry's ref, so only someone holding the email can open the quote or answer it,
 * and no account is needed. QUOTE_SECRET signs them, or DESK_SECRET when there is no separate one; until either is set
 * the details email goes out without the link and /q/* answers 404. The message is prefixed so a quote token can never
 * double as a desk token made with the same secret.
 * No "@/" imports, so `node --test` can load it as is.
 */

const secretFromEnv = () => process.env.QUOTE_SECRET || process.env.DESK_SECRET || "";

export const quoteReady = (secret = secretFromEnv()) => !!secret && secret.length >= 16;

export const quoteToken = (ref: string, secret = secretFromEnv()) => createHmac("sha256", secret).update(`quote:${ref}`).digest("base64url");

/** True when `token` was made by quoteToken for this ref. Constant-time. */
export function quoteTokenOk(ref: string, token: string, secret = secretFromEnv()) {
  if (!quoteReady(secret) || !ref || !token) return false;
  const want = Buffer.from(quoteToken(ref, secret));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The path of one inquiry's quote page, e.g. /q/CL-2026-0142?t=… */
export const quotePath = (ref: string) => `/q/${encodeURIComponent(ref)}?t=${quoteToken(ref)}`;
