# Plan: the Business Plan Desk

**Status:** Phases 1–3 built (2026-10-31): `src/lib/planner/` (engine, `tests/planner.test.mjs`), `/business-plan` (`src/components/planner/`), Kai's planning desk (`plan-skills.ts`, `plan-local.ts`, `PlanCards.tsx`) and the home-page section (`BusinessPlanTeaser.tsx`). Not yet: the five-specialist intake conversation with chips, order-by reminder emails, saved plans on the server, admin lead badges, and switching the order calendar to per-market transit.

**Status:** Proposal for review · **Date:** 2026-10-31 · **Related:** [Kai](assistant.md), `/order-calendar`, `/container-planner`

## Why

A buyer who sees summer sandals on the site in June and orders them gets them in September. The season is over, the stock sits until next year or is sold at a loss. Factory-direct buying works, but only if you **buy one or two seasons ahead**, and many buyers (especially new ones) don't know that. Today the site tells them lead times; it doesn't tell them *what to buy now, how much, what it will really cost them, and whether it will make money*.

The Business Plan Desk does that. It is a page (`/business-plan`) with a guided planner, and the same planner inside Kai, so a buyer can ask "I want to sell sandals in Germany, when should I order?" in the chat and get the same answer and numbers.

## The core rule: buy for the season you can still catch

Real lead times from the site's own data (`products.ts`, `buyer-desk.ts`):

| Step | Days |
|---|---|
| Samples (first order only) | 10 + 7 to review |
| Bulk production after confirmation | 45 |
| Sea transit, by market | 5–42 (Japan/Korea 5–10 · North America 14–34 · Germany/EU 30–36 · UK 32–38 · South America 35–42) |
| Customs, unpacking, on the shelf | 7 |
| **Order → on the shelf** | **≈ 2.5 to 3 months** (Europe), **≈ 3.5 to 4 months** for a first order with samples |

For each season in the buyer's own country (from `season.ts`: northern, southern, monsoon, equatorial and arid calendars), the planner works out three dates and a verdict:

- **Sell window:** the season's months in that country (e.g. Germany, summer = June to August).
- **Order-by date:** the start of the sell window, minus production, that market's transit time (the upper end), and shelf prep, minus a 14-day safety margin.
- **Arrival if you order today:** today, plus production, transit and prep.

| Verdict | When | What we tell them |
|---|---|---|
| 🟢 **On time** | Arrives ≥ 14 days before the season starts | "Order by {date}. Stock lands {date}, a full season to sell." |
| 🟡 **Tight** | Arrives in the first third of the season | "You'll miss the first weeks. Order a smaller quantity, core styles only." |
| 🔴 **Too late, skip it** | Arrives after the first third | "This season is over before the goods arrive. Plan {next season} instead." |

**Example (today, 31 October, Germany):**
- Winter (Dec–Feb): stock would arrive ≈ 27 Jan → 🔴 too late.
- Spring (Mar–May): arrives before 1 March → 🟢. **The season to buy now is spring.**
- Summer: order by ≈ 19 February (1 June − 88 days − 14-day margin).

The planner says this up front: "**Buy spring styles now; order summer by about 19 February.**"

This also fixes the issue in the existing order calendar, which assumes a flat 20-day transit for every market. The planner uses each market's real transit, and the order calendar should switch to the same shared function.

## Who it's for: three levels

The planner asks one question first ("Where are you in your business?") and changes its defaults, explanations and suggestions:

| | **New** (starting out) | **Growing** (shop or online store running) | **Pro** (distributor, chain, private label) |
|---|---|---|---|
| Guidance | Plain-language steps, glossary inline (FOB, DDP, MOQ, landed cost, sell-through, markdown) | Short explanations, focus on margin and timing | Numbers first, no hand-holding |
| Suggested first order | 2–3 proven styles (Top reorder / Trending), 1 colour each, at MOQ (300 pairs each) | 4–8 styles, a core + seasonal mix | Full assortment, container-optimised, private label from 600 pairs |
| Budget split (suggestion) | 80% proven core, 20% seasonal | 60% core, 30% seasonal, 10% test | 50% core, 30% seasonal, 20% test / exclusives |
| Risk advice | Order samples first; one season at a time; keep cash for the 70% balance | Hold back budget for an early reorder; stagger orders | Two seasons in flight; LCL for tests, FCL for core |

## The conversation: your own advisory team

The planner's main way in is a conversation with Kai. It feels like briefing a small consultancy: a few questions, then a plan presented by five specialists, each showing their part with real products and numbers. The page's tools (below) are the same plan in full detail, for those who prefer forms.

