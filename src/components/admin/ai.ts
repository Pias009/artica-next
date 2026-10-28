/*
 * The assistant, answering from the panel's own data. These are local stand-ins with the same shape as a model
 * call (prompt in, text out), so wiring a real model later (an API route on the AI SDK) only swaps these bodies.
 */

import { INQUIRIES, MARKETS, MONTHS, PRODUCTS, WEEK, intentLabel, type Section } from "./data";

const n = (x: number) => x.toLocaleString("en-US");

export const SUGGESTED = ["Summarise this week's inquiries", "Which styles should I feature?", "Draft a reply to the newest inquiry", "How fast are we replying?"];

export function askAssistant(prompt: string): string {
  const p = prompt.toLowerCase();
  const open = INQUIRIES.filter((i) => i.status === "new" || i.status === "replied");
  if (/draft|reply to|write back/.test(p)) {
    const i = INQUIRIES[0];
    return `Here's a draft for ${i.contact} at ${i.company}:\n\nHi ${i.contact.split(" ")[0]},\n\nThanks for your inquiry about the ${i.styles.join(" and ")}. For ${n(i.pairs)} pairs we can ship DDP to Oslo, duties included, with samples in 10 days. I've attached the FW26 line sheet and tier pricing; the quote holds for 30 days.\n\nWould a short video call this week help to settle sizes?\n\nBest regards,\nThe Chime Long trade desk`;
  }
  if (/style|product|feature|sell/.test(p)) {
    const top = [...PRODUCTS].sort((a, b) => b.inquiries - a.inquiries).slice(0, 3);
    return `Feature these three: ${top.map((t) => `${t.name} (${t.inquiries} inquiries)`).join(", ")}. ${top[0].name} is asked about most and pairs well with the winter campaign; put it first in Hot products and on the campaign banner.`;
  }
  if (/fast|reply|response|speed/.test(p)) {
    const last = MONTHS[MONTHS.length - 1];
    return `${Math.round((last.replied / last.leads) * 100)}% of ${last.m}'s ${last.leads} inquiries had a first reply inside 24 hours, up from ${Math.round((MONTHS[0].replied / MONTHS[0].leads) * 100)}% in ${MONTHS[0].m}. ${open.length} are still waiting on a quote; the oldest is ${open[open.length - 1].company}.`;
  }
  const week = WEEK.reduce((s, d) => s + d.n, 0);
  const busiest = [...WEEK].sort((a, b) => b.n - a.n)[0];
  return `${week} inquiries this week, the busiest on ${busiest.day} (${busiest.n}). ${INQUIRIES.filter((i) => i.status === "new").length} are new, mostly ${intentLabel("quote").toLowerCase()} requests; ${MARKETS[0].name} and ${MARKETS[1].name} send the most. ${INQUIRIES[0].company} wants ${n(INQUIRIES[0].pairs)} pairs DDP: answer that one first.`;
}

/** Copy suggestions for a section: shorter, sharper, and benefit-first. */
export function suggestCopy(s: Section): { tone: string; title: string; sub: string }[] {
  const t = s.title.replace(/\.$/, "");
  const first = t.split(/[,:.–]/)[0].trim();
  return [
    { tone: "Shorter", title: `${first}.`, sub: s.sub.split(/[,.]/)[0] + "." },
    { tone: "Bolder", title: `${first}, built to sell through.`, sub: "Factory-direct, from 300 pairs per style." },
    { tone: "Benefit first", title: "Fewer returns, fuller shelves.", sub: `${s.sub.replace(/\.$/, "")}, with samples in 10 days.` },
  ];
}

/** A product description the way the catalogue writes them. */
export function describeProduct(name: string, type: string, rating?: string) {
  return `The ${name} is a ${type.toLowerCase()} made for full-price sell-through: waterproof leather, a sealed seam bootie and a lugged rubber sole${rating ? ` rated to ${rating}` : ""}. Ships in mixed-size cases of 12, from 300 pairs per style.`;
}
