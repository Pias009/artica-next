/*
 * The words and photo each season shows on the home page, editable in the admin panel (Seasons): the hero's badge,
 * headline and line, and the campaign banner's tag, headline, line, accent colour, photo and the styles shown worn.
 * Only what the admin changed is stored; everything else stays as built (HeroSpotlight, EditorialCampaignBanner).
 */

import type { SeasonId } from "./season";

export type HeroCopy = { eyebrowBadge: string; headlineLead: string; headlineAccent: string; description: string };
export type CampaignCopy = { seasonTag: string; headlineLead: string; headlineAccent: string; description: string; accentColor: string; image: string; alt: string; wornSlugs: string[] };
export type SeasonCopy = { hero?: Partial<HeroCopy>; campaign?: Partial<CampaignCopy> };
export type SeasonCopyMap = Partial<Record<SeasonId, SeasonCopy>>;

/** Layers the admin's words over the built-in ones; empty fields keep the built-in text. */
export function merged<T extends object>(base: T, edit: Partial<Record<keyof T, unknown>> | undefined): T {
  if (!edit) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(edit)) {
    if (v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** The photos already on the site that suit a campaign banner. */
export const CAMPAIGN_PHOTOS = [
  "campaign-banner-winter",
  "campaign-banner-autumn",
  "campaign-banner-spring",
  "campaign-banner-summer",
  "campaign-banner-rainy",
  "campaign-banner-holiday",
  "06-banner-men-street-onfeet",
  "07-banner-women-snow-onfeet",
  "08-banner-duo-campaign-pavilion",
  "01-women-cream-laceup-lookbook",
  "02-men-nord-utility-lookbook",
  "09-women-toffee-chelsea-lookbook",
  "10-men-urban-hiker-lookbook",
].map((f) => `/images/models/${f}.jpg`);
