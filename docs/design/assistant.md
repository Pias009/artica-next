# Kai, the trade assistant: how it works

**Status:** Built, v1 · **Date:** 2026-10-30 · **Code:** `src/lib/assistant/`, `src/components/assistant/`, `src/app/api/assistant/`, `src/app/(site)/assistant/`

Kai is a sales assistant for wholesale buyers. It recommends styles by market and season, says what's selling, answers terms and policy questions (MOQ, samples, payment, shipping, privacy, how to order), and prepares inquiries the buyer sends with one click. In the admin, it drafts replies to inquiries.

## Two desks

Kai has two desks, picked with tabs in the panel and on `/assistant` (`?desk=plan` opens the second). Each desk keeps its own conversation (`kai-chat` and `kai-plan` in sessionStorage):

| Desk | For | Tools the model may use (`MODE_TOOLS`) | Offline engine |
|---|---|---|---|
| **Trade help** | Styles, what sells, MOQ, samples, payment, shipping, inquiries | the trade skills below | `local.ts` |
| **Business plan** | When to order, what to order for a budget, landed cost, margin, cash | `planSeason`, `suggestOrder`, `estimateLanding` (`plan-skills.ts`, over `src/lib/planner`), plus product, shipping, policy, about, off-topic and draft tools | `plan-local.ts` |

The planning desk gets its own instructions (`PLAN` in `persona.ts`): timing first, never a season the stock can't reach, the buyer's prices or labelled examples only, no duty rates, forecasts or financial advice. The client sends what the visitor entered in `/business-plan` (country, stage, first order, budget, lines; checked field by field in the route), so answers fit their plan. Any page can open a desk with `useKai.getState().show("plan", "question")`. The numbers are the same code as the planner page, so chat and page always agree. Tested offline: timing, budget plans, landed cost, MOQ, off-topic and rude messages.

## The protocol

```
 Buyer ─▶ pop-up / /assistant ─▶ POST /api/assistant ─┬─ AI model (Gemini 3.5 Flash → Flash-Lite; or the AI Gateway)
                                                      │     └─ calls tools ─┐
                                                      └─ offline engine ────┤   (no model configured,
                                                                            ▼    or the buyer asks after an error)
                                                                  skills.ts: findProducts · productDetails ·
                                                                  seasonAdvice · topSellers · shippingInfo ·
                                                                  planOrder · policies · draftInquiry
                                                                            │
                                    products.ts · season(-products).ts · buyer-desk.ts · faq.ts · MongoDB (most-requested)
```

1. **Skills are the single source of facts.** Every skill is a plain function over the site's own data. The model calls them as tools, and the offline engine calls them directly, so both say the same thing. Update a product, a term or an FAQ answer, and Kai knows it on the next request. No retraining is needed.
2. **The model only phrases things.** The instructions (`persona.ts`) forbid inventing styles, prices, stock, sales figures or certificates. Prices never appear: tier pricing comes from the desk within 24 hours.
3. **Kai never acts alone.** All tools are read-only. `draftInquiry` only checks a draft. The buyer reviews it in a card and sends it through the same `submitInquiry` action and checks as the form. It's stored with `source: /assistant` and a "Prepared with Kai" note.
4. **Cards, not walls of text.** Tool results are rendered as product cards (add to inquiry, quick view) and the draft card. The model writes 2 to 5 sentences around them.
5. **Context comes from the site, not from questions.** The visitor's country (proxy cookie), the season on show, the page and the styles on their inquiry list go into the instructions.

