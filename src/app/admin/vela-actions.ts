"use server";

import { audit, requireAdmin } from "@/lib/admin/auth";
import { dbReady } from "@/lib/leads/db";
import { answer, liveLine, type Turn } from "@/lib/vela/brain";
import { getVelaInsights } from "@/lib/vela/insights";
import { getPausedTeams, setTeamsActive } from "@/lib/vela/team-state";
import { isTeamId, routeQuestion, TEAM_BY_ID, TEAMS, type TeamId } from "@/lib/vela/teams";

/* Vela's HQ, as server actions: each checks the admin first and reads only. Team switches are audited. */

/** The live figures for every team, and which teams are off. */
export async function velaInsightsAction() {
  await requireAdmin();
  const [insights, paused] = await Promise.all([getVelaInsights(), getPausedTeams()]);
  return { insights, paused };
}

export type VelaAnswer = { ok: true; text: string; team: TeamId; teamName: string; model: string; live: string } | { ok: false; error: string };

/** A question for Vela. `team` asks one team directly; otherwise the question is routed by its words. */
export async function velaAskAction(input: { message: string; history?: Turn[]; team?: string; greeting?: boolean }): Promise<VelaAnswer> {
  const who = await requireAdmin();
  const message = String(input?.message ?? "").trim().slice(0, 2000);
  if (!message) return { ok: false, error: "Ask Vela something first." };
  const history = (Array.isArray(input.history) ? input.history : [])
    .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string" && h.content.trim())
    .slice(-6);
  try {
    const [insights, paused] = await Promise.all([getVelaInsights(), getPausedTeams()]);
    const asked = isTeamId(input.team) ? input.team : null;
    let team = asked ?? routeQuestion(message);
    const live = liveLine(insights);
    if (paused.includes(team)) {
      if (asked && !input.greeting) {
        const name = TEAM_BY_ID[team].name;
        return { ok: true, text: `The ${name} team is switched off, so they have no report. Turn the team on and ask me again.`, team, teamName: name, model: "Vela", live };
      }
      team = TEAMS.find((t) => !paused.includes(t.id))?.id ?? team;
    }
    const first = who.admin.name.split(/\s+/)[0] || "there";
    const r = await answer({ message, history, team, insights, paused, admin: first, greeting: !!input.greeting });
    return { ok: true, text: r.text, team: r.team, teamName: TEAM_BY_ID[r.team].name, model: r.model, live };
  } catch (e) {
    console.error("[vela] ask", e);
    return { ok: false, error: "Vela couldn't answer just now. Try again in a moment." };
  }
}

/** Switch a team (or every team) on or off for every admin. */
export async function velaTeamAction(team: string, active: boolean): Promise<{ ok: true; paused: TeamId[] } | { ok: false; error: string }> {
  const who = await requireAdmin();
  if (typeof active !== "boolean" || !(team === "all" || isTeamId(team))) return { ok: false, error: "Unknown team." };
  try {
    const paused = await setTeamsActive(team === "all" ? "all" : [team], active, who.admin.email);
    if (dbReady())
      await audit({
        adminId: who.admin._id,
        email: who.admin.email,
        action: "vela_team",
        detail: `${team === "all" ? "All teams" : TEAM_BY_ID[team].name} ${active ? "on" : "off"}`,
      }).catch(() => {});
    return { ok: true, paused };
  } catch (e) {
    console.error("[vela] team switch", e);
    return { ok: false, error: "Couldn't save the team switch. Try again." };
  }
}
