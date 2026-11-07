import { ObjectId } from "mongodb";
import { images } from "@/lib/content/images";
import { dbReady } from "@/lib/leads/db";

/** A photo uploaded in the admin panel. An id never changes its photo, so it caches for a year. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbReady() || !ObjectId.isValid(id) || id.length !== 24) return new Response("Not found", { status: 404 });
  const img = await images().findOne({ _id: new ObjectId(id) });
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data.buffer), {
    headers: { "content-type": img.type, "cache-control": "public, max-age=31536000, immutable", "content-length": String(img.size) },
  });
}
