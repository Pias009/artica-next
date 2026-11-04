# First-visit journey audit

**Date:** 2026-11-04. **Method:** four simulated first-time buyers, each with a goal, a device, a way in and limited patience, were put through the production build in a real browser (Playwright). It ran against a test database, so no real inquiries, visits or emails were created. A page-anatomy scan of the home page and a low-end-phone performance run were done alongside.

**Read the percentages as judgement:** they come from B2B lead-generation benchmarks and what the test buyers met. They were not measured on live traffic. The site's own visitor log (Admin → Visitors) now records the real funnel, so check them against it after 2–4 weeks of traffic.

## What the site is for

It turns a shop owner, distributor or brand who has never heard of Chime Long into a **sent inquiry** (line sheet and tier pricing within 24 hours, or samples). Every page should move a buyer one step closer to that, and earn enough trust to buy from a factory in China they've never met.

## The route a first-time buyer takes today

```
 Google / LinkedIn / Facebook
        │
        ▼
 Home (25 screens on desktop, 37 on a phone; 21 sections)
   ├─ screen 1: "Autumn footwear, ready for the cold snap" ─ [Get wholesale pricing] → empty inquiry form
   │                                                       └ [Browse the range] → catalog
   ├─ screens 2–7: season edit · styles buyers reorder · new arrivals · campaign · range by line
   ├─ screens 8–15: up close · lookbook · buyer programs · samples · order sheet
   ├─ screens 15–20: when to order · business planner · packing · global reach · order journey
   └─ screens 20–23: buyer desk (verify us) · private label · line sheet
        │
        ▼
 Product page (MOQ, case pack, sizes, colours, cases: clear) → Add to inquiry
        │
        ▼
 Inquiry drawer: buyer type, company, ship to, email, notes → "Inquiry received", reference, next steps
```

**What works well:**
- The first screen states the offer, minimum order and two clear actions.
- Product pages answer MOQ, case pack, sizes and colours at a glance.
- The inquiry form is short (2 required fields) and took **~40 seconds** from adding a style to "Inquiry received".
- Kai answered "can I start small?" well.
- The private-label page leads with its call to action.

## Where buyers drop out

**Estimated share of first-time visitors who reach each part of the home page** (from typical scroll-depth curves):

| Home page part | Screen (desktop / phone) | Reach |
|---|---|---|
| Hero, season edit | 1–2 / 1–2 | 100% → ~70% |
| Styles buyers reorder, new arrivals | 2–6 / 3–6 | ~55% |
| Range by line, up close, lookbook | 7–11 / 7–11 | ~30% |
| Buyer programs, samples, order sheet | 11–15 / 12–19 | ~20% |
| When to order, **business planner** | 15–17 / 19–23 | ~12% |
| Packing, reach, journey, **buyer desk (verify us)**, private label, **line sheet** | 17–23 / 23–34 | **under 10%** |

**The inquiry funnel today (estimates):**

| Step | Of 100 first-time visitors |
|---|---|
| See the first screen | 100 |
| Look at styles (scroll or catalog) | ~55 |
| Open a style or quick view | ~30 |
| Add a style or open the inquiry form | ~6–8 |
| **Send an inquiry** | **~1.5–2.5** |

So roughly **1 in 50** first-time visitors sends an inquiry, which is typical for B2B wholesale. With the fixes below, **3–4 in 100** is a realistic target.

## The four buyers

| Buyer | Way in | What happened | Chance of an inquiry |
|---|---|---|---|
| **Ingrid**, boutique in Germany, first import, desktop | Google: "wholesale winter boots supplier" → home | Strong first screen. "Get wholesale pricing" opens an **empty form**: no styles, no price, so it reads as "give us your email first". The form says **Ship to: United States** although the site knows she's in Germany. The hero sells **autumn, "in production now"**, but our own planner says autumn stock ordered today reaches Germany in February. The "styles buyers reorder" deck shows numbers and badges but **no style names** until she clicks. | **Medium (~25%)** if she gets past the empty form; she'd want samples |
| **Rahim**, new shop in Bangladesh, low-end Android on slow 4G | Facebook → home | The page took **8.2 s** to load, the main image **6.1 s**. The phone was frozen for **3.5 s** on load and **7.2 s** while scrolling. Three floating buttons (season preview, Kai, inquiry) cover content. He asked Kai "price per pair? I want 100 pairs only". Kai answered with cartons and pallets instead of explaining that prices come by quote and that **samples** are the way to start small. His next question got a good answer. | **Low (~5%)**: 300 pairs per style is a big first step; he needs the samples path and the planner, which sit 20+ screens down |
| **Daniel**, distributor in the USA, desktop | LinkedIn → /catalog?line=men | **Men's range: only 2 styles** (women 51, kids 14). For a distributor buying a men's assortment, the site looks like it barely sells men's shoes. The inquiry flow itself was fast and clear. | **Low for men's (~5%)**, medium for women's or kids |
| **Sofia**, private-label brand in the UK, phone | Google: "private label boots manufacturer" → /private-label | The page answers MOQ, branding, lead time, samples and the steps, and its call to action is in the first view. Once she scrolls, the only action left is the floating "Inquiry 0" pill. No cost guidance at all, not even "from $x per pair at 600 pairs". | **Medium-high (~35%)** |

