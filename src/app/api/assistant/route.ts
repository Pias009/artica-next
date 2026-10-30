import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, isStepCount, smoothStream, streamText, toUIMessageStream, validateUIMessages } from "ai";
import { cookies, headers } from "next/headers";
import { allow } from "@/lib/assistant/limit";
import { localReply } from "@/lib/assistant/local";
import { aiReady, gatewayOptions, MODEL } from "@/lib/assistant/model";
import { instructions } from "@/lib/assistant/persona";
import { country, visitorSeason } from "@/lib/assistant/skills";
import { makeTools, type KaiMessage } from "@/lib/assistant/tools";
import { dbReady, inquiries } from "@/lib/leads/db";
import { byId } from "@/lib/products";
import { SEASON_COOKIE } from "@/lib/season";

export const maxDuration = 60;

const MAX_MESSAGES = 20;
const MAX_TEXT = 2000;

/**
 * Kai's chat endpoint (useChat on the site posts here). Validates and trims the conversation, rate-limits per
 * address, and answers with the AI model and its tools, or with the offline engine when no model is configured (or
 * the client asks for it after an AI error). Nothing is stored: the conversation lives in the visitor's browser.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: unknown; page?: unknown; list?: unknown; offline?: unknown } | null;
  if (!body || !Array.isArray(body.messages) || !body.messages.length) return new Response("Bad request", { status: 400 });

  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await allow(`ip:${ip}`))) return new Response("You've sent a lot of messages. Please wait a few minutes, or send us an inquiry.", { status: 429 });

  // the visitor, as the site already knows them (proxy cookies, the page, their inquiry list)
  const jar = await cookies();
  const season = visitorSeason(jar.get(SEASON_COOKIE.pick)?.value ?? jar.get(SEASON_COOKIE.season)?.value);
  const where = country(jar.get(SEASON_COOKIE.country)?.value ?? h.get("x-vercel-ip-country"))?.name;
  const page = typeof body.page === "string" && /^\/[\w\-/?=&.%]{0,120}$/.test(body.page) ? body.page : undefined;
  const list = Array.isArray(body.list) ? body.list.slice(0, 50).flatMap((id) => (typeof id === "string" && byId[id] ? [byId[id].name] : [])) : [];

  let requestedCache: Promise<{ id: string; inquiries: number }[]> | null = null;
  const requested = () => (requestedCache ??= mostRequested());
  const tools = makeTools({ season, requested });

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

  if (!aiReady() || body.offline === true) {
    const text = last.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ");
    const reply = localReply(text, { season, country: where, requested: dbReady() ? await requested() : [] });
    const stream = createUIMessageStream<KaiMessage>({
      // word by word, like the model streams, so both read and animate the same way
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
    return createUIMessageStreamResponse({ stream });
  }

  const result = streamText({
    model: MODEL,
    instructions: instructions({ country: where, season, page, list }),
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(6),
    maxOutputTokens: 900,
    providerOptions: gatewayOptions,
    // even word-sized pieces, so replies flow in smoothly instead of in bursts
    experimental_transform: smoothStream({ chunking: "word", delayInMs: 12 }),
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (e) => {
        console.error("[assistant] model error", e);
        return "Kai couldn't reach its AI model just now.";
      },
    }),
  });
}

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
