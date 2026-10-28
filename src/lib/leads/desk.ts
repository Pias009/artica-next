import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The trade desk's one-click status links ("Mark replied", "Mark quoted", …) in each inquiry email. A link carries an
 * HMAC of the inquiry's ref and the status, so only someone holding the email can move it, and no login is needed.
 * DESK_SECRET signs them; until it is set the emails go out without links and /desk/l/* answers 404.
 * No "@/" imports, so `node --test` can load it as is.
 */

export const DESK_STATUSES = ["replied", "quoted", "won", "lost", "spam"] as const;
export type DeskStatus = (typeof DESK_STATUSES)[number];
export const isDeskStatus = (v: unknown): v is DeskStatus => (DESK_STATUSES as readonly unknown[]).includes(v);

export const deskReady = (secret = process.env.DESK_SECRET) => !!secret && secret.length >= 16;

export const deskToken = (ref: string, status: DeskStatus, secret = process.env.DESK_SECRET ?? "") =>
  createHmac("sha256", secret).update(`${ref}:${status}`).digest("base64url");

/** True when `token` was made by deskToken for this ref and status. Constant-time. */
export function deskTokenOk(ref: string, status: string, token: string, secret = process.env.DESK_SECRET) {
  if (!deskReady(secret) || !isDeskStatus(status)) return false;
  const want = Buffer.from(deskToken(ref, status, secret));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The path for one status link, e.g. /desk/l/CL-2026-0142?s=quoted&t=… */
export const deskPath = (ref: string, status: DeskStatus) =>
  `/desk/l/${encodeURIComponent(ref)}?s=${status}&t=${deskToken(ref, status)}`;
