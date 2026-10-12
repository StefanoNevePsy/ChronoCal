---
name: ChronoCal implemented surface
description: Source-based record of the local calendar-hours working sheet.
colors:
  paper: "#f6f0e6"
  sheet: "#f1e9db"
  field: "#e8dfcd"
  ink: "#1a2131"
  muted: "#4f5563"
  line: "rgba(26,33,49,.18)"
  strong: "rgba(26,33,49,.35)"
  spot: "#b23a23"
  dark-paper: "#10141b"
  dark-sheet: "#181c24"
  dark-field: "#20252f"
  dark-ink: "#ede7dc"
  dark-muted: "#b7b0a5"
  dark-line: "rgba(237,231,220,.2)"
  dark-strong: "rgba(237,231,220,.42)"
  dark-spot: "#f48a64"
typography:
  headline:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(2rem, 7.5vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.015em"
  body:
    fontFamily: "Archivo, Helvetica Neue, sans-serif"
    fontSize: "15px"
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, Helvetica Neue, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: ".12em"
  annotation:
    fontFamily: "Mano, cursive"
    fontSize: "26px"
rounded:
  notice: "10px"
  setup: "16px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "9px 19px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "9px 19px"
  setup-sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.setup}"
    padding: "28px 32px"
---

# Design System: ChronoCal implementation record

## Overview

**Creative North Star: "Un taccuino clinico ben tenuto"**

This is an extraction of `public/index.html`, `public/style.css`, and `public/app.js`, recorded on 2026-10-12. The user-supplied `DESIGN.md` remains the authoritative Taccuino specification and is preserved unchanged. This document describes the built surface; it does not supersede that authority. `.impeccable/surfaces/main.md` records the surface direction.

The Italian interface is a ruled working sheet: calendar selection, inclusive dates, and an hours report. Paper, ink, locally served serif and sans-serif fonts, and brief vermilion handwriting establish the notebook character. GitHub Pages publication is deferred; connection and configuration controls address the local Mac companion. Mac login startup is operational behavior, not a visual component.

**Key Characteristics:**
- Warm paper and blue-tinted ink, inverted in the dark theme.
- Section headings extended by thin rules, calendar rows without cards, and printed numerical totals.
- Brief handwritten annotations, never handwritten data.

## Colors

The frontmatter records exact source values. `paper`, `sheet`, and `field` supply page, setup panel, and hover/code backgrounds. `ink` supplies text and filled actions; `muted` supplies secondary text. `line` and `strong` distinguish dividers from control edges. `spot` marks handwriting, focus, errors, and checkbox accents.

The dark selector overrides the corresponding CSS variables with the `dark-*` values. The system option follows the operating system and responds to changes; explicit choices persist in local storage. Selection uses the field background and spot text. There are no calendar category colors or semantic green/ochre states in this surface.

**The Single Accent Rule.** Keep the implemented calendar names and report data in ink; use vermilion for the existing annotation and interaction roles.

## Typography

Gloock, Archivo, and La Belle Aurore are local TTF files under `public/fonts/`, with OFL license files. La Belle Aurore is registered as `Mano`; all faces use `font-display: swap`. Archivo declares weights 100–900. There is no implemented font-stretch setting.

Page headings follow the headline token. Section titles are uppercase Archivo labels. Standard secondary headings are Gloock (26px); calendar names are Gloock (19px), report calendar names Gloock (20px), the brand Gloock (25px). Intro prose is 17px; secondary notes 13px. Metric labels and table headers are 11px. Totals use Gloock (56px), companion metrics 38px, and tabular figures; the mobile values are 44px and 28px. Table numbers also use tabular figures. Paragraphs have a maximum measure of 68ch.

## Layout

The centered main area is capped at 1200px with 32px horizontal padding. A 76px ruled header carries the brand and theme selector. The introduction has 56px top and 40px bottom padding. The setup panel is a two-column grid with a 32px gap; its bottom margin is 48px.

The working sheet has a 280px calendar rail, a 48px gap, and a flexible report column. A vertical pencil rule divides the rail. Date fields remain two equal columns. Presets wrap. Results follow a top rule with 40px separation. Metrics use a 2:1:1 grid, and report tables scroll within their wrappers.

