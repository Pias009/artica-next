import type { Metadata } from "next";
import { Vela } from "@/components/admin/views/Vela";
import { requireAdmin } from "@/lib/admin/auth";
import { getVelaInsights } from "@/lib/vela/insights";
import { getPausedTeams } from "@/lib/vela/team-state";

export const metadata: Metadata = { title: "Vela HQ" };

/** Vela's HQ: the admin's AI chief of staff and her 11 teams, with live figures from the site (lib/vela). */
export default async function VelaPage() {
  const who = await requireAdmin();
  const [insights, paused] = await Promise.all([getVelaInsights(), getPausedTeams()]);
  return <Vela initial={{ insights, paused }} admin={who.admin.name.split(/\s+/)[0] || "there"} />;
}
