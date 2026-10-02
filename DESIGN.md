---
name: ARTICA Wholesale
description: Fresh-snow wholesale catalogue. White canvas, frost-blue air, ink-black actions, boots on snow-grey.
colors:
  canvas: "#ffffff"
  snow: "#f5f5f2"
  photo: "#f1f1ee"
  frost: "#e8eff2"
  ice: "#d5e3ea"
  sky: "#dce7ec"
  ink: "#121416"
  ink-soft: "#4b5157"
  muted: "#5f656b"
  ink-hover: "#2c3136"
  chip: "#f2f3f3"
  chip-hover: "#e8eaea"
  glacier: "#2d5d6f"
  sand: "#f1ece4"
  blush: "#f4e8e5"
  sage: "#e4ebe6"
  kraft: "#cdb08b"
  danger: "#a64b34"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(44px, 6.2vw, 92px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  section:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.4vw, 46px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  small:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  lead:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  readout:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(84px, 11vw, 168px)"
    fontWeight: 600
    lineHeight: 0.85
    letterSpacing: "-0.05em"
rounded:
  ph: "12px"
  card: "14px"
  shell: "20px"
  pill: "999px"
spacing:
  section: "clamp(72px, 9vw, 136px)"
  gutter: "clamp(16px, 3.2vw, 48px)"
  grid: "16px"
  grid-wide: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-line:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  filter-tab:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 20px"
  filter-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
  product-card-photo:
    backgroundColor: "{colors.snow}"
    rounded: "{rounded.card}"
  badge:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.title}"
---

# Design System: ARTICA Wholesale

## Overview

A wholesale catalogue as calm and fresh as a winter morning. The boots and the cold do the selling; the interface stays out of the way. Reference point: Quince's clean retail calm, applied to B2B terms (MOQ, case pack, size run, lead time) instead of prices.

The page alternates quiet browsing (line cards, product grid) with a few authored motion moments: the opening case in the hero, a scroll-scrubbed cold test from 0 to −25°C, a pinned zoom into Nord's details, and a small boot walking the order timeline. Everything else is still.

Light theme only. Black boots need a light backdrop.

## Colors

Restrained strategy: neutrals carry the page, one cool accent, winter air as atmosphere.

### Primary
- **Ink** `#121416`: text and every primary action (pill buttons, active tabs, inquiry button, selected add-buttons).

### Secondary
- **Glacier** `#2D5D6F`: the single accent. Cold readouts, step numbers, fact icons, "New" badge text, chart bars. Never a large fill.

### Neutral
- **Canvas** `#FFFFFF` page; **Snow** `#F5F5F2` product and card ground; **Photo** `#F1F1EE` image wells.
- **Frost** `#E8EFF2`, **Sky** `#DCE7EC`, **Ice** `#D5E3EA`: winter air for the hero, cold test, order journey and line-sheet bands.
- **Ink soft** `#4B5157` body copy; **Muted** `#5F656B` captions (≥4.5:1 on canvas, snow, frost and ice).
- Scene tones for product panels: **Sand** `#F1ECE4`, **Blush** `#F4E8E5`, **Sage** `#E4EBE6`; **Kraft** `#CDB08B` only on the carton illustration.

### Named Rules
- **Air, not ink, sets the mood.** Atmosphere comes from frost-to-white gradients behind the product, never from saturated fills.
- **One accent.** Glacier is the only chromatic UI color; status red (`#A64B34`) is reserved for form errors.

## Typography

One family, Hanken Grotesk (400–800), sentence case throughout.

### Hierarchy
- **Display** (hero): clamp(44px, 6.2vw, 92px), 600, line-height 0.98, tracking −0.04em, lines revealed from a mask on load.
- **Section**: clamp(30px, 3.4vw, 46px), 600, tracking −0.03em, with an optional 17px supporting line.
- **Readout**: the cold-test temperature, clamp(84px, 11vw, 168px), glacier, tabular numerals.
- **Title**: product names 16px/600; feature titles 19–24px/600.
- **Body** 16px/1.55; **lead** 18px.
- **Small** 14–15px for meta lines, controls and list items; **caption** 12.5–13px for units, table heads and footnotes.
- **Figures** 26–40px semibold for quantities (pairs, cases, totals), always tabular numerals.

