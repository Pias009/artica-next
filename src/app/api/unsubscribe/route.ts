import { dbReady } from "@/lib/leads/db";
import { setSubscriberStatus } from "@/lib/marketing/store";
import { unsubscribeTokenOk } from "@/lib/marketing/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header of each campaign email. A
 * GET (someone opening the link) goes to the confirmation page instead, so a link scanner can't unsubscribe anyone.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const sid = url.searchParams.get("s") ?? "";
  if (!unsubscribeTokenOk(sid, url.searchParams.get("t") ?? "")) return new Response("Invalid link", { status: 400 });
  if (!dbReady()) return new Response("Unavailable", { status: 503 });
  try {
    await setSubscriberStatus({ sid }, "unsubscribed");
    return new Response("Unsubscribed", { status: 200 });
  } catch (e) {
    console.error("[unsubscribe] one-click failed", e);
    return new Response("Try again later", { status: 503 });
  }
}

export function GET(req: Request) {
  const url = new URL(req.url);
  return Response.redirect(new URL(`/unsubscribe${url.search}`, url), 303);
}
