# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Wholesale buyers worldwide: independent footwear and outdoor retailers, regional chains, distributors, and private-label brands. They are sourcing winter boots for an upcoming season, usually comparing several factories, and need to judge quality, minimums, lead times and shipping terms quickly before requesting a line sheet or samples.

The site is commissioned by the manufacturer (the client), who reviews and approves the design. Two earlier designs were rejected by this client.

## Product Purpose
A wholesale storefront for ARTICA winter boots (men, women, kids). Its only goal is to turn visits into wholesale inquiries and line-sheet requests. There is no single-pair retail sale, no cart checkout and no public pricing.

Success: a buyer understands the range and the wholesale terms within a minute, builds an inquiry list of styles with case quantities, and sends it.

## Positioning
Factory-direct winter boots for retail shelves: every style is offered in mixed-size cases of 12 pairs from 300 pairs per style, with samples before bulk, inspected batches, and door-to-door delivery worldwide. Private label is available from a higher minimum.

## Operating Context
- Buyers build an "inquiry list" (styles plus number of cases, steps of 5 cases, minimum 25 cases) and submit one form: buyer type (retailer, distributor, private-label brand), company, ship-to country, work email, notes.
- Every boot opens a shared Quick View with views, materials, case-pack size ratio, and inquiry actions.
- Supporting pages: catalog with filters, product pages, private label, shipping, about, FAQ, contact.

## Capabilities and Constraints
- Stack: Next.js 16 (App Router), React 19, Tailwind CSS v4, GSAP 3 with @gsap/react, Zustand. Light theme only.
- Product data lives in `src/lib/products.ts`; every section renders from it.
- Wholesale terms (client placeholders until confirmed): MOQ 300 pairs (25 cases) per style, 12 pairs per case, samples in 10 days, bulk 45 days, delivery 20 days, private label from 600 pairs, tier pricing from 1,000 pairs, indicative pallet load of 30 cases (360 pairs).
- Language: English only for now. A Chinese version may come later with proper translation.
- No prices, star ratings, cart, checkout or "Buy now" anywhere.

## Brand Commitments
- Name: ARTICA (taken from the zip pull; client to confirm). Mountain line-mark logo in `src/components/Logo.tsx`.
- Visual reference chosen by the user: Quince (onequince.com), clean and fresh. Generous white space, calm typography, large product imagery, minimal borders. Plus a few distinctive animated sections.
- Product imagery: use only the 9 supplied boot cutouts in `public/images/` and crops cut from them. Never generate or add photos of other shoes, people or stores.

## Evidence on Hand
- 9 transparent WebP cutouts of 5 styles (Nord, Tundra, Mira, Mira Tall, Pop) in `public/images/`.
- Style names, specs, size runs, case ratios, partner stats (120+ retail partners, 68% reorder rate, 0.4% defect rate) and lead times are client placeholders listed in README.md.
- Not confirmed and not to be used on the homepage: SATRA TM144, ISO 9001, BSCI/SMETA audits, LWG Gold tanneries, Vibram®, YKK Aquaguard®, REACH. These currently appear on the About / Private label / Shipping pages and need client confirmation.
- No real store photos, testimonials, customer names or press. Do not invent them.

## Product Principles
1. Every screen leads to an inquiry: add a style, open its details, or open the inquiry form.
2. Wholesale facts beat adjectives: MOQ, case pack, size run and lead time are always one glance away.
3. The boots carry the page; copy stays short.
4. Only claim what the client can back up.

## Accessibility & Inclusion
WCAG 2.1 AA contrast, visible focus states, keyboard access to every product and control, and reduced-motion users get static layouts with no autoplay or marquees.
