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
  app/            root layout, (site)/ public pages, admin/ the admin panel, api/cron, actions.ts (inquiry actions)
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

Design: `docs/design/inquiry-lead-pipeline.md`. Code: `src/app/actions.ts` (the two server actions) and `src/lib/leads/`.

Every inquiry is **stored first, then emailed**:
1. `submitInquiry` validates the form and stores the inquiry, a snapshot of each line, and two queued emails as one
   MongoDB document (`leads/inquiries.ts`), so they are saved together or not at all. A repeat of the same submit (double click, retry) returns the first one's
   reference instead of storing it twice.
2. Right after the response, `after()` sends the queued emails through Resend (`leads/outbox.ts`): the desk email
   (reply goes to the buyer, with one-click "mark replied / quoted / won / lost / spam" links) and the buyer's
   confirmation with their reference (`CL-2026-0142`). Failures back off (1, 2, 4 … 60 min) and retry.
3. `/api/cron/daily` (`vercel.json`, 08:30 Guangzhou) sends anything still waiting, emails the desk a digest of
   inquiries over 20 hours without a reply and of stuck emails, and deletes spam marked over 30 days ago.

It degrades in steps, so the site works at every stage of setup:

| Set | What happens |
|---|---|
| nothing | inquiries are logged on the server; the buyer sees a demo notice |
| `RESEND_API_KEY`, `INQUIRY_TO`, `INQUIRY_FROM` | inquiries are emailed to the desk (no storage, no reference) |
| + `MONGODB_URI` (and optionally `MONGODB_DB`, default `chimelong`) | stored first, buyer gets a reference and a confirmation email, retries. If the database is down the inquiry still goes straight to the desk |
| + `DESK_SECRET` (32+ random chars) | the desk email gets its status links (`/desk/l/[ref]`) |
| + `CRON_SECRET` | Vercel can call the cron routes (they refuse everyone without it) |
| + `RESEND_SEGMENT_ID` | line-sheet signups join that Resend segment (unsubscribe handled by Resend) instead of being emailed to the desk |

Setup:

```bash
vercel link
vercel env add MONGODB_URI           # Atlas connection string (Cluster0 → Connect → Drivers)
vercel env add DESK_SECRET           # openssl rand -base64 32
vercel env add CRON_SECRET           # openssl rand -base64 32
vercel env pull .env.local
npm run db:migrate                   # collections, validator and indexes; safe to run again
```

