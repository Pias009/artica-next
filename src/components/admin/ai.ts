/*
 * The assistant's own answers from the panel's real figures (PanelData), used when the AI model is off, over budget
 * or unreachable. The model answers first through askAdminAction (ai-actions.ts).
 */

import type { PanelData } from "@/lib/admin/panel";

const n = (x: number) => x.toLocaleString("en-US");
const INTENT: Record<string, string> = {
  quote: "quote",
  sample: "samples",
  visit: "visit",
  private_label: "private label",
  shipping: "shipping",
};

export const SUGGESTED = [
  "Summarise this week's inquiries",
  "Which styles should I feature?",
  "Draft a reply to the newest inquiry",
  "How fast are we replying?",
];

export function askAssistant(prompt: string, d: PanelData): string {
  const p = prompt.toLowerCase();
  if (!d.ready) return "There's no database connected yet (MONGODB_URI), so there are no inquiries or visitor figures to read.";
  const rows = d.inquiries;
  const open = rows.filter((i) => i.status === "new" || i.status === "replied");
  if (/draft|reply to|write back/.test(p)) {
    const i = rows.find((r) => r.status === "new") ?? rows[0];
    if (!i) return "There are no inquiries to reply to yet.";
    return `A start for ${i.company} (${i.ref}):\n\nDear ${i.company} team,\n\nThank you for your inquiry${i.styles.length ? ` about the ${i.styles.join(", ")}` : ""}. ${i.pairs ? `For ${n(i.pairs)} pairs ` : ""}we'll send tier pricing ([tier price] per pair) and shipping to ${i.country}. Samples reach you in about 10 days.\n\nCould you confirm your trade terms (DDP or FOB) and the month you need the goods?\n\nBest regards,\nChime Long trade desk\n\nOpen the inquiry for a full draft with Kai.`;
  }
  if (/style|product|feature|sell/.test(p)) {
    const top = [...d.products]
      .sort((a, b) => b.inquiries - a.inquiries)
      .filter((x) => x.inquiries)
      .slice(0, 3);
    if (!top.length)
      return "No style has been asked for in the last 90 days yet. Feature the styles with a Top reorder or Trending badge until inquiries come in.";
    return `Feature these: ${top.map((t) => `${t.name} (${t.inquiries} ${t.inquiries === 1 ? "inquiry" : "inquiries"})`).join(", ")}, the most asked for in the last 90 days. Turn on Featured in Products to put them first everywhere on the site.`;
  }
  if (/fast|reply|response|speed/.test(p)) {
    const s = d.inquiryStats;
    const last = d.overview?.months.at(-1);
    return `${s?.medianReplyHours != null ? `Median first reply over the last 30 days: ${s.medianReplyHours.toFixed(1)} h. ` : "No replies recorded in the last 30 days. "}${last ? `${last.replied} of ${last.m}'s ${last.leads} inquiries had a reply inside 24 hours. ` : ""}${s?.overdue ? `${s.overdue} new ${s.overdue === 1 ? "inquiry is" : "inquiries are"} past 20 hours without a reply.` : "Nothing is overdue."}`;
  }
  const week = d.overview?.week.reduce((a, x) => a + x.n, 0) ?? 0;
  const busiest = [...(d.overview?.week ?? [])].sort((a, b) => b.n - a.n)[0];
  const newest = rows[0];
  return `${week} ${week === 1 ? "inquiry" : "inquiries"} in the last 7 days${busiest?.n ? `, the most on ${busiest.day} (${busiest.n})` : ""}. ${open.length} waiting on a reply or quote${d.overview?.markets[0] ? `; ${d.overview.markets[0].name} sends the most` : ""}.${newest ? ` Newest: ${newest.company} (${newest.country}), ${INTENT[newest.intent] ?? newest.intent}${newest.pairs ? `, ${n(newest.pairs)} pairs` : ""}.` : ""}`;
}