### 1. Getting to know the buyer (intake)

One question at a time, with tap-to-answer chips, an "other" free-text option, and "skip" on everything:

| # | Question | Chips (examples) | Used by |
|---|---|---|---|
| 1 | Where are you in your business? | Starting out · Shop/online store running · Distributor / chain / own brand | everyone (level) |
| 2 | Where do you sell? | Country (prefilled from the visitor's location) · city optional | timing, logistics, marketing |
| 3 | How do you sell? | Shop · Mall/department store · Online · Market stall · Wholesale to shops | marketing, assortment |
| 4 | Who are your customers? | Women · Men · Kids · Family · and: budget / mid / premium | buyer, marketing |
| 5 | What do you want to stock? | Boots · Sneakers · Sandals · Formal · "Show me what sells" | buyer |
| 6 | Budget for this order? | <$5k · $5–15k · $15–50k · $50k+ · or pairs | finance, buyer |
| 7 | When do you want it on the shelf? | "As soon as possible" · a season · a date | timing |
| 8 | Have you imported before? | Never · A few times · Regularly | logistics (DDP vs FOB), risk |
| 9 *(optional)* | Your local retail price for similar shoes? | number | finance (margin), marketing (price ladder) |
| 10 *(optional, pro)* | Your own brand on the shoes? | Yes · Maybe later · No | private label |

Answers fill the same **buyer profile** the page uses. It's kept in the visitor's browser, and nothing is sent to us until they choose to send the plan.

### 2. "Your team is on it"

A short animated moment (~2 s) shows the five specialists working, then their cards arrive one by one. Every number comes from the planner skills, at zero AI tokens. The AI model only writes the connecting sentences, and only when it's available.

| Specialist | Presents | Shows |
|---|---|---|
| **Buyer** (merchandising) | What to buy now and why: the catchable season, 3–6 styles that fit the customers and season, colours, the size breakdown per case for their market | Product cards (add to plan) · tier and MOQ progress |
| **Finance** | Landed cost per pair, suggested retail price, margin, break-even sell-through, the payment schedule (30% now, 70% at shipping), peak cash needed, payback month | Numbers card + cash-flow mini chart · "stress test": what if only 50% sells, or it lands 3 weeks late |
| **Marketing** | Price ladder (entry / core / premium style), a launch calendar timed to arrival (teaser 2 weeks before, launch, mid-season push, markdown date), the selling points of each chosen style from our product data, local demand moments | Ready-to-use copy for each style · campaign photos · "download marketing kit" |
| **Logistics** | DDP or FOB for them (DDP for first-time importers), shipping vs container (LCL / 20ft), transit time, the papers, the market's import rules as a checklist | Timeline card with dates · compliance checklist |
| **Risk & next steps** | Season risk verdict, markdown risk, "order samples first" for new buyers, how to verify us, the reorder point for this plan | Action buttons: **Order samples** · **Send plan to the trade desk** · **Open full plan** · **Save / email me this plan** |

### 3. Refine, then act

- **What-ifs in the chat:** "What if I double the budget?", "only kids' styles", "make it for spring". The plan recalculates instantly, and the specialists' cards update. These answers are deterministic and use no tokens.
- **Questions to any specialist:** "Finance, why is my cash need so high?" goes to the model with the plan as compact context.
- **Act:** send the plan as an inquiry (the desk gets the profile, chosen styles, quantities, target shelf date and margin goal), book a sample box, or get the plan by email.

## More that helps buyers, by value

| Idea | Why it helps | Data | Effort |
|---|---|---|---|
| **Starter kits** (pre-built assortments per level × season, e.g. "First winter, 3 styles, 900 pairs") | A beginner can say yes to one ready plan instead of 67 choices | catalog + season scores + Top reorder | S |
| **Order-by reminders** by email ("Your summer order-by date is in 14 days") | The single biggest risk is missing the window; this brings buyers back on time | timing skill + Resend (opt-in) | S |
| **Sample box builder** (one pair each, with the date to order samples by) | First orders start with samples; makes it one tap | catalog + timing | S |
| **Demand calendar** per market: Black Friday, Christmas, back-to-school, Eid, Lunar New Year, Diwali, rainy season | Moves the target shelf date to when people actually buy | curated table, labelled; dates checked yearly | M |
| **Marketing kit download** (product cut-outs, descriptions, short social captions per chosen style) | Small shops have no designer; gets their launch done | Cloudinary photos + product copy (+ AI for captions) | M |
| **Reorder coach**: after arrival, enter weekly sales and Kai says when to reorder | With ~2.5 months to restock, reorder timing makes or breaks the season | saved plan + timing | M |
| **Container top-up** ("8 more cases fills your 20ft and cuts freight per pair by X%") | Cheaper freight per pair, easy upsell | `load()` | S |
| **Bank / partner-ready summary** (PDF + spreadsheet: plan, costs, cash flow) | Many buyers need financing or a partner's sign-off | planner | S |
| **Size curve by market** (EU vs US vs Asian sizing, custom curves from 1,000 pairs) | Fewer leftover sizes | `SIZE_CHART`, `CASE_PACK` | S |
| **Private label calculator** (pro: 600 pairs, branding, extra lead time) | Higher-margin path for growing buyers | terms + timing | S |
| **Glossary and short guides** (How importing shoes works, FOB vs DDP, landed cost) | Beginners trust what they understand | content | M |
| **Share the plan** with a partner by link | Buying decisions are rarely made alone | URL state | S |

Left out on purpose: live currency rates, duty rate lookups and sales forecasts from market data. They need paid data we don't have, and wrong numbers would cost buyers money. The buyer enters these figures, and we label them clearly.

## What the business learns (with the buyer's consent)

When a buyer sends a plan, the inquiry arrives with their profile: stage, market, channel, customers, budget band, target season, imported before or not, private-label interest. That gives the trade desk:
- **Lead priority:** e.g. a pro with a $50k+ budget and a catchable season goes first, and a beginner gets the samples-first reply. Shown as a badge in `/admin/inquiries`.
- **A better first reply:** Kai's reply drafter uses the profile ("as a first-time importer, we suggest DDP…").
- **Demand insight** (admin dashboard): which markets and seasons are being planned, budget bands, and the most-planned styles, *before* orders arrive. Useful for the factory's own production planning.

Nothing is stored for buyers who don't send anything. The privacy page gets a line about the planner.

## What the page does: six tools on one plan

All inputs live in one **plan**: country, level, budget or quantity, the styles chosen, currency and prices. Each tool reads and updates it, and the plan is kept in the browser and in the page address, so it can be shared.

1. **Season timing.** The table above, for the buyer's country, as a visual timeline of the next 12 months: sell windows, order-by dates, today's line, verdicts. It recommends the season to buy now and lists the in-season styles for it (from `season-products.ts`).
2. **Assortment and quantity.** It turns a budget into styles × cases (MOQ 25 cases of 12 per style and colour, steps of 5), or styles into a budget. It shows the size breakdown per case (`CASE_PACK`), tier progress (300 MOQ · 600 private label · 1,000 tier pricing), and how full the container is (`load()`: LCL under 100 cases, 20ft / 40ft / 40HC). Its suggestions follow the level.
3. **Landed cost.** From the buyer's FOB price per pair (the site has no prices, so they enter the quoted one, or a placeholder until the desk quotes):
   - goods = FOB × pairs
   - freight = per CBM for LCL or per container for FCL (they enter the forwarder's rate; defaults are clearly marked estimates)
   - insurance ≈ 0.5% of goods (editable)
   - duty = duty % × customs value (they enter their rate; we don't publish duty rates, which vary by product and country)
   - import VAT / GST shown separately, as recoverable for registered businesses
   - inspection, bank and transfer fees
   - → **landed cost per pair**, and the share of each part
4. **Price and margin:**
   - retail price = landed ÷ (1 − target margin)
   - or a wholesale price, for distributors who resell
   - margin, markup, **break-even sell-through** = total cost ÷ (pairs × price)
   - **Scenarios** at 60%, 80% and 100% sell-through, with the rest sold at a markdown (default 50% off): revenue, profit, ROI
5. **Cash flow** over the timeline:
   - Outflows: 30% deposit on order, 70% balance + freight at shipping (day ≈ 45), duty and VAT at arrival.
   - Inflows: sales spread over the sell window.
   - Results: **peak cash needed**, the payback date, and a month-by-month chart. Reorders appear as a second wave.
6. **Plan summary:**
   - One page: season, styles, quantities, dates, landed cost, margin, cash need, risks.
   - Print or save as PDF.
   - **Send this plan to the trade desk** creates an inquiry with the styles and quantities as lines, and the plan as the note. It's the same pipeline as every inquiry, so the desk sees it in `/admin` and Kai can draft the reply.

## Advice the planner gives: rules, shown when they apply

- **Season after next:** if the season they're looking at is 🔴, say so first and point to the one they can catch.
- **Samples:** before a first order, order samples ≥ 4 months before the sell window; that's what pushes the timeline to 3.5–4 months.
- **Reorder point:** with ~2.5 months to restock, the reorder decision comes early. If a style sells over ~40% in the first 3–4 weeks, reorder then, or it lands after the season. (A rule of thumb, labelled as one.)
- **Keep cash for the balance:** the 70% is due at shipping, before any sales. Warn if the plan's cash need is more than the budget entered.
- **Fill the container:**
  - Near a step (e.g. 92 cases in LCL), show what adding 8 cases does to freight per pair.
  - Near a full 20ft, suggest topping up with core styles.
- **Don't over-split colours:** each colour is its own 300-pair minimum; new buyers should pick one or two.
- **Markets:** the import rules for their market from `MARKETS` (REACH, CPSIA, labelling) as a checklist, plus "confirm with your customs broker".
- **Private label:** from 600 pairs; adds time for logo approval; show it only for Pro, or when asked.
- **Never:** guaranteed profit, invented duty rates or prices, or financial or legal advice. Every estimate is labelled, and the desk confirms prices.

## Kai, the same brain

New skills in `src/lib/planner/`, pure functions with no I/O, shared by the page, Kai's tools and the offline engine, and unit-tested with `node --test`:

| Skill | Gives |
|---|---|
| `seasonTiming({ country, today, firstOrder })` | Every season's sell window, order-by date, arrival-if-ordered-today and verdict; the season to buy now |
| `assortment({ level, budget? \| pairs?, styles? })` | Styles × cases, size breakdown, tier, container fill, suggestions |
| `landedCost({ fob, pairs, freight, dutyPct, … })` | Per-pair landed cost and breakdown |
| `margins({ landed, price \| targetMargin, sellThrough[] })` | Margin, break-even, scenarios |
| `cashflow({ plan })` | Monthly cash in/out, peak need, payback |
| `planSummary(plan)` | The text for the summary and the inquiry note |

- **Kai's tools:** `planSeason`, `estimateLanding` and `planCashflow`. These have compact `toModelOutput`, like the existing tools, to save tokens.
- **Offline engine:** answers "when should I order for summer?", "what will 600 pairs cost me landed?" and "is it too late for winter?" without the model.
- **On `/business-plan`:** Kai's panel opens in **advisor mode** with the plan as context. It explains the numbers in the buyer's language and fills the planner from the chat ("set it to 900 pairs").
- **Proactive help:** when someone looks at a style that's out of season for them, Kai's nudge can say "Sandals for Germany arrive too late for this summer; spring styles are the ones to order now."

## The page

`/business-plan` (public, in the site's chrome, linked from the header's Buyer desk menu, the order calendar, Kai's starters and the off-topic options):

1. **Header:** "Plan your next season" and the three level cards.
2. **Step bar:** Timing → Styles & quantity → Costs → Margin → Cash → Summary. Each step works on its own, so pros can jump straight to costs.
3. **A sticky summary rail on desktop** (bottom sheet on phones): season, order-by date, pairs, landed cost/pair, margin, cash need. It updates live.
4. **Kai beside it on desktop**, or as a button on phones.
5. **Design:** the site's glass style, the season theme, charts for the timeline and cash flow (accessible: data tables behind them), and 16px inputs with visible labels.

## What we need from you

1. **Lead times:** confirm 45 days of production and the per-market transit times in `buyer-desk.ts` (the "2 months" you mentioned is order → ship; to the shelf it is 2.5–3 months for Europe).
2. **Prices:** keep FOB prices out of the site (buyer enters the quoted price), or show indicative ranges per category or tier?
3. **Currency:** USD only, or let the buyer choose (no live exchange rates in v1)?
4. **Default estimates:** OK to prefill freight per CBM and markdown % as clearly-labelled editable estimates? (No duty rates; the buyer enters theirs.)
5. **Name:** "Business Plan Desk", "Season Planner", or "Plan your order"?

## Build order

| Phase | Scope | Size |
|---|---|---|
| **1. The engine** | `src/lib/planner` (timing, assortment, landed cost, margins, cash flow) with tests · order calendar switched to per-market transit | ~1.5 days |
| **2. The conversation** | Intake with chips · the five specialist cards in the chat · what-ifs · "send plan to the trade desk" with the profile · Kai tools + offline answers | ~2 days |
| **3. The page** | `/business-plan` with the six tools, summary rail, print/PDF · starter kits · sample box builder · container top-up | ~2 days |
| **4. Coming back** | Order-by reminder emails (opt-in) · saved/shared plans · reorder coach · marketing kit · demand calendar · admin lead badges and demand insight | ~3 days |