Notes:
- Atlas only accepts connections from IPs on its Network Access list. Vercel functions don't have fixed IPs, so
  production needs `0.0.0.0/0` there (the database user's password is then the guard), or Vercel's Atlas integration.
- Preview deployments should use their own database (`MONGODB_DB=chimelong_preview`) and a test `INQUIRY_TO`.
- Free Resend sends 100 emails a day. Each inquiry is two, so a busy campaign day can hit it: emails then wait in the
  queue and go out as the limit allows (nothing is lost), but upgrade before a launch.
- On a Pro plan, also schedule `/api/cron/outbox` every 10 minutes in `vercel.json` for faster retries. Hobby allows
  daily crons only, so there retries happen on the daily run and whenever a new inquiry comes in.
- `npm test` runs the desk-link signing and admin cryptography tests.

Set `NEXT_PUBLIC_SITE_URL` in production so Open Graph image URLs resolve.

## Kai, the trade assistant

A chat assistant on every page (button bottom-right, a one-time invitation after 15 seconds) and at `/assistant`.
It recommends styles by country and season, says what's selling, answers MOQ, samples, payment, shipping, privacy
and how-to-order questions, and prepares inquiries the buyer sends with one click. In the admin it drafts replies to
inquiries. Design: `docs/design/assistant.md`.

- **With an AI model:** set `GOOGLE_GENERATIVE_AI_API_KEY` (Google AI Studio). Kai uses Gemini
  (`gemini-3.5-flash`, falling back to `gemini-3.5-flash-lite` when it's busy; change with `ASSISTANT_GEMINI_MODELS`).
  Or set `AI_GATEWAY_API_KEY` to use any model through the Vercel AI Gateway (`ASSISTANT_MODEL`).
- **Token use:** most messages (greetings, terms, shipping, quantities, product and season questions) are answered
  by the offline engine for free; only open, multi-part, follow-up or non-English questions reach the model, which
  gets compact tool results, the last 8 messages and minimal thinking. Caps per minute/day (`ASSISTANT_RPM`,
  `ASSISTANT_RPD`, `ASSISTANT_TPD`, defaults 10 / 1000 / 2,000,000) and pauses after a provider limit keep it under
  quota: past them Kai answers offline, never with an error. Today's use: `assistant_usage` in the database.
- **Without one:** Kai answers with its offline engine from the same data (English only, no free conversation).
- Facts come from the site's own data (products, seasons, `src/lib/faq.ts`, `buyer-desk.ts`), so editing those
  updates Kai. Behaviour rules live in `src/lib/assistant/persona.ts`.

## Admin panel (`/admin`)

| Route | What |
|---|---|
| `/admin` | Dashboard (`src/components/admin/AdminPanel`), full-screen |
| `/admin/inquiries` | Every inquiry from the database: filter by status, request and text, flags for over 20 hours and failing emails |
| `/admin/inquiries/[ref]` | One inquiry: lines, note, buyer, emails (with "Send now"), status buttons, history |
| `/admin/security` | Your sessions (sign out any of them) and the audit log of every sign-in and change |
| `/admin/login` | Email, password and a 6-digit authenticator code |

**Accounts are made from the command line only** (there is no sign-up page). Each prints a generated password and an
authenticator key once:

```bash
npm run db:migrate                                   # once: admin collections and indexes
npm run admin -- create you@company.com "Your Name"  # add the key to 1Password / Google Authenticator / Authy
npm run admin -- reset you@company.com               # lost phone or password: new ones, all sessions ended
npm run admin -- disable you@company.com             # blocks sign-in, ends sessions (enable undoes it)
npm run admin -- list
npm run admin -- sign-out-all
```

Needs `MONGODB_URI` and `ADMIN_ENC_KEY` (`openssl rand -base64 32`; already in `.env.local`). Set the **same**
`ADMIN_ENC_KEY` in Vercel: authenticator keys are sealed with it, so a different key locks everyone out until `reset`.
Without either, `/admin/login` says the panel isn't set up and no one can sign in.

**Skip sign-in (dev):** the sign-in page shows a "Skip sign-in (dev)" button on `npm run dev` at `localhost`, and
on **Vercel preview** links (which sit behind Vercel's own login, so keep Deployment Protection on). It opens the
panel without an account or a database: the dashboard shows sample data, and the inquiry pages ask for `MONGODB_URI`.
An orange "sign-in skipped" badge shows, and Sign out ends it. The button never appears on production (the live
site), and a skip cookie is ignored there; `tests/admin-bypass.test.mjs` checks this.

How it's protected (`src/lib/admin/auth.ts`, `src/proxy.ts`):
- **Three factors:** a password (scrypt, N=2^15), a TOTP code, and the email. A code works once, so a code
  someone sees can't be replayed. Authenticator keys are AES-256-GCM sealed at rest.
- **Sessions:** a random token in a `__Host-` cookie (HttpOnly, Secure, SameSite=Strict). The database keeps only its
  SHA-256. Sessions end after 2 idle hours or 12 hours in all, and can be ended from `/admin/security` or the CLI.
- **Checked twice:** the proxy sends requests without the cookie to sign-in, and every admin page and server action
  checks the session in the database (`requireAdmin()`). Next.js refuses server actions from other origins.
- **Brute force:** 5 wrong tries for an email, or 20 from an IP, within 15 minutes lock sign-in for that window.
  Unknown emails take as long as wrong passwords and get the same message.
- **Headers on `/admin`:** a strict CSP with a fresh nonce per request (no inline or third-party scripts; the season
  theme script is allowed by its SHA-256), `no-store`, `frame-ancestors 'none'` and `X-Frame-Options: DENY`, `noindex`,
  HSTS, `nosniff`, `Referrer-Policy: no-referrer` and a locked-down `Permissions-Policy`.
- **Audit log:** every sign-in (right, wrong or locked), sign-out, status change and email retry, kept for a year.
- **Any new write** in the panel must be a server action that starts with `await requireAdmin()` and calls `audit()`.

## Motion

Section reveals are CSS scroll-driven animations (`animation-timeline: view()`, transform only), so
content is never hidden. Marquees, the orbit ring, hotspot pulses and autoplay stop for reduced motion.
All GSAP code runs inside `useGSAP` (auto cleanup) and is gated by
`prefers-reduced-motion: no-preference`. Add product images to `public/images`
and entries to `src/lib/products.ts` to extend the catalog.
