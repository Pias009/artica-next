import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, isStepCount, smoothStream, streamText, toUIMessageStream, validateUIMessages } from "ai";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { allow } from "@/lib/assistant/limit";
import { backOff, modelAllowed, record, spend } from "@/lib/assistant/budget";
import { localFirst, localReply, type LocalReply } from "@/lib/assistant/local";
import { planFirst, planReply } from "@/lib/assistant/plan-local";
import type { PlanProfile } from "@/lib/assistant/plan-skills";
import { aiReady, kaiModel } from "@/lib/assistant/model";
import { instructions } from "@/lib/assistant/persona";
import { countQuestion } from "@/lib/assistant/questions";
import { topicOf, type SourceId } from "@/lib/assistant/topics";
import { country, visitorSeason } from "@/lib/assistant/skills";
import { makeTools, MODE_TOOLS, type KaiMessage, type KaiMode } from "@/lib/assistant/tools";
import { LEVELS, type Level } from "@/lib/planner";
import { loadContent } from "@/lib/content/store";
import { dbReady, inquiries } from "@/lib/leads/db";
import { byId } from "@/lib/products";
import { SEASON_COOKIE } from "@/lib/season";

export const maxDuration = 60;

const MAX_MESSAGES = 20;
/** The model sees only the latest turns: older ones cost tokens on every reply and rarely change the answer. */
const MODEL_TURNS = 8;
const MAX_TEXT = 2000;

/**
 * Kai's chat endpoint (useChat on the site posts here). Validates and trims the conversation, rate-limits per
 * address, then answers, spending model tokens only when they're needed:
 *   1. the offline engine, when it can answer as well as the model (localFirst: most messages, zero tokens);
 *   2. the AI model (Gemini, with a fallback model), if the budget allows (budget.ts);
 *   3. the offline engine again, when there's no model, the budget is spent, the provider is pausing us, or the
 *      client asks after an AI error.
 * Nothing of the conversation is stored (it lives in the visitor's browser); each message only adds one to its topic's
 * count for the day (questions.ts), for the admin panel.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: unknown; page?: unknown; list?: unknown; offline?: unknown; mode?: unknown; plan?: unknown } | null;
  if (!body || !Array.isArray(body.messages) || !body.messages.length) return new Response("Bad request", { status: 400 });

  // one more message on this topic today, counted after the response (never the text: assistant/questions.ts)
  const deskOf = body.mode === "plan" ? "plan" : "trade";
  const count = (text: string, source: SourceId, first: boolean) => after(() => countQuestion({ desk: deskOf, topic: topicOf(text, deskOf), source, first }));
  const rawLast = (() => {
    const m = (body.messages as { role?: unknown; parts?: { type?: unknown; text?: unknown }[] }[]).at(-1);
    return m?.role === "user" && Array.isArray(m.parts) ? m.parts.flatMap((p) => (p?.type === "text" ? [String(p.text ?? "").slice(0, MAX_TEXT)] : [])).join(" ") : "";
  })();
  const rawFirst = (body.messages as { role?: unknown }[]).filter((m) => m?.role === "user").length === 1;

  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await allow(`ip:${ip}`))) return count(rawLast, "limited", rawFirst), new Response("You've sent a lot of messages. Please wait a few minutes, or send us an inquiry.", { status: 429 });

  // the visitor, as the site already knows them (proxy cookies, the page, their inquiry list)
  const jar = await cookies();
  const season = visitorSeason(jar.get(SEASON_COOKIE.pick)?.value ?? jar.get(SEASON_COOKIE.season)?.value);
  const where = country(jar.get(SEASON_COOKIE.country)?.value ?? h.get("x-vercel-ip-country"))?.name;
  const page = typeof body.page === "string" && /^\/[\w\-/?=&.%]{0,120}$/.test(body.page) ? body.page : undefined;
  const list = Array.isArray(body.list) ? body.list.slice(0, 50).flatMap((id) => (typeof id === "string" && byId[id] ? [byId[id].name] : [])) : [];

  let requestedCache: Promise<{ id: string; inquiries: number }[]> | null = null;
  const requested = () => (requestedCache ??= mostRequested());
  // two desks: trade help (styles, terms, shipping) and business planning (timing, order, cost, cash)
  const mode: KaiMode = body.mode === "plan" ? "plan" : "trade";
  // the admin panel's switches (AI agent view): each desk on or off, and whether Kai may use the AI model at all
  const { assistant } = await loadContent();
  if (!assistant[mode]) return count(rawLast, "closed", rawFirst), new Response("This desk is closed for now. Please send us an inquiry.", { status: 503 });
  const profile = mode === "plan" ? planProfile(body.plan) : {};
  const tools = makeTools({ season, requested, profile });

  // only text from the visitor, each message capped; tool parts are checked against the tools' schemas
  const recent = (body.messages as KaiMessage[]).slice(-MAX_MESSAGES).map((m) =>
    m?.role === "user" ? { ...m, parts: (m.parts ?? []).filter((p) => p?.type === "text").map((p) => ({ ...p, text: String((p as { text?: unknown }).text ?? "").slice(0, MAX_TEXT) })) } : m,
  );
  let messages: KaiMessage[];
  try {
    messages = await validateUIMessages<KaiMessage>({ messages: recent, tools });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user") return new Response("Bad request", { status: 400 });

  const text = last.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ");
  const ctx = { season, country: where, requested: dbReady() ? await requested() : [], profile };
  const turns = messages.filter((m) => m.role === "user").length;
  const [answer, first] = mode === "plan" ? [planReply, planFirst] : [localReply, localFirst];
  const local = !aiReady() || !assistant.model || body.offline === true ? answer(text, ctx) : (first(text, turns, ctx) ?? ((await modelAllowed()) ? null : answer(text, ctx)));
  if (local) {
    count(text, "rules", turns === 1);
    return offline(local);
  }
  count(text, "model", turns === 1);

  const { model, providerOptions } = kaiModel();
  spend();
  const result = streamText({
    model,
    instructions: instructions({ country: where, season, page, list, plan: mode === "plan" ? profileText(profile) : undefined, tone: assistant.tone }, mode),
    messages: await convertToModelMessages(messages.slice(-MODEL_TURNS), { tools, ignoreIncompleteToolCalls: true }),
    tools,
    activeTools: MODE_TOOLS[mode],
    stopWhen: isStepCount(4),
    maxOutputTokens: 600,
    temperature: 0.4,
    // the fallback model (model.ts) handles a busy provider; retrying the same one only adds waiting
    maxRetries: 0,
    providerOptions,
    // even word-sized pieces, so replies flow in smoothly instead of in bursts
    experimental_transform: smoothStream({ chunking: "word", delayInMs: 12 }),
    onEnd: ({ steps, totalUsage }) => record(steps.length, (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0)),
    onError: ({ error }) => backOff(error),
  });
  return createUIMessageStreamResponse({
    headers: { "x-kai-source": "model" },
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (e) => {
        console.error("[assistant] model error", e);
        backOff(e);
        return "Kai couldn't reach its AI model just now.";
      },
    }),
  });
}

/** An offline answer, streamed word by word like the model's, so both read and animate the same way. */
function offline(reply: LocalReply) {
    const stream = createUIMessageStream<KaiMessage>({
      async execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "t" });
        for (const word of reply.text.match(/\S+\s*/g) ?? []) {
          writer.write({ type: "text-delta", id: "t", delta: word });
          await new Promise((r) => setTimeout(r, 14));
        }
        writer.write({ type: "text-end", id: "t" });
        reply.tools.forEach((t, i) => {
          const toolCallId = `local-${Date.now()}-${i}`;
          writer.write({ type: "tool-input-available", toolCallId, toolName: t.name, input: t.input });
          writer.write({ type: "tool-output-available", toolCallId, output: t.output });
        });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream, headers: { "x-kai-source": "offline" } });
}

