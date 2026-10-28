# ADR-0002: Season personalization (prebuilt season pages chosen by the proxy)

**Status:** Accepted. Records the design already built (commits `e5a9582`…`e486914`) and proposes amendments.
**Date:** 2026-10-28
**Deciders:** Pias009 (repo owner)

## Context

The site dresses itself for one of six seasons (`spring | summer | rainy | autumn | winter | holiday`). The season depends on the visitor's country (its climate) and today's date. Two things change with the season:

- **The theme**: CSS tokens on `<html data-season>`, `SeasonBackground`, and the decorations on cards and bands. This applies on every page.
- **Content order**: the hero, showcase, hot products, best sellers, new arrivals and the campaign banner on the home page, plus the catalog's featured order. The order comes from `seasonScore` in `season-products.ts`.

What's wanted: the right season on **first paint** (no flash of the wrong theme or products), a static and cacheable home page, a way for the visitor to pick a season by hand, and a correct page for search engines.

### How it works today

```
request ──▶ proxy.ts (every page; matcher excludes _next/, api/, files)
              country: ?country= → x-vercel-ip-country → cf-ipcountry → cl-country cookie → ""
              season:  home ?season= (pick) → cl-season-pick cookie → seasonOf(country, new Date())
              sets cookies: cl-country (30 d), cl-season (1 d), cl-season-pick (30 d)
              "/" ──rewrite──▶ /season/<season>   (6 static pages, generateStaticParams)
              other pages ──▶ next()               (/catalog reads the cookies → dynamic)

<head> inline script  = `(${paintSeason})(SEASON_DATA, …, ${seasonOf})`
              <html data-season> = pick cookie → cl-season cookie → seasonOf(time-zone country, local date)

client        useSeason()       = season the page was built for (context from HomePage)
              useShownSeason()  = live <html data-season> (MutationObserver)
              usePickSeason()   = set cookie + data-season now, then router.refresh() for server content
```

`src/lib/season.ts` has no imports so that the proxy and the inline script can both carry `seasonOf`.

## Evaluation

**The design is sound. Keep it.** Pre-rendering one home page per season, chosen by a cheap proxy step, gives a static home page with the correct content in the first HTML. The pre-paint script gives the correct theme on pages that aren't personalized. A pick updates the theme instantly and the content shortly after. Few alternatives get all of these together (see options).

These are the weaknesses found, most important first:

| # | Issue | Impact | Where |
|---|---|---|---|
| 1 | **A cache in front of Vercel would serve one season to everyone.** `/` is a rewrite that depends on cookies and country. If Cloudflare (named as a host in `proxy.ts`) or any HTML-caching proxy sits in front, the first visitor's season is cached for all. | High if it happens. Latent today. | deployment |
| 2 | **The season-resolution rules exist in four places**, each with its own order of precedence: the proxy, `paintSeason`, `pickSeason.autoSeason`, and `catalog/page.tsx`. The cookie-reading regex is copied into five files. No tests. A change to one (for example adding a season) can quietly make the theme and the content disagree. | Medium | `proxy.ts`, `season.ts`, `pickSeason.ts`, `SeasonPreview.tsx`, `SeasonSwitcher.tsx`, `SeasonContext.tsx`, `catalog/page.tsx` |
| 3 | **The inline script relies on `Function.prototype.toString()`.** It only works while the compiler leaves `paintSeason` and `seasonOf` as self-contained output. A transform that injects a helper (an older browserslist target, coverage instrumentation, a future compiler pass) breaks the script in production only, and the `try/catch` swallows the error. The result is a silent fall back to the default theme. | Medium (silent failure) | `season.ts` `seasonScript` |
| 4 | **When the country is unknown, the proxy blocks the browser's better guess.** With no IP header (local dev, VPNs, some hosts), the proxy picks the northern calendar *and writes `cl-season`*. `paintSeason` reads that cookie first, so the time-zone table (`SEASON_DATA.zones`) almost never gets a say. A Dhaka visitor on such a path gets autumn instead of the monsoon theme. | Low in production on Vercel, high in local dev | `proxy.ts` |
| 5 | **Dates use UTC on the server and local time in the browser.** `seasonOf(…, new Date())` runs in UTC in the proxy. Around a season boundary (the 1st of a month, Nov 20), visitors far from UTC get yesterday's or tomorrow's season for up to about 14 h. `autoSeason()` in the browser uses local time. So choosing "Auto" can repaint the theme in one season while the refreshed content comes back in the other. | Low (a few hours, six times a year) | `proxy.ts`, `pickSeason.ts` |
| 6 | **`?season=` means two different things.** On `/` it is a pick that sticks for 30 days. On `/catalog` it is a filter. The proxy handles this correctly, but it is a trap for anyone building links. A shared `/?season=summer` campaign link changes the recipient's site for a month. | Low | `proxy.ts` |
| 7 | **Visiting `/season/<x>` directly shows that season's content under the visitor's own theme.** It is `noindex`, so search doesn't care, but people following a raw link see a mismatch. | Low | `proxy.ts`, `paintSeason` |
| 8 | **A future strict CSP.** The inline script needs `'unsafe-inline'`, a nonce or a hash. A nonce forces dynamic rendering, which defeats the static season pages. | Future | `layout.tsx` |