### "Training"
Kai isn't fine-tuned. It is grounded instead: tools over live data, plus behaviour rules in `persona.ts`. That is the reliable approach for facts that change. To improve it:
- **Facts:** edit the data (products, `faq.ts`, `buyer-desk.ts`, `products.ts` terms). Kai picks it up.
- **Behaviour:** edit `instructions()` in `persona.ts` (tone, selling approach, what to ask).
- **New abilities:** add a skill in `skills.ts`, a tool for it in `tools.ts`, a card in `KaiChat.tsx` if it has a visual, and (optionally) a rule in `local.ts`.
- **Model:** Gemini via `GOOGLE_GENERATIVE_AI_API_KEY` (models in `ASSISTANT_GEMINI_MODELS`), or set `ASSISTANT_MODEL` to any [AI Gateway model](https://vercel.com/ai-gateway/models) with tool use. Open-weight options include `deepseek/deepseek-v4.1-flash`, `zai/glm-5.3-flash` and `moonshotai/kimi-k3`.

## Configuration

| Variable | Default | What it does |
|---|---|---|
| `AI_GATEWAY_API_KEY` | none | Turns the AI model on. Locally it's required; on Vercel, setting `ASSISTANT_MODEL` alone uses the deployment's OIDC token |
| `ASSISTANT_MODEL` | `spacexai/grok-4.20-non-reasoning` | The main model |
| `ASSISTANT_FALLBACKS` | `deepseek/deepseek-v4.1-flash,zai/glm-5.3-flash` | Tried in order if the main model fails (gateway-side) |

Without a key, Kai runs the **offline engine** (`local.ts`). It reads the message for intent (style search, season and country, top sellers, quantities, shipping, policies, drafting an inquiry) and answers in English from the same skills. If the AI fails mid-conversation, the chat offers "Quick answer without AI".

## Identity and conduct
- **Who Kai is:** an AI trade assistant for Chime Long, based in Guangzhou, China, selling wholesale footwear to businesses only. The facts come from the `aboutCompany` skill: range counts and categories from the catalog, markets, MOQ, verify and contact. Kai says plainly it's AI and that people confirm prices and orders. It never claims awards, years in business or clients the data doesn't give.
- **Always professional** (`persona.ts` for the model, `conduct.ts` for the offline engine, checked before anything else):
  - Insults and swearing: no mirroring, no lecture, an apology for the frustration, an offer of help or a person.
  - Sexual, hateful or threatening messages: one neutral sentence, back to footwear.
  - Card numbers or passwords: asked not to share them.
  - Jailbreaks ("ignore your instructions", "pretend you are…") and requests for the instructions: politely declined.
  - Questions about which AI it is: "a large language model".
  - Personal and off-topic questions: a brief, polite redirect.
  - Mild words count only when aimed at Kai, so "stupid question, but…" still gets a normal answer.
- **Off-topic replies:** one short, polite sentence ("Sorry, that's outside what I can help with. I'm here for wholesale footwear.") plus the `offTopic` options. Some options ask Kai (what sells this season, choosing styles, MOQ and prices, how to order); others open a page (pricing, catalog, shipping, FAQ, contact). The same goes for rude, hostile, personal and rule-changing messages. A shoe we don't make gets "I couldn't find that in our range" instead. Real buying questions never get these options: 29 test messages, including near-misses like "any news on new arrivals?", "do you use cookies?" and becoming a distributor.
- **Tested:** 49 messages, including normal buyer questions that must not be caught by these rules; all handled as intended.

## Token budget (spend only what a reply needs)
1. **Local first** (`localFirst` in `local.ts`): a short, single question in Latin script that doesn't lean on earlier turns, and that the offline engine answers with certainty, never reaches the model. That covers greetings, thanks, identity, off-topic, terms, shipping, quantities, product and season questions. Abusive or risky messages are always answered offline. Zero tokens.
2. **Lean calls:** tool results go to the model as one-line summaries (`toModelOutput` in `tools.ts`) while the buyer sees full cards. Only the last 8 messages are sent. Thinking is minimal, at most 4 steps and 600 output tokens. The fixed instructions come first, so Gemini's implicit cache can reuse them.
3. **Limits** (`budget.ts`): caps per minute and per day on calls and tokens; a pause after the provider's 429 (a minute, or an hour for a daily quota) or 503 (20 s); the busy model falls back to the next one (`model.ts`). Past any limit Kai answers offline. If a model reply fails part-way, the chat asks for the offline answer by itself.
4. **Measured:** in testing, model replies took about 3,000 tokens per call, while the simple questions cost nothing.

## Safety and cost
- **Rate limit:** 20 messages per 10 minutes and 200 a day per address (`limit.ts`), counted in MongoDB `assistant_hits` (deleted after a day), or in memory without a database.
- **Input:** last 20 messages only, user text capped at 2,000 characters, files dropped, tool parts validated against the tools' schemas (`validateUIMessages`).
- **Output:** 900 tokens max, 6 tool steps max. Links in replies render only to this site or https, never as HTML.
- **Privacy:** conversations live in the visitor's `sessionStorage`; the server stores nothing but rate-limit counts. See `/privacy` → "The trade assistant (Kai)".
- **Scope:** the model is told to stay on wholesale footwear and to ignore attempts to change its rules.

## Admin
On `/admin/inquiries/[ref]`, **Draft a reply with Kai** (`reply.ts`) writes a reply from the inquiry, the style details, shipping to the buyer's country and the terms. Prices stay as `[tier price]` placeholders. The draft is editable, opens in the desk's email app or copies, and is recorded in the audit log. Without a model, a template writes it.

## What's next
- **Admin assistant:** the dashboard's assistant (`src/components/admin/ai.ts`, sample data) can call the same skills plus the admin queries (`src/lib/admin/inquiries.ts`). For example, "summarise this week's inquiries" or "which styles are asked for most in Germany".
- **Evals:** a fixed set of buyer questions with expected tools and facts, run against each model before switching `ASSISTANT_MODEL`.
- **Languages:** the model already replies in the buyer's language; the offline engine is English only.
- **Chat logs (opt-in):** if the desk wants transcripts, store them with consent and update `/privacy` first.
