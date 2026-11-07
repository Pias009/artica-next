import { Binary } from "mongodb";
import { audit, currentAdmin } from "@/lib/admin/auth";
import { imageUrl, images, MAX_BYTES, TYPES } from "@/lib/content/images";
import { dbReady } from "@/lib/leads/db";

/** A photo from the admin panel (Seasons): admins only, images only, up to 3 MB after the browser has shrunk it. */
export async function POST(req: Request) {
  const who = await currentAdmin().catch(() => null);
  if (!who) return Response.json({ error: "Sign in again to upload." }, { status: 401 });
  if (!dbReady()) return Response.json({ error: "No database is connected, so photos can't be stored." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No photo was sent." }, { status: 400 });
  if (!TYPES.includes(file.type)) return Response.json({ error: "Use a JPG, PNG, WebP or AVIF photo." }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That photo is too large (3 MB at most after resizing)." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const { insertedId } = await images().insertOne({ data: new Binary(buf), type: file.type, size: buf.length, at: new Date(), by: who.admin.email });
  await audit({ adminId: who.admin._id, email: who.admin.email, action: "content_saved", detail: `photo uploaded (${Math.round(buf.length / 1024)} KB)` });
  return Response.json({ src: imageUrl(insertedId.toHexString()) });
}