### Named Rules
- **No eyebrows.** Headings carry the page; no kicker labels above them, no section numbers.
- **No all-caps headings.** Caps appear only in the logo and the tiny "YOUR LOGO" props.

## Layout

- Full-width page with a gutter of clamp(16px, 3.2vw, 48px); content capped at 1440px (`wrap`). Atmospheric bands break out to the page edges (`bleed`).
- Section rhythm: clamp(72px, 9vw, 136px) between sections, more space above a heading than below.
- Grids: 16px gaps (20px on wide). Product grid is 5 columns on desktop, 3 on tablet and a snap-scrolling rail on phones.
- Breakpoints: 528px, 864px, 1184px, 1376px.

## Elevation & Depth

Almost flat. Depth comes from the boots' drop shadows and soft ground ellipses, not from cards. A small `shadow-soft` lifts floating controls (switcher, add buttons, line-sheet form); `shadow-float` is reserved for callout cards over imagery.

## Shapes

Soft rectangles for imagery (12–20px), pills for every control. No borders on cards; hairlines only as list separators and the footer rule.

## Components

### Buttons
Ink pill (48px) for the primary action, white pill with a light ink outline for the secondary. Text links use an underline that darkens on hover plus an arrow that nudges right.

### Product card
Snow photo well (4:5), the boot centered with a drop shadow; hover crossfades to the zip-side view and scales 1.06. White pill badge top-left, round add button bottom-right (appears on hover on desktop, always on touch). Below: name + color dot, type · line, then "300 pairs MOQ · 12 per case · sizes". The whole card opens Quick View.

### Navigation
Ink announcement bar with the three wholesale terms; sticky white header (68px) with logo, text nav with an ink underline for the current page, search, and the ink "Inquiry list" pill with a live count. Phones get a full-height list menu.

### Signature moments
- **Case hero**: "Twelve pairs. Every size. One case." beside an open ARTICA carton seen from above on a packing-table grid. On load the flaps unfold, twelve shoeboxes stamped with the line's real size run drop in, and one lid slides off onto its neighbour to show the boot in tissue. Men/Women/Kids re-stamps the boxes and swaps the open boot. Annotation pills, an order slip and a five-cell terms bar complete it.
- **Cold test**: pinned, scroll-scrubbed; temperature falls 0 → −25°C, air turns to ice, frost gathers at the edges, callouts pinned to real spots on the photo appear in turn. Phones play it once.
- **Look closer**: pinned stage zooms into four details of Nord (desktop); close-up crops on phones.
- **Order journey**: a small boot walks the quote → samples → production → delivery line as you scroll.
- **Who we supply**: vertical tabs for four buyer types (independent retailer, chain, distributor, private label); each shows an isometric order scene, a typical first order, terms and perks, and a CTA preset to that buyer type. Followed by "Four ways to order": sample → first order → reorder → volume program.
- **How it ships**: four isometric scenes (shoebox → 12-pair case → pallet → truck) drawn with `components/ui/Iso.tsx`, each building as it scrolls in.
- **Samples first**: an isometric kraft box whose lid lifts as the boot rises out (clip-path keeps the boot "inside"); style chips prefill the inquiry note.
- **Order sheet**: a paper purchase-order with letterhead, per-size table per style, cases, pairs, terms and signature line, filled from the live inquiry list (example rows when empty).

## Do's and Don'ts

### Do:
- Show the boot large and let the photo do the work.
- Keep wholesale facts (MOQ, case pack, size run, lead time) one glance away.
- Give motion to a few moments and keep the rest still; reduced-motion users get the finished state.

### Wholesale, not retail
Every section speaks in cases, pairs, size runs, pallets, samples and lead times. Words like "shop", "buy", "cart" and prices never appear.

### Don't:
- Don't use glass panels, monospace "spec" labels, bracketed tags or uppercase headlines.
- Don't put borders around cards or nest cards.
- Don't add prices, ratings, carts or invented certifications, customers or store photos.
