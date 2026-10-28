# ADR-0001: Client store design (inquiry list and UI state)

**Status:** Proposed
**Date:** 2026-10-28
**Deciders:** Pias009 (repo owner); anyone who owns the inquiry pipeline once leads are stored

## Context

The site is a B2B wholesale showroom. Buyers do not sign in. They build an **inquiry list** (styles × cases, minimum `MOQ_CASES` per style) and send it through the `submitInquiry` server action, which emails it through Resend.

How it works today (`src/lib/store.ts`):

- **Two Zustand stores.**
  - `useInquiry` holds the list. It is saved to `localStorage` under `artica-inquiry` with `skipHydration: true` and is loaded after mount by `<StoreHydrator/>`. Its `merge` drops ids that are no longer in the catalog.
  - `useUI` holds state that is not saved: whether the drawer is open, the quick-view product, buyer type, values handed over to prefill the form (`{ value, key: Date.now() }`), the rail filter and the toast.
- **About 30 client components** read from the stores. Most only call `openDrawer` (13 call sites) or `openQuickView` (9).
- **The server does not trust the client.** `submitInquiry` parses `lines` from the form, keeps only known ids with whole-number `cases >= MOQ_CASES`, and works out pairs on the server.
- **The privacy page promises** that the inquiry list "is kept in your own browser (local storage)… It reaches us only when you send it." Any storage option that keeps the list on the server breaks this promise as written.
- `QuickView` is one `<dialog>` in the root layout, driven by `useUI.quickView`. Product pages already exist at `/products/[slug]`.

Problems seen in the current design:

1. **Tabs overwrite each other.** `persist` writes the whole list on every change, and nothing listens for the `storage` event. A buyer comparing styles in two tabs loses the additions from one tab when the other tab next writes. (`src/components/season/effects.ts` already handles `storage` events for the season pick. The inquiry store does not.)
2. **The saved list has no version.** There is no `version` or `migrate`. If `InquiryLine` changes shape, the `merge` filter will quietly throw away or mangle returning buyers' lists.
3. **The list flashes empty on load.** The server HTML and first paint show an empty list ("0" in `CartCount`, an empty `OrderSheet`). After rehydration the count jumps, and the GSAP bump in `CartCount` fires on every full page load that has a saved list, because the "first render" guard has already been used up on the server-equal render.
4. **Quick view has no URL.** The back button does not close it, a buyer cannot paste a link to the product they are looking at, and analytics see no page view.
5. **A buyer cannot hand a list to a colleague.** Buying is usually done by more than one person, but the list lives in one browser.

## Decision

**Keep Zustand + `localStorage` as the place the inquiry list lives, and fix the specific gaps.** Do not move to a server-side cart.

1. **Sync tabs.** Listen for `storage` events on the `artica-inquiry` key and call `useInquiry.persist.rehydrate()`.
2. **Version the saved data.** Add `version: 1` and a `migrate` function to `persist`, so a later shape change can be handled on purpose.
3. **Put quick view in the URL**, without a server round trip. Opening it does `window.history.pushState` with `?view=<slug>`. `QuickView` reads `useSearchParams()`. Closing it goes back in history, or replaces the URL if the page was opened directly at that link. `useUI.quickView` and `openQuickView` / `closeQuickView` go away, and the 9 call sites switch to a small `openQuickView(slug)` helper or a `<Link>`.
4. **Add a shareable list link** (`/inquiry?l=<id>.<cases>,…`). Opening it merges into or replaces the local list, after confirming with the buyer. This handles handing a list to a colleague without accounts or a database.
5. **Handle the flash on load.** Expose a `hydrated` flag (set after `rehydrate()`). Components that show counts or totals render a neutral placeholder until it is set, and `CartCount` skips its bump on the hydration change.

`useUI` stays as it is apart from losing quick-view state.

## Options considered

### Option A: Status quo (Zustand + localStorage, no changes)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | None |
| Scalability | Fine. The state is per-browser and only a few KB |
| Team familiarity | High. It is already built |

**Pros:** Nothing to do. No backend. Matches the privacy page.
**Cons:** Problems 1–5 above remain. Lost-list bugs from multiple tabs are invisible and erode trust in a lead-generation tool.

### Option B: Zustand + localStorage with targeted fixes (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low to medium. About five small, separate changes |
| Cost | None. No infrastructure |
| Scalability | Same as A |
| Team familiarity | High. Same libraries, plus the native History API, which Next 16 supports alongside `useSearchParams` |

**Pros:** Fixes the real failure modes. Keeps the privacy promise. Each change can ship on its own. Quick view gains a URL and back-button behavior, and the list gains a way to be shared.
**Cons:** The list still cannot be reached across devices unless the buyer shares the link. The share link puts the list in a URL, though it holds only ids and case counts, not personal data.

