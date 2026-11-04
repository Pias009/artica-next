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
