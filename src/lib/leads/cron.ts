import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Vercel calls the cron routes with `Authorization: Bearer <CRON_SECRET>`. Without CRON_SECRET set the routes refuse
 * every caller, so they can't be triggered from outside before it's configured.
 */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const want = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  return want.length === got.length && timingSafeEqual(want, got);
}
