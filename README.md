# ARTICA Wholesale — Next.js storefront

B2B wholesale storefront for winter boots, ported from the static `../wholesale-site/index.html`.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions, SSG for product pages)
- **React 19** (`useActionState`)
- **Tailwind CSS v4** (design tokens in `src/app/globals.css` → `@theme`)
- **GSAP 3** + `@gsap/react` (`useGSAP`, ScrollTrigger, Flip)
- **Zustand 5** (inquiry list persisted to `localStorage`)
- TypeScript, ESLint

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Routes

| Route | What |
| --- | --- |
| `/` | The full homepage from the ARTICA brief (sections listed below) |
| `/catalog?line=men&q=suede` | Filterable, searchable grid (GSAP Flip on filter) |
| `/products/[slug]` | Product detail: gallery, case stepper, specs, related styles (statically generated) |
| `/inquiry` | Full-page inquiry list + buyer form |

## Homepage sections (in order)

Hero (shelf lineup) → The FW26 range → Built for real winters (cold test + Look closer) → Who we supply
→ Order samples first → Order sheet → From order to your door (packing + timeline) → Private label → FW26 line sheet.

Every boot opens the shared **Quick View** (`components/product/QuickView.tsx`, native `<dialog>`,
bottom sheet on phones). Every section leads to the inquiry list or the inquiry drawer.

All sections render from `src/lib/products.ts` (styles, materials, hotspots, case-pack ratios,
detail crops). Detail crops are cut from the same 9 photos with CSS (`cropStyle`), so no extra
image files are needed. Add a style there and it appears everywhere.

## Studio photos (Cloudinary)

The 62 studio style photos (13 kids, 49 women) live on Cloudinary, not in git. Drop new photos into
`Need to Add/<Men|Women|Kids>/` (git-ignored), add a row per photo to `src/lib/catalog-photos.ts`, then run:

```bash
node --env-file=.env.local scripts/upload-cloudinary.mjs   # needs CLOUDINARY_* in .env.local
```

It uploads new files to `chime-long/<line>/`, builds a background-removed, trimmed transparent WebP cutout of each
and records its URL and size in `src/lib/cloudinary-shots.json`.

## Placeholders to replace

Brand name, style names, the Pop line (kids vs women), sizes and case-pack ratios, MOQ and tiers,
materials and specs, lead times (24h / 10d / 45d / 20d), pallet load (30 cases, indicative), partner stats (120+, 68%, 0.4%),
the 12 store photo slots (need real, permissioned partner photos), and the phone, email, hours and social links in `src/lib/company.ts`.

The buyer desk pages (`/buyer-desk`, `/size-guide`, `/order-calendar`, `/container-planner`, `/ship-to`, `/quality`,
`/verify`, `/meet`) all render from `src/lib/buyer-desk.ts`: confirm the size conversions, season shelf dates, container
loads, market rules, quality steps, registration details (empty ones read "Sent on request") and trade shows (empty
until dates are set). `/privacy` and `/terms` are working drafts for the client's lawyer to review.

## Structure

```
src/
  app/            routes, layout, globals.css, actions.ts (submitInquiry server action)
  components/
    home/         Hero, ProductFinder, LineTiles, TechGrid, PartnerProgram, ServiceStrip
    product/      ProductCard, AddButton, CatalogView, ProductGallery, BuyBox, FilterControls
    inquiry/      InquiryDrawer, InquiryForm (InquiryPanel), InquiryLines
  lib/
    products.ts   catalog data + wholesale terms (MOQ 25 cases × 12 pairs)
    catalog-photos.ts  studio-photo styles (names, materials), images from cloudinary-shots.json
    store.ts      Zustand: inquiry lines (persisted) + UI state (drawer, toast)
    gsap.ts       plugin registration + reduced-motion helpers
    tech.ts       performance spec data
public/images/    product photos (.webp)
```

## Seasons (by visitor location)

The site dresses for one of six seasons (spring, summer, rainy, autumn, winter, holiday) from the visitor's country
and today's date:

- `src/proxy.ts` reads the country from the host's IP header (`x-vercel-ip-country` on Vercel, `cf-ipcountry` behind
  Cloudflare), works out the season (`src/lib/season.ts`: climate per country, season per month) and serves `/` from
  the home page built for it (`/season/[season]`, six static pages). Cookies carry the result to the rest of the site.
- A script in the root layout's `<head>` sets `<html data-season>` before first paint; `globals.css` retunes the air
  (frost, sky, ice), the accent and the hero and home colour fields for each season.
- `src/lib/season-products.ts` scores every style per season; the hero, the season's edit, hot products, new arrivals,
  best sellers and the catalog's featured order put the season's styles first. `/catalog?season=summer` shows only them.
- The look: a live 3D world behind every page (`components/season/world/`, three.js, loaded once the page is idle):
  snowy mountains and pines with a frozen lake (winter), blossom hills with birds (spring), a beach and moving sea
  (summer), misty hills, a lake and rain (rainy), golden forests and falling leaves (autumn), a snowy dusk village
  with lights (holiday). Each season is one recipe in `world.ts`. A scroll-driven white veil and solid card wells
  keep words and shoes clear of it. Decorations on every surface tagged `data-deco` (`globals.css`, art in
  `public/images/season/`: snow caps, frost, icicles, drops, blossom, leaves, ribbon, lights).
  Reduced motion or "Season animations" off (top-bar menu) holds everything still.
- Visitors can pick a season in the top bar (or go back to Auto). To test a market: `/?country=BD`, `/?country=AU`;
  to force a season: `/?season=summer`, and `/?season=auto` to clear it.

## Wiring up inquiries

`src/app/actions.ts` validates the form on the server and currently logs the inquiry.
Replace the `console.info` with your email provider, CRM or database call.

Set `NEXT_PUBLIC_SITE_URL` in production so Open Graph image URLs resolve.

## Motion

Section reveals are CSS scroll-driven animations (`animation-timeline: view()`, transform only), so
content is never hidden. Marquees, the orbit ring, hotspot pulses and autoplay stop for reduced motion.
All GSAP code runs inside `useGSAP` (auto cleanup) and is gated by
`prefers-reduced-motion: no-preference`. Add product images to `public/images`
and entries to `src/lib/products.ts` to extend the catalog.
