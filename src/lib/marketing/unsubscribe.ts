import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe links in campaign emails: /unsubscribe?s=SUB-00042&t=<HMAC of the id>, so only the person holding the
 * email can take that address off the list, with no login. Signed with MARKETING_SECRET (or DESK_SECRET when that's
 * the only one set). Until one of them is set (16+ characters), campaigns can't be sent: every email must carry a
 * working unsubscribe link. No "@/" imports, so `node --test` can load it as is.
 */

const secretOf = () => process.env.MARKETING_SECRET || process.env.DESK_SECRET || "";
export const unsubscribeReady = (secret = secretOf()) => secret.length >= 16;

export const unsubscribeToken = (sid: string, secret = secretOf()) => createHmac("sha256", secret).update(`unsubscribe:${sid}`).digest("base64url");

/** True when `token` was made by unsubscribeToken for this subscriber id. Constant-time. */
export function unsubscribeTokenOk(sid: string, token: string, secret = secretOf()) {
  if (!unsubscribeReady(secret) || !/^SUB-\d{5,}$/.test(sid)) return false;
  const want = Buffer.from(unsubscribeToken(sid, secret));
  const got = Buffer.from(String(token));
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The path for one subscriber's link, e.g. /unsubscribe?s=SUB-00042&t=… */
export const unsubscribePath = (sid: string) => `/unsubscribe?s=${encodeURIComponent(sid)}&t=${unsubscribeToken(sid)}`;
