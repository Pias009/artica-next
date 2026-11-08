# The admin panel: data and edits

**Status:** Built (2026-11-03) · **Code:** `src/components/admin/`, `src/lib/admin/panel.ts`, `src/app/admin/content-actions.ts`, `src/lib/content/`, `src/lib/analytics/`

`/admin` is the dashboard, and each section has its own address (`/admin/products`, `/admin/settings`…). All of them need a signed-in admin (email and password). On load, `panelData()` (`src/lib/admin/panel.ts`) reads everything the views show, and views publish edits through server actions. Every action checks the admin again, validates each field with zod, writes the audit log, then expires the cache so the site shows the change on the next page load.

## What each view reads and changes

| View | Reads | Changes, and where the site shows it |
|---|---|---|
| Overview | Inquiries (week, months, stages, reply times, markets), visitor log, top style | Site controls: season effects and the campaign banner, for every visitor |
| Visitors | Visitor log (last 7 days; live = last 5 min); refreshes every 30 s | Nothing |
| AI agent | Kai's usage today, audit log | Trade desk on/off, planning desk on/off, AI model on/off (`/api/assistant`, launcher, tabs) |
| Pages | Site pages, views per page, and each page's intro and section headings, read from the pages themselves (`page-blocks.ts`) | Published (unpublished pages are 404 through `proxy.ts` and leave the sitemap); search title and description (`editableMeta`); on every page: the intro's title and line and each section's headline and line (`PageIntro`/`Copy`, `SectionHead`), and sections shown or hidden; on the home page also the order of its sections (`HomePage`) |
| Products | Catalogue as built and styles added here, inquiries per style (90 days) | A full-width list filtered by line, category, status and text, with a full page per style (`/admin/products/<id>`). Every field a page shows: name, type, line, category, photos, backdrop, colour, materials, sizes, description, spec, rating, tags, badge, seasons, live, featured. New styles (`/admin/products/new`), with suggestions from the catalogue (`product-draft.ts`) and uploads to Cloudinary (`cloudinary.ts`). Everything that reads `products` sees these |
| Inquiries | Latest 150 inquiries (no spam) | Stage (saved at once); reply drafts with Kai; replies go out from the desk's own email |
| Seasons | Season rules, campaigns | Season by location or one season for everyone (`proxy.ts`); each campaign's banner on/off |
| Settings | Contact details, alerts, voice | Email, phone and hours (footer, contact, FAQ, Kai); new-inquiry email, overdue digest, Monday summary (`/api/cron/daily`); Kai's voice. Trade terms and transit times are shown read-only: they drive calculations and change in code |

## How edits reach the site

- All edits are stored in one MongoDB document: `site_content`, `_id: "site"`. Only differences from the built site are stored, and an empty document means the site as built.
- Pages read it through `getContent()`, which is cached under the tag `site-content`. `loadContent()` applies it before rendering:
  - The catalogue (`applyProductEdits` in `products.ts`) and contact details (`applyContact` in `company.ts`) are changed in place.
  - Each module copy registers through `onLive()` in `content/live.ts`. Server components and server-rendered client components use separate module copies, and this keeps both in step.
- The root layout prints the public part of the edits into `<script id="cl-content" type="application/json">`. The browser applies the same edits from it, so hydration matches.
- `proxy.ts` reads unpublished pages and the season rule from `content/routing.ts`, which is cached in memory for 30 seconds.
- A built-in style's edits are stored as differences in `products`. A style added in the panel is stored whole in `added`, and its live, featured and season choices go in `products` like any other. Nothing is printed for a hidden new style until it goes live. Built-in styles can be hidden but not deleted; added ones can be deleted.
- Anything computed from the catalogue has to be worked out when it's used, not on import: on the server, the edits are only applied after the modules have loaded.
- Saving calls `updateTag("site-content")` and `revalidatePath("/", "layout")`. Static pages also refresh every 5 minutes.

## Visitor log

`components/Track.tsx` sends one beacon per page view, search or opened inquiry form to `/api/track`, which stores it in `visits`:
- Bots are skipped, and so are browsers that send Global Privacy Control or Do Not Track.
- No cookie is set and nothing is stored on the device. No IP address is kept.
- The visit ID is a hash of the address and browser with a secret that changes daily (`visitId`). It joins one visit's pages but can't follow anyone across days.
- Records are deleted after 90 days (TTL index).
- `/privacy` describes it under "Visit statistics".

## Before production

