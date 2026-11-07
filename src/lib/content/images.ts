import "server-only";
import { Binary, ObjectId } from "mongodb";
import { database } from "../leads/db";

/*
 * Photos uploaded in the admin panel (season banners), kept in the site's own database so uploads work with no
 * other service set up. The browser shrinks each photo before sending it (max 2400px, WebP or JPEG), so they stay
 * small; /api/img/<id> serves them with a year-long cache (an id never changes its photo).
 */

export type SiteImage = { _id?: ObjectId; data: Binary; type: string; size: number; at: Date; by: string };
export const images = () => database().collection<SiteImage>("site_images");
export const MAX_BYTES = 3 * 1024 * 1024;
export const TYPES = ["image/webp", "image/jpeg", "image/png", "image/avif"];
export const imageUrl = (id: string) => `/api/img/${id}`;
export const isImageUrl = (s: string) => /^\/api\/img\/[a-f0-9]{24}$/.test(s);
