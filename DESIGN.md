---
name: asimo.gg — AI Automations
description: One builder's black-ground, signal-orange landing — as plain and precise as the work it sells.
colors:
  true-black: "#0a0a09"
  lifted-surface: "#1a1a17"
  warm-ivory: "#f4f1eb"
  faded-ivory: "#b3ada0"
  signal-orange: "#ff6b2c"
  signal-orange-hover: "#ff8149"
  orange-ink: "#140a05"
  hairline: "rgba(244, 241, 235, 0.14)"
  hairline-soft: "rgba(244, 241, 235, 0.08)"
  placeholder: "#8f897d"
  status-ok: "#7ddb8a"
  status-error: "#ff8d81"
  invalid-border: "#ff4d3d"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 5.4vw, 5.5rem)"
    fontWeight: 640
    lineHeight: 1.02
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 122"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 630
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 120"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 116"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.01em"
rounded:
  pill: "999px"
  panel: "20px"
  field: "10px"
  focus: "2px"
spacing:
  pad-x: "clamp(1.25rem, 4vw, 4rem)"
  section-y: "clamp(3.5rem, 9vh, 6.5rem)"
  row-y: "1.6rem"
  field-gap: "1.1rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.orange-ink}"
    rounded: "{rounded.pill}"
    padding: "0.95rem 2rem"
  button-primary-hover:
    backgroundColor: "{colors.signal-orange-hover}"
  input:
    backgroundColor: "{colors.true-black}"
    textColor: "{colors.warm-ivory}"
    rounded: "{rounded.field}"
    padding: "0.8rem 0.95rem"
  form-panel:
    backgroundColor: "{colors.lifted-surface}"
    rounded: "{rounded.panel}"
    padding: "clamp(1.5rem, 3vw, 2.5rem)"
  lang-toggle-active:
    backgroundColor: "{colors.warm-ivory}"
    textColor: "{colors.true-black}"
    rounded: "{rounded.pill}"
---

# Design System: asimo.gg — AI Automations

## Overview

**Creative North Star: "As Plain As The Work"**