Points checked and found fine:
- The catalog's dynamic rendering through `cookies()` is fine.
- `router.refresh()` after a pick goes back through the proxy and gets the right season page.
- Search engines get the canonical `/`. Google mostly crawls from the US, so the indexed copy follows the northern calendar. That is geo-adaptive content shown the same way to bots and people from the same place, which is not cloaking.
- Running the proxy on every page view is cheap at this traffic.
- Seven home-page builds is acceptable.

## Decision

**Keep the current architecture** (static season pages chosen by the proxy, plus the pre-paint script), with these amendments:

1. **Protect against outside caches.** On every rewrite of `/`, the proxy also sends `Cloudflare-CDN-Cache-Control: no-store`. Document in the README that any cache placed in front of the origin must not cache HTML for `/`, or must vary on the season cookie. Vercel's own cache is unaffected, because the proxy runs before it.
2. **Put the precedence rules in one pure resolver:**
   `resolveSeason({ askedSeason, pick, seasonCookie, country, zone, now }) → { season, source }` in `season.ts`, still with no imports. The proxy, `paintSeason`, `autoSeason` and the catalog all call it. Add one `readCookie(name)` helper for the client side.
3. **Test the season logic** with Node's built-in `node:test`, so no new dependency is needed:
   - a table of country × date → season, including Nov 20, month boundaries and unknown countries;
   - the precedence order in `resolveSeason`;
   - **running `seasonScript()` in `node:vm`** against a fake `document`, `localStorage` and `Intl`, then checking that `data-season` was set. This catches issue 3 at build time instead of in production.
4. **Let the browser decide when the country is unknown.** If the proxy found no country, it does not write `cl-season`. `paintSeason` then falls back to the time zone. The proxy still serves *some* home page, the northern one. In that case alone, the theme may follow the time zone while the content follows the north. That is better than both being wrong, and the visitor's next request carries the country cookie that `paintSeason` worked out (see action item 4).
5. **Accept the date skew (issue 5)** and document it. The fix, a representative UTC offset per climate or country, adds data to keep up to date for a few hours' gain.
6. **Make `/season/<x>` honest:** for direct requests, the proxy redirects `/season/<x>` to `/?season=<x>`, so theme and content always match and there is a single URL. The rewrite target still works internally, because rewrites never send the visitor to `/season/<x>`.
7. **Use a hash if a CSP comes.** `SEASON_DATA` is fixed at build time, so the script body is fixed for each build. The `sha256-…` can be computed at build time and put in the header. Write this down now so nobody reaches for nonces later.

The `?season=` naming (issue 6) stays. Renaming the home pick to `?edit=` would break links already shared. Comment both meanings in `season.ts` and keep campaign links in mind.

## Options considered

### Option A: Static season pages chosen by the proxy + pre-paint script (current, kept)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. Three moving parts (proxy, script, static routes) that must agree |
| Cost | Very low. A static CDN hit plus a light proxy step per page |
| Scalability | Excellent for traffic. Builds grow linearly with the number of seasons (×6 home pages) |
| Team familiarity | High. Already built |

**Pros:** The right content and theme in the first HTML. The home page stays fully static with a low TTFB. Picks feel instant. No database or flags service.
**Cons:** The logic is spread out (issue 2). Correctness depends on cookies and on the proxy running. The `toString()` trick is fragile (issue 3).

### Option B: Render the home page per request (Cache Components / PPR)

