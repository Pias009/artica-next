import "server-only";

/**
 * Which AI model Kai runs on, through the Vercel AI Gateway (one key, any provider):
 *   AI_GATEWAY_API_KEY   from vercel.com → AI Gateway → API keys (locally; on Vercel, OIDC works without it)
 *   ASSISTANT_MODEL      default spacexai/grok-4.20-non-reasoning (fast, tool use, low cost)
 *   ASSISTANT_FALLBACKS  comma-separated, tried in order if the main model fails; default two open-weight models
 * Without a key and without ASSISTANT_MODEL set, Kai answers with its offline engine (local.ts) instead.
 * Model ids: https://vercel.com/ai-gateway/models
 */
export const MODEL = process.env.ASSISTANT_MODEL || "spacexai/grok-4.20-non-reasoning";
export const FALLBACKS = (process.env.ASSISTANT_FALLBACKS ?? "deepseek/deepseek-v4.1-flash,zai/glm-5.3-flash")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** A key, or a model chosen on purpose (on Vercel the gateway then signs in with the deployment's OIDC token). */
export const aiReady = () => !!process.env.AI_GATEWAY_API_KEY || !!process.env.ASSISTANT_MODEL;

export const gatewayOptions = { gateway: { models: FALLBACKS } };
