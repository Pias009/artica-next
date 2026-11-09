/*
 * The marketing desk's shared vocabulary and pure rules, for the server, the admin views and the tests alike:
 * subscriber ids and priorities, mail-model merge tags, campaign audiences, the tracking tags the Social team can
 * switch on, the ideas board, and UTM links. No "@/" imports and no server-only code, so `node --test` loads it as is.
 */

/* ---------- subscribers ---------- */

/** Who to write to first. Worked out from what a subscriber has done (scoreSubscriber), or set by hand and locked. */
export const PRIORITIES = ["vip", "high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const isPriority = (v: unknown): v is Priority => (PRIORITIES as readonly unknown[]).includes(v);
export const PRIORITY_LABEL: Record<Priority, string> = { vip: "VIP", high: "High", normal: "Normal", low: "Low" };
/** The id prefix per priority, so a list sorted by id reads by tier too: P1 is VIP, P4 is low. */
export const PRIORITY_RANK: Record<Priority, number> = { vip: 1, high: 2, normal: 3, low: 4 };

/** Where a subscriber joined the list. */
export const SOURCES = ["line-sheet", "talk-to-desk", "inquiry", "manual", "import"] as const;
export type SubscriberSource = (typeof SOURCES)[number];
export const isSource = (v: unknown): v is SubscriberSource => (SOURCES as readonly unknown[]).includes(v);
export const SOURCE_LABEL: Record<SubscriberSource, string> = {
  "line-sheet": "Line-sheet signup",
  "talk-to-desk": "Talk to the desk",
  inquiry: "Buyer (inquiry)",
  manual: "Added by hand",
  import: "Imported",
};

export type SubscriberStatus = "subscribed" | "unsubscribed";

/** A subscriber's stable id, from its sequence number: SUB-00042. */
export const subscriberId = (seq: number) => `SUB-${String(Math.max(1, Math.floor(seq))).padStart(5, "0")}`;
/** The id with its tier in front, as the lists show it: P1·SUB-00042. */
export const priorityId = (sid: string, p: Priority) => `P${PRIORITY_RANK[p]}·${sid}`;

/** What a subscriber has done with the trade desk, matched by email across the inquiries. */
export type BuyerHistory = {
  inquiries: number;
  quoted: number;
  won: number;
  pairs: number;
  /** Days since their latest inquiry; null when they never sent one. */
  lastInquiryDays: number | null;
};

/**
 * A 0–100 score for how much a subscriber is worth writing to first. Orders and quotes weigh most, then inquiries,
 * volume and recency; asking the desk to write (talk-to-desk) beats a plain signup. Never below 0 or above 100.
 */
export function scoreSubscriber(h: BuyerHistory, source: SubscriberSource, ageDays = 0): number {
  let s = 5;
  if (h.won > 0) s += 45 + Math.min(10, (h.won - 1) * 5);
  if (h.quoted > 0) s += 20;
  if (h.inquiries > 0) s += 12 + Math.min(8, (h.inquiries - 1) * 4);
  if (h.pairs >= 3000) s += 10;
  else if (h.pairs >= 1000) s += 6;
  else if (h.pairs > 0) s += 3;
  if (h.lastInquiryDays != null) s += h.lastInquiryDays <= 30 ? 8 : h.lastInquiryDays <= 120 ? 4 : 0;
  if (source === "talk-to-desk") s += 6;
  if (source === "inquiry") s += 4;
  // a signup that has never asked for anything in half a year cools off a little
  if (h.inquiries === 0 && ageDays > 180) s -= 3;
  return Math.max(0, Math.min(100, Math.round(s)));
}

/** The tier a score falls in. */
export const priorityFromScore = (score: number): Priority => (score >= 70 ? "vip" : score >= 40 ? "high" : score >= 15 ? "normal" : "low");

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const isEmail = (v: string) => v.length <= 200 && EMAIL.test(v);
export const normalEmail = (v: string) => v.trim().toLowerCase();

/** Tags: lower case, letters, digits and dashes, 1–24 characters. */
export const cleanTag = (t: string) =>
  t
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
export const cleanTags = (tags: string[]) => [...new Set(tags.map(cleanTag).filter(Boolean))].slice(0, 12);

/**
 * Rows pasted into the import box: one subscriber per line, as "email" or "email, company, country, tag tag". Commas,
 * semicolons or tabs separate the fields. A header row and bad addresses are skipped; repeats are kept once.
 */
export function parseImport(text: string): { rows: { email: string; company?: string; country?: string; tags: string[] }[]; skipped: number } {
  const seen = new Set<string>();
  const rows: { email: string; company?: string; country?: string; tags: string[] }[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/).slice(0, 5001)) {
    if (!line.trim()) continue;
    const [first, company, country, tags] = line.split(/[,;\t]/).map((s) => s.trim().replace(/^"|"$/g, ""));
    const email = normalEmail(first ?? "");
    if (!isEmail(email)) {
      if (!/^e-?mail$/i.test(first ?? "")) skipped++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    rows.push({
      email,
      ...(company && { company: company.slice(0, 120) }),
      ...(country && { country: country.slice(0, 60) }),
      tags: cleanTags((tags ?? "").split(/\s+/)),
    });
  }
  return { rows, skipped };
}

/* ---------- mail models (templates) and merge tags ---------- */

export const TEMPLATE_KINDS = ["line-sheet", "season-launch", "follow-up", "promo", "newsletter", "announcement"] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];
export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  "line-sheet": "Line sheet",
  "season-launch": "Season launch",
  "follow-up": "Follow-up",
  promo: "Offer",
  newsletter: "Newsletter",
  announcement: "Announcement",
};

