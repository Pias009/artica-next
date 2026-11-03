# The admin panel: data and edits

**Status:** Built (2026-11-03) · **Code:** `src/components/admin/`, `src/lib/admin/panel.ts`, `src/app/admin/content-actions.ts`, `src/lib/content/`, `src/lib/analytics/`

`/admin` is the dashboard. It needs a signed-in admin, or "Skip sign-in (dev)" where that's allowed (local dev, Vercel previews, a deployment with no database). On load, `panelData()` (`src/lib/admin/panel.ts`) reads everything the views show, and views publish edits through server actions. Every action checks the admin again, validates each field with zod, writes the audit log, then expires the cache so the site shows the change on the next page load.

## What each view reads and changes

| View | Reads | Changes, and where the site shows it |
|---|---|---|
| Overview | Inquiries (week, months, stages, reply times, markets), visitor log, top style | Site controls: season effects and the campaign banner, for every visitor |
| Visitors | Visitor log (last 7 days; live = last 5 min); refreshes every 30 s | Nothing |
| AI agent | Kai's usage today, audit log | Trade desk on/off, planning desk on/off, AI model on/off (`/api/assistant`, launcher, tabs) |
| Pages | Site pages, views per page | Published (unpublished pages are 404 through `proxy.ts` and leave the sitemap); search title and description (`editableMeta`); home sections shown/hidden, order, headline and supporting line (`HomePage`, `SectionHead`) |
| Products | Catalogue as built, inquiries per style (90 days) | Live, featured (listed first everywhere), name, description, badge, extra seasons. Everything that reads `products` sees these |
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
- Saving calls `updateTag("site-content")` and `revalidatePath("/", "layout")`. Static pages also refresh every 5 minutes.

## Visitor log

`components/Track.tsx` sends one beacon per page view, search or opened inquiry form to `/api/track`, which stores it in `visits`:
- Bots are skipped, and so are browsers that send Global Privacy Control or Do Not Track.
- No cookie is set and nothing is stored on the device. No IP address is kept.
- The visit ID is a hash of the address and browser with a secret that changes daily (`visitId`). It joins one visit's pages but can't follow anyone across days.
- Records are deleted after 90 days (TTL index).
- `/privacy` describes it under "Visit statistics".

## Before production

- Create an admin (`node scripts/admin.mjs create`): with `MONGODB_URI` set, production has no skip.
- Run `node scripts/migrate.mjs` once for the `visits` indexes. The app also creates them on first use.
- Optional: `VISIT_SALT`, a long random secret for visit IDs. Without it, `ADMIN_ENC_KEY` is used, or failing that the database URI.