### Option C: URL as the only place the list lives

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium |
| Cost | None |
| Scalability | Limited by URL length, which is fine up to roughly 100 lines |
| Team familiarity | Medium |

**Pros:** Every state can be shared and bookmarked, and nothing is hidden in storage.
**Cons:** The list disappears when the buyer opens a page from a link that lacks the parameter (nav, search, external links). The parameter would have to be carried on every internal link. It fights the season rewrite in `proxy.ts`, which already treats `?season=` differently on `/` and `/catalog`. History fills with every change to case counts. Better as an *export* format (option B, item 4) than as the store.

### Option D: Server-side list (cookie session id + KV or Postgres)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | A Marketplace KV or DB, plus session handling and cleanup of expired sessions |
| Scalability | Good. Opens the door to accounts, saved lists and sales follow-up |
| Team familiarity | Low. The repo has no data layer today |

**Pros:** Works across devices once accounts exist. Sales could see abandoned lists, which are strong leads.
**Cons:** Breaks the privacy-page promise and needs a consent and policy change. It adds the repo's first database just for this. Without sign-in it still does not cross devices. Pages that read the session become dynamic, which works against the static `/season/[season]` pages. It moves complexity onto a feature that is about being low-friction.

### Option E: Intercepting + parallel routes for quick view (`@modal/(.)products/[slug]`)

Considered for item 3 only.

**Pros:** This is the pattern Next documents. Refresh shows the full product page and the back button closes the dialog.
**Cons:** Every open does a server (RSC) fetch, where today it opens instantly from data already on the client. It needs a `@modal` slot and `default.tsx` files at the root, and it interacts with the home page being a rewrite to `/season/[season]`. The current GSAP open animation would have to be reworked around a route transition. A shallow `pushState` gives the same benefits for a lightweight dialog.

## Trade-off analysis

The main question is **where the list's source of truth lives**:

- **The browser** (A, B): no friction and private by default.
- **The URL** (C): can always be shared, but fragile.
- **The server** (D): reachable from anywhere, but needs infrastructure and a privacy change.

For a no-login B2B inquiry tool, the server already re-validates everything that matters at submit time. The list's value is in *not losing it* and *being able to pass it on*. Option B delivers both with no infrastructure: cross-tab sync stops the loss, and the share link covers passing it on.

Option D only pays off if the business wants **to act on lists that were never sent** (abandoned-list follow-up) or adds buyer accounts. That depends on the open "inquiry lead pipeline" decision (storing leads at all), and should be decided there, not here.

For quick view, the shallow URL (B.3) is chosen over intercepting routes (E) because the dialog is a lightweight client view of data already on the client. A server round trip would make it slower without making it more correct.

## Consequences

**Easier:**
- Buyers can use several tabs without losing items.
- Product links can be shared from quick view, and the back button behaves as expected.
- A buyer can send their list to a colleague or to themselves on another device.
- Future changes to the shape of a list line have a migration path.

**Harder:**
- `QuickView` has to handle two ways of closing: history back, or replace when the page was opened from a link.
- The share-link format becomes a public contract. Version it (for example `l=v1:…`) and keep old links parsing.
- Components that show counts must respect `hydrated`.

**To revisit:**
- Option D, if leads get stored server-side or buyer accounts are introduced.
- The prefill handoff in `useUI` (`{ value, key: Date.now() }` used as an event). It works, but if more cross-component handoffs appear, consider an explicit event or a URL parameter instead.

## Action items

1. [ ] `store.ts`: add `version: 1` and `migrate` to `persist`. Export a `useHydrated()` hook that `StoreHydrator` sets after `rehydrate()`.
2. [ ] `StoreHydrator.tsx`: subscribe to `window` `storage` events for `artica-inquiry` and call `rehydrate()`. Clean up on unmount.
3. [ ] `CartCount.tsx`, `OrderSheet.tsx`, `ContainerPlanner.tsx`: show a placeholder until hydrated, and skip the bump on the hydration change.
4. [ ] Quick view: replace `useUI.quickView` with `?view=<slug>` through `history.pushState` and `useSearchParams()`. Update the 9 `openQuickView` call sites. Wrap `QuickView` in `<Suspense>` as `useSearchParams` requires.
5. [ ] `/inquiry`: add "Copy list link" (`?l=v1:<id>.<cases>,…`), and on load offer to merge or replace when `l` is present. Validate ids against `byId` and clamp cases to `MOQ_CASES`.
6. [ ] Update the privacy page copy if the share link is added ("…or in a link you choose to share").
7. [ ] Follow-up: link this ADR from the inquiry-pipeline ADR once that is written, since it decides whether option D comes back.
