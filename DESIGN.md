---
name: Chime Long Wholesale
description: Fresh-snow wholesale catalogue. White canvas, frost-blue air, ink-black headings and actions, one purple accent, boots on snow-grey.
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
  brand: "#984080"
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

# Design System: Chime Long Wholesale

## Overview

A wholesale catalogue as calm and fresh as a winter morning. The boots and the cold do the selling; the interface stays out of the way. Reference point: Quince's clean retail calm, applied to B2B terms (MOQ, case pack, size run, lead time) instead of prices.

The page alternates quiet browsing (the range grid) with a few authored motion moments: the shelf lineup in the hero, a scroll-scrubbed cold test from 0 to −25°C, buyer-type scenes, and the live order sheet. Everything else is still. Only one section pins the scroll.

Light theme only. Black boots need a light backdrop.

## Colors

Restrained strategy: neutrals carry the page, one cool accent, winter air as atmosphere.

### Primary
- **Ink** `#121416`: text and every primary action (pill buttons, active tabs, inquiry button, selected add-buttons).

### Secondary
- **Brand** `#984080`, the purple from the Chime Long logo: the single accent. Links, cold readouts, step figures, fact icons, "New" badge text. Never a large fill, never section headings (those stay ink). The token `glacier` is a legacy alias for it.

### Neutral
- **Canvas** `#FFFFFF` page; **Snow** `#F5F5F2` product and card ground; **Photo** `#F1F1EE` image wells.
- **Frost** `#E8EFF2`, **Sky** `#DCE7EC`, **Ice** `#D5E3EA`: winter air for the cold test, order journey and line-sheet bands.
- **Ink soft** `#4B5157` body copy; **Muted** `#5F656B` captions (≥4.5:1 on canvas, snow, frost and ice).
- Scene tones for product panels: **Sand** `#F1ECE4`, **Blush** `#F4E8E5`, **Sage** `#E4EBE6`; **Kraft** `#CDB08B` only on the carton illustration.

### Named Rules
- **Air, not ink, sets the mood.** Atmosphere comes from frost-to-white gradients behind the product, never from saturated fills.
- **One accent.** Brand purple is the only chromatic UI color; logo red (`#D82020`) appears only in the logo and the "Top reorder" / "Trending" badges, and status red (`#A64B34`) is reserved for form errors.

## Typography

Hanken Grotesk (400–800) for everything, sentence case throughout; Fraunces italic only for the hero's accent word.

### Hierarchy
- **Display** (hero h1 only): clamp(40px, min(4vw, 7.2vh), 70px), 600, line-height 0.98, tracking −0.04em; one accent word in Fraunces italic 400, brand purple. Fraunces appears nowhere else.
- **Section**: clamp(30px, 3.4vw, 46px), 600, ink, tracking −0.03em, sentence case ending in a full stop, with an optional 17px supporting line.
- **Readout**: the cold-test temperature, clamp(84px, 11vw, 168px), brand purple, tabular numerals.
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
- Grids: 16px gaps (20px on wide). Product grid is 5 columns on desktop, 3 on tablet and a snap-scrolling rail on phones. Card rows that would stack four or more deep on phones (close-ups, shipping scenes) also become snap rails.
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
- **Shelf lineup (hero)**: a V-shaped shelf. The oak edge of a warm stone counter runs down a long left arm to a low point two-thirds across, then up a short right arm (the last third); the stone body fills everything below the V. Pairs ride the edge left to right on a CSS motion path (offset-path, upright), evenly spaced; how many ride at once follows the screen width, and each one takes the next style in the range every time it leaves the frame, so all kinds cycle through. The V is measured and drawn in JS on resize so neither arm rises within 24 px of the text column. Pairs are sized by height (knee boots tallest, then boots, sneakers, low shoes and sandals; kids a step smaller). Hover or focus pauses the ride and shows a name tag; a Pause control stops it; reduced motion parks the pairs evenly along the V. Any pair opens Quick View. Top right, aligned to the header's grid (the column is as wide as the headline, so its longest line ends exactly where the header ends): a white eyebrow pill ("FW26 wholesale range · N styles", brand dot), the h1 "Factory-direct footwear / for retail shelves." in Hanken Grotesk 600 ink with only "shelves." set in Fraunces italic brand purple, one 17px ink-soft line on who it is for, then "Get wholesale pricing" (ink pill) beside "Browse the range" (line pill, hidden on phones). Each piece rises in on load, staggered 80 ms. No text shadows, no glow (the top bar carries the terms). Centred above the shelf on phones.
- **Cold test**: the only pinned section, scroll-scrubbed; temperature falls 0 → −25°C, air turns to ice, frost gathers at the edges, callouts pinned to real spots on the photo appear in turn. Phones play it once. Below it, "Look closer": three static close-up crops of Nord (collar, hooks, welt) that open Quick View.
- **Who we supply**: vertical tabs for four buyer types (independent retailer, chain, distributor, private label); each shows an isometric order scene, a typical first order, terms and perks, and a CTA preset to that buyer type.
- **From order to your door**: four isometric scenes (shoebox → 12-pair case → pallet → truck) drawn with `components/ui/Iso.tsx`, each building as it scrolls in, then a frost band with the four-stop timeline (quote → samples → production → delivery, about 11 weeks).
- **Samples first**: an isometric kraft box whose lid lifts as the boot rises out (clip-path keeps the boot "inside"); style chips prefill the inquiry note.
- **Order sheet**: a paper purchase-order with letterhead, per-size table per style, cases, pairs, terms and signature line, filled from the live inquiry list (example rows when empty).

## Homepage order

Hero → The FW26 range → Built for real winters (cold test + Look closer) → Who we supply → Order samples first → Order sheet → From order to your door → Private label → Line sheet. Each wholesale term is stated in full in the top bar and the order sheet; other sections refer to it rather than repeating it.

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