/** The merge tags a mail model can use, with what each becomes. */
export const MERGE_TAGS = [
  { tag: "company", about: "Their store or company" },
  { tag: "first_name", about: "Their first name, if known" },
  { tag: "email", about: "Their email address" },
  { tag: "country", about: "Their country" },
  { tag: "subscriber_id", about: "Their id, e.g. SUB-00042" },
  { tag: "site_url", about: "The website's address" },
] as const;
export type MergeVars = Partial<Record<(typeof MERGE_TAGS)[number]["tag"], string>>;

/**
 * Fills in {{tag}} and {{tag|fallback}}: "Hello {{first_name|there}}" becomes "Hello Ana" or "Hello there". Unknown
 * tags become their fallback, or nothing, so a typo never reaches a buyer as raw braces.
 */
export function renderTemplate(text: string, vars: MergeVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*(?:\|([^}]*))?\}\}/gi, (_, tag: string, fallback?: string) => {
    const v = (vars as Record<string, string | undefined>)[tag.toLowerCase()]?.trim();
    return v || (fallback ?? "").trim();
  });
}

/** The merge tags a text uses that don't exist (for a warning in the editor). */
export const unknownTags = (text: string) =>
  [...new Set([...text.matchAll(/\{\{\s*([a-z_]+)/gi)].map((m) => m[1].toLowerCase()))].filter((t) => !MERGE_TAGS.some((m) => m.tag === t));

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * A plain-text body as simple, safe email HTML: paragraphs, line breaks, **bold** and links (bare https addresses, or
 * [words](https://…)). Everything else is escaped, so nothing in a mail model can inject markup.
 */
export function textToHtml(text: string): string {
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#984080">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" style="color:#984080">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.split("\n").map(inline).join("<br>")}</p>`)
    .join("");
}

/** A whole campaign email: the body, then the footer with why they get it and the unsubscribe link. */
export function emailHtml({ body, preheader, unsubscribeUrl, company }: { body: string; preheader?: string; unsubscribeUrl: string; company: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f2;font-family:Inter,Helvetica,Arial,sans-serif;color:#121416">${
    preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>` : ""
  }<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:20px"><tr><td style="padding:32px;font-size:15px;line-height:1.6">${textToHtml(
    body,
  )}</td></tr></table><p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#5f656b">You get this because you joined the ${escapeHtml(
    company,
  )} trade list. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5f656b">Unsubscribe</a></p></td></tr></table></body></html>`;
}

/** Starter mail models, so the desk isn't facing an empty page. */
export const STARTER_TEMPLATES: { name: string; kind: TemplateKind; subject: string; preheader: string; body: string }[] = [
  {
    name: "New line sheet",
    kind: "line-sheet",
    subject: "The new line sheet is out, {{company|for your store}}",
    preheader: "New styles, order dates and tier pricing.",
    body: "Hello {{first_name|there}},\n\nThe new season's line sheet is ready: every new style, its colours and sizes, and the order dates that get stock on your shelves in time.\n\n[See the new styles]({{site_url}}/catalog)\n\nReply to this email with the styles you'd like priced and the trade desk sends tier pricing within 24 hours.\n\nThe Chime Long trade desk",
  },
  {
    name: "Season launch",
    kind: "season-launch",
    subject: "Order dates for the coming season",
    preheader: "Book production now to ship on time.",
    body: "Hello {{first_name|there}},\n\nProduction slots for the coming season are open. Buyers who book in the next few weeks ship first.\n\n**What's new:** fresh colourways, lighter soles and new kids' sizes.\n\n[Plan your order]({{site_url}}/order-calendar)\n\nThe Chime Long trade desk",
  },
  {
    name: "Quote follow-up",
    kind: "follow-up",
    subject: "Any questions on your quote, {{company|}}?",
    preheader: "We can adjust quantities, colours or delivery dates.",
    body: "Hello {{first_name|there}},\n\nWe sent your quote a few days ago and wanted to check it has everything you need. We can adjust quantities, swap colours or move the delivery date.\n\nJust reply to this email.\n\nThe Chime Long trade desk",
  },
  {
    name: "We miss you",
    kind: "newsletter",
    subject: "What's new at Chime Long",
    preheader: "Bestsellers, new arrivals and sample offers.",
    body: "Hello {{first_name|there}},\n\nIt's been a while. Here's what retailers in {{country|your market}} have been ordering this season, and the new arrivals worth a look.\n\n[See the bestsellers]({{site_url}}/catalog)\n\nSamples ship in 7 days. Reply with the styles you'd like to feel in hand.\n\nThe Chime Long trade desk",
  },
];

/* ---------- campaigns (the mail schedule) ---------- */

export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "sent", "cancelled", "failed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Who a campaign goes to: subscribed people in these tiers, with any of these tags (none: every tag). */
export type Audience = { priorities: Priority[]; tags: string[] };

export function audienceMatches(s: { priority: Priority; tags: string[]; status: SubscriberStatus }, a: Audience) {
  if (s.status !== "subscribed") return false;
  if (a.priorities.length && !a.priorities.includes(s.priority)) return false;
  if (a.tags.length && !a.tags.some((t) => s.tags.includes(t))) return false;
  return true;
}

/** "VIP and High, tagged boots" for the schedule list. */
export function audienceLabel(a: Audience) {
  const tiers = !a.priorities.length || a.priorities.length === PRIORITIES.length ? "Every subscriber" : a.priorities.map((p) => PRIORITY_LABEL[p]).join(", ");
  return a.tags.length ? `${tiers}, tagged ${a.tags.join(" or ")}` : tiers;
}

/* ---------- tracking tags (the Social team) ---------- */

export const TRACKERS = [
  {
    id: "meta",
    name: "Meta Pixel",
    hint: "15–16 digits. Meta Events Manager → Data sources → your pixel.",
    placeholder: "123456789012345",
    pattern: /^\d{15,16}$/,
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    hint: "Starts with G-. Analytics → Admin → Data streams → your web stream.",
    placeholder: "G-XXXXXXXXXX",
    pattern: /^G-[A-Z0-9]{6,12}$/,
  },
  {
    id: "gtm",
    name: "Google Tag Manager",
    hint: "Starts with GTM-. Use it instead of GA4 here if your tags live in GTM.",
    placeholder: "GTM-XXXXXXX",
    pattern: /^GTM-[A-Z0-9]{5,9}$/,
  },
  {
    id: "gads",
    name: "Google Ads",
    hint: "Starts with AW-. Google Ads → Goals → Conversions → Tag setup.",
    placeholder: "AW-123456789",
    pattern: /^AW-\d{8,12}$/,
  },
  {
    id: "linkedin",
    name: "LinkedIn Insight Tag",
    hint: "The partner id, digits only. Campaign Manager → Analyze → Insight Tag.",
    placeholder: "1234567",
    pattern: /^\d{5,10}$/,
  },
  {
    id: "tiktok",
    name: "TikTok Pixel",
    hint: "20 letters and digits. TikTok Ads Manager → Assets → Events.",
    placeholder: "C4ABCDEFGHIJKLMNOPQR",
    pattern: /^[A-Z0-9]{20}$/,
  },
  {
    id: "clarity",
    name: "Microsoft Clarity",
    hint: "The project id from clarity.microsoft.com → Settings → Overview.",
    placeholder: "abcd1234ef",
    pattern: /^[a-z0-9]{8,12}$/,
  },
] as const;
export type TrackerId = (typeof TRACKERS)[number]["id"];
export const TRACKER_IDS = TRACKERS.map((t) => t.id) as TrackerId[];
export const isTrackerId = (v: unknown): v is TrackerId => (TRACKER_IDS as unknown[]).includes(v);

/** The ids as people paste them: trimmed, upper case where the vendor uses it (Clarity ids are lower case). */
export const normalTrackerId = (t: TrackerId, raw: string) => (t === "clarity" ? raw.trim().toLowerCase() : raw.trim().toUpperCase());
export const trackerIdOk = (t: TrackerId, raw: string) => TRACKERS.find((x) => x.id === t)!.pattern.test(normalTrackerId(t, raw));

/** The site's events and what each tag calls them. */
export const TRACK_EVENTS = [
  { id: "view", label: "Page view", meta: "PageView", google: "page_view", tiktok: "Pageview" },
  { id: "search", label: "Searched the catalogue", meta: "Search", google: "search", tiktok: "Search" },
  { id: "add", label: "Added a style to the list", meta: "AddToCart", google: "add_to_cart", tiktok: "AddToCart" },
  { id: "inquiry", label: "Opened the inquiry form", meta: "InitiateCheckout", google: "begin_checkout", tiktok: "InitiateCheckout" },
  { id: "lead", label: "Sent an inquiry", meta: "Lead", google: "generate_lead", tiktok: "SubmitForm" },
  { id: "signup", label: "Joined the mailing list", meta: "CompleteRegistration", google: "sign_up", tiktok: "CompleteRegistration" },
] as const;
export type TrackEvent = (typeof TRACK_EVENTS)[number]["id"];

/* ---------- the ideas board ---------- */

export const IDEA_KINDS = ["idea", "content", "campaign", "improvement", "experiment"] as const;
export type IdeaKind = (typeof IDEA_KINDS)[number];
export const IDEA_KIND_LABEL: Record<IdeaKind, string> = {
  idea: "Idea",
  content: "Content",
  campaign: "Campaign",
  improvement: "Improvement",
  experiment: "A/B test",
};

export const CHANNELS = ["instagram", "facebook", "linkedin", "tiktok", "youtube", "pinterest", "google-ads", "email", "website", "trade-show", "other"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  "google-ads": "Google Ads",
  email: "Email",
  website: "Website",
  "trade-show": "Trade show",
  other: "Other",
};

export const IDEA_STAGES = ["backlog", "planned", "doing", "review", "done"] as const;
export type IdeaStage = (typeof IDEA_STAGES)[number];
export const IDEA_STAGE_LABEL: Record<IdeaStage, string> = { backlog: "Ideas", planned: "Planned", doing: "In progress", review: "In review", done: "Done" };

export const IDEA_PRIORITIES = ["high", "medium", "low"] as const;
export type IdeaPriority = (typeof IDEA_PRIORITIES)[number];

/* ---------- UTM links ---------- */

export type Utm = { source: string; medium: string; campaign: string; content?: string; term?: string };
const utmValue = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 60);

/**
 * A link that tells the analytics where a visit came from: the page's address with utm_* added (existing utm_* are
 * replaced, other parameters kept). Null when the address isn't a web address or a required part is empty.
 */
export function buildUtm(url: string, u: Utm): string | null {
  let base: URL;
  try {
    base = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(base.protocol)) return null;
  const parts: [string, string | undefined][] = [
    ["utm_source", u.source],
    ["utm_medium", u.medium],
    ["utm_campaign", u.campaign],
    ["utm_content", u.content],
    ["utm_term", u.term],
  ];
  for (const [k] of parts) base.searchParams.delete(k);
  for (const [k, v] of parts) {
    const clean = v ? utmValue(v) : "";
    if (!clean) {
      if (k === "utm_source" || k === "utm_medium" || k === "utm_campaign") return null;
      continue;
    }
    base.searchParams.set(k, clean);
  }
  return base.toString();
}

/** Ready-made source/medium pairs per channel. */
export const UTM_PRESETS: { label: string; source: string; medium: string }[] = [
  { label: "Instagram post", source: "instagram", medium: "social" },
  { label: "Instagram ad", source: "instagram", medium: "paid_social" },
  { label: "Facebook ad", source: "facebook", medium: "paid_social" },
  { label: "LinkedIn post", source: "linkedin", medium: "social" },
  { label: "LinkedIn ad", source: "linkedin", medium: "paid_social" },
  { label: "TikTok", source: "tiktok", medium: "social" },
  { label: "Email campaign", source: "newsletter", medium: "email" },
  { label: "Google Ads", source: "google", medium: "cpc" },
  { label: "Trade show QR", source: "trade_show", medium: "qr" },
];
