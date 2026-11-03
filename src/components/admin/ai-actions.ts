"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { panelData } from "@/lib/admin/panel";
import { answerAdmin, describeStyle, sectionIdeas } from "@/lib/assistant/admin-ai";
import { allProducts } from "@/lib/products";

/* The admin panel's AI buttons, as server actions: each checks the admin first. */

export async function describeProductAction(id: string, name: string) {
  await requireAdmin();
  if (!allProducts.some((p) => p.id === id)) return "";
  return describeStyle(id, String(name).slice(0, 40));
}

export async function sectionIdeasAction(label: string, title: string, sub: string) {
  await requireAdmin();
  return sectionIdeas(String(label).slice(0, 60), String(title).slice(0, 120), String(sub).slice(0, 220));
}

/** The ⌘K assistant: an answer from the panel's real figures, or null (the panel then answers from its own rules). */
export async function askAdminAction(question: string) {
  await requireAdmin();
  const q = String(question).trim().slice(0, 500);
  if (!q) return null;
  const d = await panelData();
  const facts = {
    today: new Date().toISOString().slice(0, 10),
    inquiryTotals: d.inquiryStats,
    latestInquiries: d.inquiries.slice(0, 20).map((i) => ({
      ref: i.ref,
      company: i.company,
      country: i.country,
      wants: i.intent,
      pairs: i.pairs,
      status: i.status,
      received: i.createdAt,
      styles: i.styles,
      note: i.note.slice(0, 200),
    })),
    stylesAskedMost90d: [...d.products]
      .sort((a, b) => b.inquiries - a.inquiries)
      .slice(0, 8)
      .map((p) => ({ name: p.name, inquiries: p.inquiries })),
    inquiriesByMonth: d.overview?.months,
    topMarkets90d: d.overview?.markets.map((m) => ({
      country: m.name,
      share: m.share,
    })),
    visitorsLast7Days: d.visitors && {
      sessions: d.visitors.sessions,
      funnel: d.visitors.funnel,
      sources: d.visitors.sources,
      searchesWithNoResults: d.visitors.searches.filter((s) => !s.found),
    },
  };
  return answerAdmin(q, facts);
}