- Create an admin (`npm run admin -- create you@company.com "Your Name"`).
- Set `CLOUDINARY_CLOUD_NAME` (`doulxmmm`, the only cloud `next.config.ts` allows), `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for photo uploads. Removing backgrounds needs Cloudinary's AI Background Removal add-on; without it, photos are used as uploaded. Without the keys, a new style can only reuse a catalogue photo.
- Run `node scripts/migrate.mjs` once for the `visits` indexes. The app also creates them on first use.
- Optional: `VISIT_SALT`, a long random secret for visit IDs. Without it, the database URI is used.

## Products: performance, suggestions, bulk changes, line sheets (2026-11-05)

- **Performance per style** (`productStats` in `lib/admin/panel.ts`): over 30 days, the visits that opened the style, the visits that added it to an inquiry list (a new `add` event from `components/Track.tsx`; the list loading from storage isn't counted), and its inquiries this month against last month, plus orders won in 90 days. It shows as the list's "Viewed · Added · Asked" column, with sorts (most viewed, most added, rising) and filters (rising interest, needs attention), and as a "How it's doing" card on each style's page. Flags:
  - **Rising:** at least 2 inquiries, and 1.5× last month's plus one.
  - **Falling:** at least 3 inquiries last month, and half that or fewer this month.
  - **Looked at, not asked for:** 15+ views and no adds or inquiries.
  - **Nobody opened it:** shown only once the catalogue gets 150+ product-page visits a month.
- **Suggestions and listing quality** (`lib/admin/product-insights.ts`, pure): one-click badge, visibility and featuring changes argued by the figures; thin lines (under 6 live styles); seasons with under 4 suitable styles; site searches that found nothing. Applying one puts it in the drafts, and Discard brings it back. Each listing is scored on five checks: second photo, description of 60+ characters, 2+ materials, 2+ tags, colour.
- **Bulk changes:** tick styles, or tick all under the current filters, then show, hide, feature, set a badge, pin or unpin a season, or delete styles added here. A selection belongs to the filters it was made under.
- **Line sheets:** "Line sheet…" in the bulk bar opens `/admin/line-sheet?ids=…&title=…&for=…`, an A4 sheet of the ticked live styles (photo, colour, materials, sizes, case pack, link) with the terms. Print it or save it as a PDF. Admins only; no prices.
- The Pages section now reads the site's pages for their headings itself (`pages/page.tsx`), so the other sections no longer wait on it.
- **Private prices** (`lib/admin/prices.ts`, `savePricesAction`): for each style, the price per pair (USD, FOB) at 300+, 600+ and 1,000+ pairs. Set on the style's page or for many styles at once ("Set prices…" in the bulk bar); saved straight away. They're stored in `site_content.prices`, which `publicContent` leaves out, so prices never reach browsers or the public site. They're used in:
  - the Products list: a Price column and a "No price yet" filter
  - each inquiry's page: price per pair at the tier the line reaches, line totals and the order total
  - Kai's reply drafts: real prices where set, and a `[tier price]` placeholder where a style has none
- **Availability** (`lib/availability.ts`, `saveAvailabilityAction`): for each style, made to order (optionally with its own lead time), in stock (ships in N days), in production (ships from a date) or sold out this season, plus a short note. It's public: the line at the top of the product page's buy box, a chip on product cards, and Kai's style details. Set on the style's page or with "Availability…" in the bulk bar; filters "In stock or in production" and "Sold out".
- **Arrange** (`/admin/products/arrange`, `lib/merch.ts`, `saveMerchAction`): the home page's "styles buyers reorder" deck (up to 12) and New arrivals (up to 10), each its own list in its own order, or automatic (the built-in lists) when empty. Also the order of featured styles, which lead the catalogue and every list.
- **History and undo** (`content/store.ts saveContent`, `app/admin/history-actions.ts`): every save keeps what it replaced in `site_content_history` (180 days). Each style's page lists its changes (what, who, when) and can put the style back as it was before any one of them: listing, visibility, prices and availability.
- **Every home section's words** (`components/ui/SectionText.tsx`): Hot products, New arrivals, Up close, Lookbook, Worn in the city, Global reach, Private label and Line sheet can now be rewritten in Pages → Home (headline and supporting line), like the rest. The Pages editor shows each section's current words, read from the home page itself. The hero and the campaign banner change with the season, so they're edited in Seasons.
- **Season words and photo** (Seasons → "Edit words and photo", `lib/season-copy.ts`, `saveSeasonCopyAction`): for each season, the hero's badge, headline (start and purple end) and line, and the campaign banner's tag, headline, supporting line, accent colour, photo (a site photo or an upload to Cloudinary), photo description and up to two styles shown worn. Stored as `site_content.seasonCopy`, only the fields that changed. "Back to the built-in words" clears a season.
- **All of a section's text** (`components/ui/Txt.tsx`): every home section marks each piece of its text (badges, buttons, card titles and texts, list items, figures, notes, tab names) with `<Txt k="…">`. Pages → Home → a section → "All the section's text" lists them all, read from the live home page (`page-blocks.ts`), each with its current words faded. Text shown only in some states (other buyer-program tabs, other lookbook looks, "On your list") is listed through a hidden `<TxtCatalog>`. Saved in `pages["/"].copy` by key (`buyer-programs` → `distributor.perk1`, etc.). Product names, sizes and MOQ figures come from Products and the trade terms, not from here.
- **Photo upload from the computer** (Seasons editor, `components/admin/upload-image.ts`, `api/admin/upload`, `api/img/[id]`): the photo is resized in the browser (max 2400px, WebP), stored in MongoDB `site_images`, and served from `/api/img/<id>` with a year-long cache. Admins only. Drag a photo onto the preview, or use "Upload a photo from your computer". No Cloudinary setup needed.
- **Talk to the desk** (`components/DeskContact.tsx`, `requestContact` in `app/actions.ts`, 2026-11-08): the box in every page's footer (and under the list on `/inquiry`, where the footer's copy steps aside). A buyer leaves a work email, optionally a WhatsApp number, and picks "A message from the desk" and/or "New styles and order dates". A message request is stored as an inquiry with the intent `contact` ("Contact request"), so it shows in Inquiries with its stages, emails the desk ("Write to them first"), and sends the buyer a note that a trade assistant will write within one working day, with their reference. Email updates join the season mailing (Resend contacts, or an email to the desk), as the line-sheet signup does. Its words are edited in Pages → Home → "Footer: talk to the desk" (one set for every page; saved as `pages["/"].copy["talk.*"]`). The line-sheet signup (`SeasonSignup`) stays on `/meet`.