/** What the planner page knows about the buyer (sent from their browser): checked field by field, the rest dropped. */
function planProfile(raw: unknown): PlanProfile {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const lines = Array.isArray(r.lines) ? r.lines.filter((l): l is "men" | "women" | "kids" => l === "men" || l === "women" || l === "kids") : undefined;
  return {
    country: typeof r.country === "string" && /^[A-Z]{2}$/.test(r.country) ? r.country : undefined,
    level: typeof r.level === "string" && r.level in LEVELS ? (r.level as Level) : undefined,
    firstOrder: typeof r.firstOrder === "boolean" ? r.firstOrder : undefined,
    budget: typeof r.budget === "number" && r.budget > 0 && r.budget < 1e8 ? r.budget : undefined,
    lines: lines?.length ? lines : undefined,
  };
}

const profileText = (p: PlanProfile) =>
  [
    p.level && `${LEVELS[p.level].name}.`,
    p.country && `Sells in ${country(p.country)?.name ?? p.country}.`,
    p.firstOrder !== undefined && (p.firstOrder ? "First order with us." : "Has ordered before."),
    p.budget && `Budget about $${Math.round(p.budget).toLocaleString("en-US")}.`,
    p.lines?.length && `Customers: ${p.lines.join(", ")}.`,
  ]
    .filter(Boolean)
    .join(" ") || "Nothing yet.";

/** The styles buyers asked for most in the last 90 days (spam left out). */
async function mostRequested() {
  if (!dbReady()) return [];
  try {
    return await inquiries()
      .aggregate<{ id: string; inquiries: number }>([
        { $match: { createdAt: { $gte: new Date(Date.now() - 90 * 86_400_000) }, status: { $ne: "spam" } } },
        { $unwind: "$lines" },
        { $group: { _id: "$lines.productId", inquiries: { $sum: 1 } } },
        { $sort: { inquiries: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, id: "$_id", inquiries: 1 } },
      ])
      .toArray();
  } catch {
    return [];
  }
}
