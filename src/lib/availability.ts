/*
 * Whether a style can be had, and when: set per style in the admin panel (Products), shown on its page, its cards
 * and in Kai's answers. Every style is made to order unless the desk says otherwise. Pure: the server, the browser
 * and the admin panel all word it the same way.
 */

import { LEAD } from "./products";

export type Availability = {
  status: "order" | "stock" | "production" | "soldout";
  /** "production": the first day it ships (YYYY-MM-DD). */
  shipsFrom?: string;
  /** "stock": days to ship from stock; "order": a lead time other than the usual bulk run. */
  days?: number;
  /** A short line for buyers, e.g. "Black only until March". */
  note?: string;
};

export const STATUS_LABEL: Record<Availability["status"], string> = {
  order: "Made to order",
  stock: "In stock",
  production: "In production",
  soldout: "Sold out this season",
};

const BULK = Number.parseInt(LEAD.bulk, 10);

const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** How it reads to a buyer: a short label for cards, and a sentence for the style's page and Kai. */
export function describe(a: Availability | undefined, today = new Date()) {
  const s = a?.status ?? "order";
  const note = a?.note?.trim();
  const tail = note ? ` ${note.replace(/\.?$/, ".")}` : "";
  if (s === "stock") return { label: "In stock", tone: "good" as const, text: `In stock: ships in about ${a?.days ?? 7} days, no production wait.${tail}` };
  if (s === "production") {
    const past = a?.shipsFrom && new Date(`${a.shipsFrom}T23:59:59Z`) < today;
    return a?.shipsFrom && !past
      ? { label: `Ships from ${date(a.shipsFrom)}`, tone: "info" as const, text: `In production: ships from ${date(a.shipsFrom)}. Order now to be in this run.${tail}` }
      : { label: "In production", tone: "info" as const, text: `In production now; the trade desk confirms the ship date.${tail}` };
  }
  if (s === "soldout") return { label: "Sold out", tone: "warn" as const, text: `Sold out for this season. Send an inquiry to reserve it from the next production run.${tail}` };
  const days = a?.days && a.days !== BULK ? a.days : BULK;
  return { label: STATUS_LABEL.order, tone: "plain" as const, text: `Made to order: about ${days} days of production after you confirm.${tail}` };
}

/** Only a status other than the usual (made to order, usual lead time, no note) is worth showing on a card. */
export const notable = (a: Availability | undefined) => !!a && (a.status !== "order" || (!!a.days && a.days !== BULK) || !!a.note?.trim());