The home page reads `cookies()` / `headers()`. Season-dependent sections become `'use cache'` functions keyed by `season`, with a static shell around them. No rewrite and no `/season` route.

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium. Fewer routes, but needs Suspense boundaries and an understanding of cache keys |
| Cost | A function invocation per home request (cheap, but more than a CDN hit) |
| Scalability | Good. The cached sections make it about as fast as A once warm |
| Team familiarity | Low to medium. Cache Components is new in Next 16 |

**Pros:** One home route. The season is decided where it's used. Easy to add more inputs later (buyer type, line) without multiplying builds.
**Cons:** Higher TTFB on cache misses. The theme still needs the pre-paint script, because reading cookies in the root layout to set `data-season` would make *every* page dynamic. So it removes the rewrite but none of the client-side resolution. Gains don't justify a rewrite of working code.

### Option C: Client-only personalization

One static home page. Sections reorder after hydration from the time zone or a cookie. No proxy.

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Lowest. Pure static |
| Scalability | Excellent |
| Team familiarity | High |

**Pros:** The simplest. Works on any static host.
**Cons:** The hero and product rails swap after load: visible layout shift and a worse LCP on the most important page. Search engines and no-JS clients see only the default. It throws away the main benefit of the current design.

### Option D: Feature flags / Edge Config for the season

The season calendar and overrides move to Edge Config or a flags SDK. The proxy reads them.

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Cost | Low (Edge Config reads are cheap) |
| Scalability | Excellent |
| Team familiarity | Low |

**Pros:** Marketing can change dates or force a season ("holiday starts early this year") without a deploy.
**Cons:** The inline script would also need the data, so it ships to the client anyway. It adds a service for a calendar that changes about once a year. **Revisit** if marketing asks for time-boxed campaigns more often than they deploy.

## Trade-off analysis

The real choice is **where the season is decided, compared with where it has to be known first**:

- **The content order has to be known at HTML time** to avoid layout shift. That leaves the edge (A) or the server (B). A does this at near-zero cost, because there are only six possible pages. Personalization with a small, fixed number of variants is exactly where pre-rendering every variant wins. B starts to win if the number of variants grows multiplicatively (season × buyer type × line …).
- **The theme has to be known before paint** on every page, including static ones that never see the proxy's decision as HTML. Some client-side resolution is therefore unavoidable in *every* option. The aim is not to remove it but to make sure the copies can't disagree. Hence amendments 2 and 3, not a re-architecture.
- Issues 1 and 3 are the only ones that can fail **silently in production**, so they are the priority. Everything else is an edge case at a boundary.

## Consequences

**Easier:**
- Adding or tuning a season, or changing precedence, is one function with a test table.
- Production is protected from a mis-configured CDN and from compiler changes breaking the theme script.
- Local dev shows the time zone's season instead of always the northern one.

**Harder:**
- `season.ts` must stay import-free, and the `vm` test enforces this. Contributors need to know why (the file header already says so).
- Redirecting `/season/<x>` means any internal code that links to it directly must go through `/?season=`.

**To revisit:**
- **Move to B** if the home page gets a second axis of personalization (buyer type, product line, campaign). Variants multiply builds, but cache keys handle them cheaply.
- **Move to D** if season dates or overrides start changing more often than deploys.
- **Fix the timezone skew (issue 5)** if a market where it shows (AU/NZ around Nov 20) matters commercially.

## Action items

1. [ ] `proxy.ts`: send `Cloudflare-CDN-Cache-Control: no-store` on the `/` rewrite. Add a note on caching in front of the origin to README's deployment section.
2. [ ] `season.ts`: add `resolveSeason(...)` (no imports) and `readCookie`. Use them in `proxy.ts`, `paintSeason`, `pickSeason.ts`, `SeasonPreview.tsx`, `SeasonSwitcher.tsx`, `SeasonContext.tsx` and `catalog/page.tsx`.
3. [ ] `src/lib/season.test.ts` + `"test": "node --test"` script: the country × date table, the precedence table, and the `vm` run of `seasonScript()`. Run it in CI, or in `prebuild` until CI exists.
4. [ ] `proxy.ts`: when no country is known, don't set `cl-season`. `paintSeason` writes `cl-country` from the time zone when it falls back, so the next request agrees.
5. [ ] `proxy.ts`: redirect `/season/<x>` requested directly to `/?season=<x>`, keeping `noindex` as a safety net.
6. [ ] `season.ts`: comment the two meanings of `?season=` and the UTC date behaviour, and the hash plan for a future CSP.
7. [ ] Follow-up: revisit this ADR when a second personalization axis is proposed for the home page.
