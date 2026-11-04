/*
 * The admin panel's sections and labels. The data itself comes from the server (lib/admin/panel.ts, PanelData),
 * through the panel's context (panel-data.tsx).
 */

import type { Status } from "@/lib/leads/db";
import type { Intent } from "@/lib/leads/mail";
import { SEASON_IDS } from "@/lib/season";

export type View = "overview" | "visitors" | "agent" | "pages" | "products" | "inquiries" | "seasons" | "settings";

export const VIEWS: { id: View; label: string; title: string }[] = [
  { id: "overview", label: "Overview", title: "Dashboard" },
  { id: "visitors", label: "Visitors", title: "Visitors" },
  { id: "agent", label: "AI agent", title: "AI agent" },
  { id: "pages", label: "Pages", title: "Pages" },
  { id: "products", label: "Products", title: "Products" },
  { id: "inquiries", label: "Inquiries", title: "Inquiries" },
  { id: "seasons", label: "Seasons", title: "Seasons" },
  { id: "settings", label: "Settings", title: "Settings" },
];

/** Each section's address: /admin, /admin/products… */
export const viewHref = (v: View) => (v === "overview" ? "/admin" : `/admin/${v}`);
/** The section an address belongs to: /admin/products/new is Products. */
export const viewOf = (path: string): View => VIEWS.find((v) => v.id === path.split("/")[2])?.id ?? "overview";

const INTENTS: Record<Intent, string> = {
  quote: "Quote",
  sample: "Samples",
  visit: "Visit",
  private_label: "Private label",
  shipping: "Shipping",
};
export const intentLabel = (i: Intent) => INTENTS[i];

export const PIPELINE: { id: Exclude<Status, "spam">; label: string }[] = [
  { id: "new", label: "New" },
  { id: "replied", label: "Replied" },
  { id: "quoted", label: "Quoted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export { SEASON_IDS };
