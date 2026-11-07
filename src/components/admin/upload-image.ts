"use client";

/**
 * Sends a photo from the admin's computer to the site (api/admin/upload), shrunk first in the browser: at most
 * `max` pixels on the long side, as WebP (JPEG where WebP isn't supported). Returns the photo's address on the site.
 */
export async function uploadImage(file: File, max = 2400): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG, WebP).");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file couldn't be read as a photo.");
  });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
  const out = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
  if (!out) throw new Error("The photo couldn't be prepared.");
  const form = new FormData();
  form.append("file", new File([out], out.type === "image/webp" ? "photo.webp" : "photo.jpg", { type: out.type }));
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { src?: string; error?: string };
  if (!res.ok || !json.src) throw new Error(json.error ?? "The photo couldn't be uploaded.");
  return json.src;
}
