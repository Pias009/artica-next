import { cronAuthorized } from "@/lib/leads/cron";
import { dbReady } from "@/lib/leads/db";
import { drain } from "@/lib/leads/outbox";

// Retries inquiry emails that didn't go out right after the submit. On Pro, add it to vercel.json's crons every
// 10 minutes ("*/10 * * * *"); Hobby allows daily crons only, so there the daily cron and new submits drain it.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!dbReady()) return Response.json({ skipped: "no MONGODB_URI" });
  return Response.json(await drain({ limit: 50 }));
}
