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