At 800px and below, the setup and workspace stack; the rail becomes a horizontal-rule section, calendar choices use two columns, main padding becomes 20px, secondary brand text and intro handwriting disappear, and the footer stacks. At 420px and below, calendar choices become one column and the main total occupies its own row above two companion metrics. No app navigation, dialog, or modal is implemented.

## Elevation & Depth

No box shadows are applied. Rules and tonal paper distinguish regions. A fixed, pointer-transparent SVG noise overlay adds grain at opacity .28 with multiply in light mode and .18 with screen in dark mode. There is no retino, category highlighting, stamp animation, or decorative image.

## Shapes

Buttons and preset chips are pills. Setup uses rounded sheet corners (16px) and a dashed pencil border. Status and error regions have 10px corners. Fields are square and underlined rather than enclosed. Calendar rows and tables remain flat with bottom rules.

## Components

- **Actions and presets:** buttons have a 44px minimum height, pencil edges, field-colored hover, and a 1px downward press transform. Primary actions and selected presets are ink-filled. Presets expose `aria-pressed`; disabled buttons use half opacity and a disabled cursor. Primary hover mixes ink at 88% with the accent. Button background transitions last 160ms with `cubic-bezier(.22,1,.36,1)`.
- **Fields and selection:** native search, date, theme, and file controls have labels and underlines, with a 44px minimum height. Checkboxes are 20px squares inside larger labels: calendar rows have 64px minimum height, the overlap label 44px. Search can produce an explicit no-match message.
- **Connection/setup:** native details disclose one-time OAuth instructions and a JSON file input. A successful credential save collapses the details and posts a status. Unconfigured startup opens them. Connected calendars hide the setup panel. These are implemented UI paths, not evidence of a successful real Google connection.
- **Results:** the initial ruled region presents a handwritten empty-state note. Calculating disables the main actions and changes the calculate label and status. Changing calendars, dates, presets, or overlap policy clears the report; an outdated response is discarded. A completed report shows date range, CSV action, totals, per-calendar rows, an explanation of union versus summed durations, and expandable event detail. Zero counted events receive an explicit note.
- **Demo:** three sample calendars are selectable. Status, footer, result date caption, and CSV identify sample data. Leaving demo restores remembered selection and reloads.
- **Feedback:** in-flow ink status uses `role="status"` and polite live announcement; the accent-bordered error uses `role="alert"`. Results are also a polite live region. Feedback is not a floating toast.

Focus uses a 2px accent outline with a 3px offset. Native controls remain keyboard accessible. Reduced-motion CSS removes transitions and animations; the instantaneous 1px press displacement still exists. Standard report headers are table header cells; the expanded event table has no header row. The static theme-color metadata stays light-paper colored. This documentation does not assert a completed accessibility audit or Google API validation.

### Meaningful implementation differences from DESIGN.md

The supplied design authority prescribes a 60px header, headline line-height 1.02, focus offset 2px, paper grain .42/.22, and richer font fallback stacks. This implementation uses the values documented above. Pencil opacity is .18/.35 in light mode, rather than the authority's hex-reference .16/.32. It uses the readable text accent for all spot roles, rather than separating general spot and spot-text tokens. Large report totals retain the 56px cover-number scale, exceeding the authority's statistics example. Feedback is in normal page flow, and the setup instruction block is an inline sheet. These differences are recorded for future review, not promoted into changes to the user's design authority.

## Do's and Don'ts

### Do:
- **Do** preserve the user-supplied DESIGN.md and use this record to locate implementation facts.
- **Do** keep data printed, sections ruled, and both paper and ink themes explicit.
- **Do** preserve visible demo labels and the union-total explanation.
- **Do** retain native labels, focus outlines, and reduced-motion treatment.

### Don't:
- **Don't** introduce filled metric cards, category-colored rows, decorative gradients, or heavy shadows.
- **Don't** use handwriting for calendar names, dates, totals, or long instructions.
- **Don't** describe demo completion as verified Google account access.
