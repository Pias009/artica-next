import "server-only";
import { createGoogle } from "@ai-sdk/google";
import { gateway, wrapLanguageModel, type JSONValue, type LanguageModel } from "ai";

/**
 * Which AI model Kai thinks with. In order of preference:
 *   GOOGLE_GENERATIVE_AI_API_KEY  Gemini, direct (Google AI Studio). Models in ASSISTANT_GEMINI_MODELS, tried in
 *                                 order when one is busy; default gemini-3.5-flash, then gemini-3.5-flash-lite.
 *   AI_GATEWAY_API_KEY / ASSISTANT_MODEL  any model through the Vercel AI Gateway (ASSISTANT_MODEL, with
 *                                 ASSISTANT_FALLBACKS), e.g. spacexai/grok-4.20-non-reasoning.
 * Neither set: Kai answers with its offline engine (local.ts). Limits and pauses: budget.ts.
 */

const list = (v: string | undefined, d: string) =>
  (v || d)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const provider = (): "gemini" | "gateway" | null =>
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "gemini" : process.env.AI_GATEWAY_API_KEY || process.env.ASSISTANT_MODEL ? "gateway" : null;

export const aiReady = () => provider() !== null;

/** "Busy", "too many", server errors and dropped connections: worth trying the next model. Bad requests aren't. */
const retryable = (e: unknown) => {
  const status = (e as { statusCode?: number })?.statusCode;
  return status === undefined || status === 429 || status >= 500;
};

let cached: { model: LanguageModel; providerOptions: Record<string, Record<string, JSONValue>> } | null = null;

/** The model to call and its options: Gemini with fallbacks, or the gateway. Built once per server instance. */
export function kaiModel() {
  if (cached) return cached;
  if (provider() === "gemini") {
    const google = createGoogle();
    const [first, ...rest] = list(process.env.ASSISTANT_GEMINI_MODELS, "gemini-3.5-flash,gemini-3.5-flash-lite").map((id) => google(id));
    // when a model is busy or out of quota, the same request goes to the next one before Kai gives up
    const model = wrapLanguageModel({
      model: first,
      middleware: {
        specificationVersion: "v4",
        wrapStream: async ({ doStream, params }) => {
          try {
            return await doStream();
          } catch (error) {
            for (const next of rest) {
              if (!retryable(error)) break;
              try {
                return await next.doStream(params);
              } catch (e) {
                error = e;
              }
            }
            throw error;
          }
        },
        wrapGenerate: async ({ doGenerate, params }) => {
          try {
            return await doGenerate();
          } catch (error) {
            for (const next of rest) {
              if (!retryable(error)) break;
              try {
                return await next.doGenerate(params);
              } catch (e) {
                error = e;
              }
            }
            throw error;
          }
        },
      },
    });
    // minimal thinking: Kai's answers come from its tools, so reasoning tokens would be spent for nothing
    cached = { model, providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } } };
  } else {
    cached = {
      model: gateway(process.env.ASSISTANT_MODEL || "spacexai/grok-4.20-non-reasoning"),
      providerOptions: { gateway: { models: list(process.env.ASSISTANT_FALLBACKS, "deepseek/deepseek-v4.1-flash,zai/glm-5.3-flash") } },
    };
  }
  return cached;
}