## Issues, by how much they cost inquiries

| # | Issue | Evidence | Fix | Effort |
|---|---|---|---|---|
| 1 | **The home page sells the season the buyer is in, not the one they can still catch.** | DE visitor sees "Autumn edit · in production now"; autumn ordered today lands in February | Lead the hero and the season edit with the **season they can order for now** (`timingFor().now`), e.g. "Order now for spring: in your shop by 15 Feb". Keep the current season as inspiration further down | M |
| 2 | **Men's line has 2 styles.** | /catalog?line=men: 2 styles | Add the men's studio photos the way women's and kids' were added (`catalog-photos.ts`); until then, take "Men" out of the main nav or label it "coming FW27" | M (needs photos) |
| 3 | **Trust is at screen 20+.** | Buyer desk / verify is under 10% reach. Contact is a US toll-free number and an @articafootwear.com email for a Guangzhou company (placeholders) | A trust strip in the first 2 screens: registered company, factory video tour, inspection report, export markets. Real contact details in company.ts | S–M |
| 4 | **"Get wholesale pricing" opens an empty form.** | Drawer: "No styles yet…" | Make it a 3-way choice: *Line sheet* (email only), *Samples* (pick up to 3 styles), *Quote* (from your list). Or prefill the season's top 3 styles | S |
| 5 | **Ship to defaults to United States.** | DE visitor: "United States" preselected | Preselect from the `cl-country` cookie (already set by the proxy) | XS |
| 6 | **Home page is too long:** 25 screens on desktop, 37 on a phone. | Anatomy scan | Cut to ~10–12 sections. Merge the three photo banners into one; move packing, reach, journey and buyer desk into one "How ordering works" band; pull samples, the planner and trust up to screens 3–6 | M |
| 7 | **Slow and janky on low-end phones.** | LCP 6.1 s, 3.5 s blocked on load, 7.2 s while scrolling, CLS 0.21 | Fewer GSAP/scroll effects on mobile, lighter hero (one image, no orbit), lazy sections, reserve image space (CLS) | M |
| 8 | **Kai doesn't steer price questions to samples.** | "price per pair? 100 pairs" → logistics answer | Offline rule: price or small-quantity questions → "prices come by quote within 24 h; to start small, order samples (10 days)", with a samples card and the planner link | XS |
| 9 | **Three floating buttons on phones** cover text. | Screenshots | Hide "Preview seasons" in production (`NEXT_PUBLIC_SEASON_PREVIEW=off`); merge Kai and Inquiry into one floating bar | XS |
| 10 | **Style names hidden in "the styles buyers reorder".** | Deck shows 01–06 and badges only | Show name, type and MOQ on each card in the deck | S |
| 11 | No price signal anywhere | Private label, product pages | Give a range or anchor ("tier pricing from 1,000 pairs; typical FOB $12–18"), if the business agrees | Decision |

## The route we want

```
 Screen 1  Hero: the season you can order NOW for your market, its order-by date, [See the styles] [Order samples]
 Screen 2  Trust strip: registered in Guangzhou · video factory tour · inspection reports · 40+ markets
 Screen 3  The styles to order now (names, MOQ, add buttons), with a men · women · kids switch
 Screen 4  Three ways to start: Samples (10 days) · Line sheet · Quote (with the business planner link)
 Screen 5  How ordering works: samples → 30% deposit → 45 days → ship, with dates for their country
 Screen 6  Proof: up close, quality checks, buyer programs
 Screen 7  Private label teaser · line sheet sign-up
```

Every screen has one next step that leads to samples or an inquiry. Trust and timing come before the long product story.

## Next

1. Quick fixes (#5, #8, #9, #10): about half a day.
2. Season-you-can-catch hero, trust strip and three-way start (#1, #3, #4): 1–2 days.
3. Shorter home page and mobile performance (#6, #7): 2–3 days.
4. Men's range (#2): needs photos and product data.
5. After two to four weeks of traffic, compare these estimates with Admin → Visitors (funnel, exit pages, searches with no results), then adjust.