One builder selling production automations, and a page built to be its own proof. The world is near-black and warm: a true-black ground (#0a0a09 — black with a drop of warmth, not #000), warm ivory text, and a single signal-orange accent held in reserve for action and marks. It deliberately refuses the AI-hype landing — no glow, no gradients-as-atmosphere, no fabricated social proof. Conviction is carried by an expanded-width Archivo display voice and by structure: hairline-separated rows instead of cards, full-bleed sections divided by 1px warm lines.

The one moment of ornament is functional: a design-tool selection frame (thin orange border with corner ticks) drawn around the key words of the headline — the builder's cursor selecting the promise. Everything else stays quiet so that the orange, when it appears, always means "act here."

**Key Characteristics:**
- True-black ground, warm ivory ink, one orange accent reserved for action
- Expanded Archivo (variable `wdth` 116–122) as the display voice; normal width for body
- Rows and hairlines, not cards; the form panel is the page's only lifted surface
- Pill buttons, soft-rectangle fields; no other radius vocabulary
- One authored entrance (hero rise + frame draw), then a still page

## Colors

A two-voice palette: warm monochrome does all the talking, one signal orange does all the pointing.

### Primary
- **Signal Orange** (#ff6b2c): the only accent. Used for the primary button, the topbar mark, the headline selection frame, framed key words, required-field asterisks, step numbers, hovered row borders, and every browser surface the page themes (selection background, caret, focus ring). Hover shifts to a lighter **#ff8149**. Text set on orange uses **Orange Ink** (#140a05), a near-black warmed toward the accent — never white.

### Neutral
- **True Black** (#0a0a09): the page ground and the field interiors. Warm-tinted, not pure #000.
- **Lifted Surface** (#1a1a17): the form panel background and the scrollbar thumb — the only raised material on the page.
- **Warm Ivory** (#f4f1eb): primary text, and the fill of the active language-toggle button (with true-black text).
- **Faded Ivory** (#b3ada0): secondary text — sublines, row/step descriptions, quiet links, footer, form notes.
- **Hairline** (rgba(244, 241, 235, 0.14)): borders on interactive chrome (inputs, lang toggle) and underlines at rest.
- **Hairline Soft** (rgba(244, 241, 235, 0.08)): structural dividers — section tops, rows, steps, footer, and the form panel's edge.
- **Placeholder** (#8f897d): input placeholders and unselected `<select>` text.
- **Status Ok / Status Error** (#7ddb8a / #ff8d81): form submission feedback text only. **Invalid Border** (#ff4d3d) marks `aria-invalid` fields.

### Named Rules
**The One Signal Rule.** Orange is never decorative. Every orange pixel is an action, a mark, or a pointer at the key idea; if a new element isn't one of those, it stays ivory.
**The Warm Hairline Rule.** All borders and dividers are 1px ivory-alpha hairlines (0.14 interactive, 0.08 structural). No gray borders, no 2px rules, no full-opacity lines.

## Typography

**Display Font:** Archivo variable (self-hosted woff2, wght 100–900, wdth 62%–125%; fallback Helvetica Neue, Arial)
**Body Font:** Archivo (same family, normal width)

**Character:** One family, two voices. Headings stretch wide (font-variation `wdth` 116–122) at semi-heavy in-between weights (620–640) with tight negative tracking — an industrial, signage-like confidence. Body stays regular-width and regular-weight, plain and legible.

### Hierarchy
- **Display** (wght 640, `wdth` 122, clamp(2.5rem, 5.4vw, 5.5rem), lh 1.02, ls -0.025em): the hero headline and the closing line (closing variant caps at clamp(2rem, 4.5vw, 4rem), max 22ch, centered). Uses `text-wrap: balance`.
- **Headline** (wght 630, `wdth` 120, clamp(1.75rem, 3vw, 2.5rem), ls -0.02em): section headings.
- **Title** (wght 620, `wdth` 116, 1.25–1.3125rem, lh 1.25): row and step headings; form title runs `wdth` 118 at 1.375rem.
- **Body** (wght 400, 1.0625rem, lh 1.6): default copy; descriptive body maxes at 34–42rem measure in Faded Ivory.
- **Label** (wght 600, 0.875rem, ls 0.01em): field labels; footer and form notes share the size at wght 400. Lang-toggle buttons run 0.8125rem, wght 600, ls 0.04em.

### Named Rules
**The Width-Is-Weight Rule.** Hierarchy is expressed by widening Archivo (`font-variation-settings: "wdth"` 116→122 as importance rises) alongside weights in the 620–640 band — never by jumping to 700/800 weight or a second family.
**The Two-Language Rule.** Every text node carries paired `.en`/`.tr` spans toggled by `html[data-lang]`; Turkish copy must fit the same layout as English (the latin-ext font file is loaded for it).

## Layout

Full-bleed single column: sections span the viewport and share one horizontal gutter, `--pad-x` = clamp(1.25rem, 4vw, 4rem); there is no max-width container — measure is controlled per-element (34rem sublines, 42rem row copy, 22ch closing display). Sections stack with clamp(3.5rem, 9vh, 6.5rem) vertical padding and a soft hairline top border each.

The hero is a two-column grid (minmax(0, 1.15fr) / minmax(0, 1fr), gap clamp(2.5rem, 6vw, 6rem)), copy left and form panel right, height-capped at min(100svh − 6rem, 52rem). Content lists are two-column rows (title 1fr / description 1.4fr, 1.6rem vertical padding) and a three-across process grid.

Breakpoints: **960px** collapses hero, rows, and steps to one column; **560px** stacks the form's field pair, makes hero buttons full-width, and re-clamps the display size (clamp(2.25rem, 10vw, 2.9rem)).

## Elevation & Depth

Flat by default, with exactly one lifted surface. Depth is tonal — Lifted Surface (#1a1a17) against True Black — reinforced by a single large soft shadow under the form panel. Nothing else on the page casts a shadow; rows, sections, and buttons live flat on the ground.

### Shadow Vocabulary
- **Panel lift** (`box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.9)`): the inquiry form panel only.

### Named Rules
**The One Lifted Surface Rule.** The inquiry form is the only elevated object on the page — the conversion point is literally the closest thing to the visitor. New surfaces stay flat unless they replace it as the page's single action.

## Shapes

Two shape families and nothing between: **pills** (999px — buttons, language toggle and its segments) for anything you press, and **soft rectangles** (20px panel, 10px fields, 2px focus-ring corners) for anything that contains. Structure itself is square: rows, sections, and dividers are unrounded 1px hairlines. The signature geometry is the selection frame — a 1.5px orange border at 55% opacity with eight solid-orange corner ticks (7 × 1.5px), built from layered gradients, hugging the framed word at inset −0.04em.

## Components

### Buttons
- **Shape:** full pill (999px), padding 0.95rem 2rem, wght 600.
- **Primary:** Signal Orange fill, Orange Ink text. The page's only button style; used for "Start a project" and the form submit (submit is full-width).
- **Hover / Focus:** background lightens to #ff8149 and the button lifts −2px (transform, 0.4s `--ease-out`); active returns to 0. Focus uses the global ring: 2px solid orange, offset 3px.
- **Busy state (submit):** `data-busy="true"` swaps the label for "Sending…", drops opacity to 0.75, cursor progress.
- **Quiet link:** the secondary action is not a button — Faded Ivory text underlined in Hairline at 0.35em offset; hover turns text ivory and the underline orange.

### Inputs / Fields
- **Style:** True Black interior, 1px Hairline border, 10px radius, 0.8rem 0.95rem padding; placeholder #8f897d.
- **Hover:** border rises to rgba(244, 241, 235, 0.3). **Focus:** border turns Signal Orange (no glow, no outline).
- **Error:** `aria-invalid` border #ff4d3d. Selects hide the native arrow and draw an inline 12×8 chevron SVG; textareas resize vertically, min 7rem.

### Cards / Containers
- **Form panel (the only card):** Lifted Surface fill, Hairline Soft 1px border, 20px radius, clamp(1.5rem, 3vw, 2.5rem) padding, the panel-lift shadow. Everything else is a row, not a card.

### Navigation
- **Topbar:** borderless flex bar (1.4rem × `--pad-x` padding): orange plus/asterisk line mark left (rotates 45° on hover, 0.5s `--ease-out`); language toggle right.
- **Language toggle:** pill group, 1px Hairline border, 3px inner padding; buttons are transparent pills in Faded Ivory, hover ivory; the pressed language fills Warm Ivory with True Black text.

### Rows & Steps (signature list pattern)
- **Row:** hairline-soft top border, two-column grid; on hover the row's own top border turns Signal Orange (0.3s). Title in Title style, description in Faded Ivory.
- **Step:** same hairline top, CSS-counter number rendered before the heading in Signal Orange at wght 640.

### Selection Frame (signature)
`.framed` wraps the headline's key words: text turns Signal Orange and the design-tool selection frame (see Shapes) draws around it — during entrance it scales in from the left (scaleX 0.4→1, 0.6s, 0.3s delay).

### Motion
One easing token, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, drives transforms; color/border transitions run 0.25–0.3s plain ease. The entrance is a single authored moment scoped to `body.entrance` (removed by JS after ~1.6s so the language toggle never replays it): hero copy and panel rise 18px with staggered 0.08s delays, then the frame draws. All of it sits inside `prefers-reduced-motion: no-preference`. The page also themes the browser itself: orange selection and caret, thin scrollbar in Lifted Surface on True Black.

## Do's and Don'ts

### Do:
- **Do** reserve Signal Orange (#ff6b2c) for actions, marks, and pointers — and keep text on it Orange Ink (#140a05), never white.
- **Do** express new content as hairline-separated rows on the black ground; the form panel stays the page's only card and only shadow.
- **Do** widen Archivo (`wdth` 116–122, wght 620–640, negative tracking) for anything heading-sized, and provide paired `.en`/`.tr` spans for every new string.
- **Do** use the pill for pressables and 10–20px soft rectangles for containers; keep focus states as the 2px orange ring (or orange border inside the form).
- **Do** scope any new entrance animation to `body.entrance` and gate it behind `prefers-reduced-motion`.

### Don't:
- **Don't** add glow, gradient washes, or hype atmosphere — gradients exist in this codebase only as the mechanism drawing the selection frame's corner ticks.
- **Don't** fabricate proof (client counts, logos, avatars, review numbers); PRODUCT.md bans it until real evidence exists.
- **Don't** introduce a second accent hue, gray borders, or full-opacity dividers; all lines are warm ivory-alpha hairlines.
- **Don't** use pure #000 or pure #fff; the world is warm — #0a0a09 ground, #f4f1eb ink.
- **Don't** display a personal or brand name; identity is the mark, the voice, and the work (user-confirmed brand commitment).
