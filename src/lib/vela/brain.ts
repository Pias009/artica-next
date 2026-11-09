import "server-only";
import { generateText, type ModelMessage } from "ai";
import { backOff, modelAllowed, record, spend } from "../assistant/budget";
import { aiReady, kaiModel } from "../assistant/model";
import { COMPANY } from "../company";
import { insightsForPrompt, type VelaInsights } from "./insights";
import { AGENT, TEAMS, TEAM_BY_ID, type TeamId } from "./teams";

/*
 * Vela's answers: the model reads every active team's live figures (insights.ts) and answers as the admin's chief of
 * staff, from the routed team's point of view. It shares Kai's model and daily budget (assistant/model.ts, budget.ts);
 * past the budget, or with no AI key, Vela gives that team's findings as written.
 */

export type Turn = { role: "user" | "assistant"; content: string };
export type Reply = { text: string; team: TeamId; model: string };

const MAX = 2000;

export function liveLine(i: VelaInsights) {
  const o = i.overview;
  const k = (v: number, one: string, many = `${one}s`) => `${v.toLocaleString("en-US")} ${v === 1 ? one : many}`;
  return [
    `${k(o.inquiries30, "inquiry", "inquiries")} (30 d)`,
    `${k(o.visits7, "visit")} (7 d)`,
    `${o.waiting} waiting`,
    `${o.overdue} overdue`,
    o.medianReplyHours != null ? `median reply ${o.medianReplyHours.toFixed(1)} h` : null,
    o.winRate90 ? `win rate ${o.winRate90}` : null,
    `${k(o.jsErrors7, "JS error")} (7 d)`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function fallback(team: TeamId, i: VelaInsights, admin: string) {
  const t = TEAM_BY_ID[team];
  const ins = i.teams[team];
  return `${admin}, here is the ${t.name} team's report from the live data.\n\n**${ins.headline}.**\n\n${ins.findings.map((f) => `- ${f}`).join("\n")}`;
}

export async function answer(o: {
  message: string;
  history: Turn[];
  team: TeamId;
  insights: VelaInsights;
  paused: TeamId[];
  admin: string;
  greeting?: boolean;
}): Promise<Reply> {
  const { team, insights, paused, admin } = o;
  const active = TEAMS.filter((t) => !paused.includes(t.id));
  const t = TEAM_BY_ID[team];
  const instructions = `You are ${AGENT.name}, the AI chief of staff in the admin panel of ${COMPANY.name}, a wholesale footwear factory in Guangzhou selling to shops, distributors and brands worldwide (MOQ 300 pairs per style, samples in about 10 days). Buyers send inquiries through the website; the trade desk replies, quotes and wins orders.
You lead ${TEAMS.length} AI teams. Active: ${active.map((x) => x.name).join(", ") || "none"}.${paused.length ? ` Switched off by the admin: ${paused.map((id) => TEAM_BY_ID[id].name).join(", ")}. They are not working; don't report for them, and say so if asked.` : ""}
This question was routed to the ${t.name} team (mission: ${t.mission}). Answer from that team's point of view, using the other teams' data when it helps.

The admin you are talking to: ${admin}. Address them by name now and then, not in every reply.
${o.greeting ? `\nCONTEXT: you just greeted the admin and asked how they are; this message is their answer. React warmly in one short sentence (if they ask how you are, answer briefly). Then give today's briefing: the two or three things across all teams that need attention first, one short sentence each with its key number. End by asking what they'd like to look at first. Up to 90 words.\n` : ""}
PERSONALITY: warm, calm and sharp, like a trusted chief of staff. Natural and human; brief small talk is fine.

RULES
- Copy numbers exactly as they appear in LIVE DATA. Never round, re-derive or estimate them.
- Use only the facts in LIVE DATA. Never invent figures, companies, styles, rankings, or actions you have taken.
- Anything under notConnected has no data yet: say so plainly.
- You can't change the site yourself. Recommend concrete next steps the admin can take in this panel (Inquiries, Products, Pages, Seasons, Visitors, Settings).
- Prices are never quoted to buyers by the site; never suggest publishing prices.
- Be concise: at most 2–3 short paragraphs or a tight bullet list. Bold the key figures with **. Lead with the answer in the first sentence: it may be read aloud on its own.

LIVE DATA (JSON)
${JSON.stringify(insightsForPrompt(insights, paused))}`;

  if (aiReady() && (await modelAllowed())) {
    try {
      const { model, providerOptions } = kaiModel();
      spend();
      const messages: ModelMessage[] = [
        ...o.history.slice(-6).map((h) => ({ role: h.role, content: h.content.slice(0, MAX) }) as ModelMessage),
        { role: "user", content: o.message.slice(0, MAX) },
      ];
      const { text, steps, totalUsage } = await generateText({
        model,
        instructions,
        messages,
        maxOutputTokens: 700,
        temperature: 0.3,
        providerOptions,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(25_000),
      });
      await record(steps.length, (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0));
      const clean = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (clean) return { text: clean, team, model: "AI model" };
    } catch (e) {
      backOff(e);
      console.error("[vela] model failed, answering from the live data", e);
    }
  }
  return { text: fallback(team, insights, admin), team, model: "Live-data summary" };
}
