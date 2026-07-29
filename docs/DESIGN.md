# FoodSnap — Design Reference

> Source: design concept export at `~/Developer/softonic/FoodSnap mobile app design/FoodSnap App.dc.html` (7 iOS frames, dark mode). This document is **self-contained** — implement from here without needing that file. If a detail is genuinely ambiguous, check the export.
>
> The concept is **dark-only**; the app ships dark-only for now (light theme = roadmap). Visual fidelity is judged against this doc's tokens, not pixel-perfection.

## 1. Color tokens

React Native cannot parse `oklch()` strings — accents below are authored in OKLCH (source of truth) and must be **converted to hex at token-generation time** (small node script with `culori`, run by task P1.6). Hex values marked *provisional* are eyeballed and must be replaced by the script's output.

### Surfaces (hex, final)

| Token | Value | Used for |
|---|---|---|
| `bg.deep` | `#0B0C0F` | camera screen, behind sheets, CTA text color |
| `bg.screen` | `#0E1014` | default screen background |
| `surface.sheet` | `#14161C` | bottom sheets, sheet footers |
| `surface.card` | `#171A21` | cards, list rows |
| `surface.cardNested` | `#1C1F27` | cards inside sheets, option rows |
| `surface.input` | `#1E212A` | text fields, read-only value boxes (concept also uses `#1B1E26` for the search bar — unify on `#1E212A`) |
| `thumb.stripeA/B` | `#2A2D35` / `#33363F` | placeholder photo thumbs (repeating 135° stripes, 7px bands) |

### Text on dark (alpha ladder over `#F2F3F5`)

| Token | Value |
|---|---|
| `text.primary` | `#F2F3F5` |
| `text.secondary` | `rgba(242,243,245,.55)` |
| `text.tertiary` | `rgba(242,243,245,.45)` |
| `text.faint` | `rgba(242,243,245,.35)` |

(Concept uses α .28–.70; snap all uses to this 4-step ladder + primary.)

### Accents (OKLCH → hex via culori)

| Token | OKLCH source | Provisional hex | Used for |
|---|---|---|---|
| `accent.primary` | `oklch(0.62 0.19 275)` | `#655BD8` | selection borders, active chips, main progress fill, toggle-on, text cursor |
| `accent.primaryText` | `oklch(0.72 0.15 275)` | `#9891EC` | tinted text/links on dark ("Cancel", "Show", `PROBABLY · 82%`) |
| `macro.protein` | `oklch(0.72 0.16 150)` | `#2FBF77` | protein bars |
| `macro.carbs` | `oklch(0.80 0.14 75)` | `#E0A83E` | carbs bars, warning/cache dot |
| `macro.fat` | `oklch(0.68 0.17 25)` | `#E96A55` | fat bars |
| `status.ok` | `oklch(0.75 0.14 150)` | `#4CC98A` | "ready", "Connected" dots |
| `status.danger` | `oklch(0.68 0.18 25)` | `#EB6752` | destructive actions ("Clear") |

### White alphas (structural)

| Token | Value | Used for |
|---|---|---|
| `line.hairline` | `rgba(255,255,255,.07)` | separators, sheet/footer top borders |
| `bar.track` | `rgba(255,255,255,.08)` | progress-bar tracks |
| `fill.subtle` | `rgba(255,255,255,.05)` | notice cards |
| `fill.chip` | `rgba(255,255,255,.09)` | value chips, secondary buttons |
| `glass.fill` | `rgba(255,255,255,.12)` | glass buttons/chips |
| `glass.border` | `rgba(255,255,255,.24)` | glass borders |
| `handle` | `rgba(255,255,255,.22)` | sheet drag handle |

### CTA

Primary CTA: `#F2F3F5` background, `#0B0C0F` text. Disabled/secondary buttons: `fill.chip`.

## 2. Typography

- **UI text:** system font (SF on iOS, Roboto on Android).
- **Data voice:** **IBM Plex Mono** (weights 400/500/600) for all numbers, values, timestamps, and micro-labels. Bundle the OFL font files in the app (license permits; keep the OFL notice).

| Token | Spec | Used for |
|---|---|---|
| `type.display` | 34–42 / 700 / tracking −1.2…−1.6 | big kcal numbers |
| `type.title` | 26–28 / 700 / −0.8…−0.9 | food name, screen titles |
| `type.heading` | 17–19 / 700 / −0.3 | nav title, section headers |
| `type.body` | 15–16 / 400 (600 for emphasis) | rows, labels |
| `type.caption` | 12–13 / 400 | helper text |
| `type.microLabel` | mono 10–11 / 500 / tracking +.16em, UPPERCASE | `PROBABLY · 82%`, `DAILY TARGETS`, `3 ENTRIES` |
| `type.monoValue` | mono 13–14 / 500 | values (`64 / 120 g`, `681`) |
| `type.monoMeta` | mono 11–12 / 400 | meta lines (`2 slices · 256 g · 12:40`) |

## 3. Shape, spacing, components

**Radii:** 3–4 bars · 14–16 inputs/chips/thumbs · 18–20 list rows · 24–26 cards · 28 CTA pill · 30 sheet top corners · circles for icon buttons.

**Layout:** screen gutter 14–16 · card padding 18–20 · list gap 8–9 · section gap ~18–22.

**Recurring components:**

- **Macro bar:** label (`text.secondary`, 13) + mono value right-aligned; below, 5px track (`bar.track`, r3) with colored fill. Main calorie bar: 7px, `accent.primary` fill.
- **Nutrition card:** `surface.card`/`cardNested`, r24, kcal display number + unit, `% OF TODAY` micro-label right, three macro bars (protein/carbs/fat) stacked, gap 12–14.
- **List row (food/diary entry):** r18–20 card, 56px thumb (r15–16, stripe placeholder), name (16/600) + mono meta line, mono value right.
- **Bottom sheet:** `surface.sheet`, top radius 30, `line.hairline` top border, centered drag handle 38×4 r2; footer pinned: `surface.sheet` + hairline top, padding 14/20/30.
- **CTA row:** h56 r28 pill, bold 17 label + mono kcal suffix at 55% opacity.
- **Icon circle button:** 40px glass circle. **Shutter:** 82px white circle with 5px `rgba(242,243,245,.24)` ring. **Stepper button:** 46px glass circle.
- **Portion/preset chip:** r16, padding 10×15, `fill.chip`; selected = `accent.primary` bg, white text.
- **Viewfinder:** four 40×40 corner brackets, 3px `#F2F3F5`, 16px outer corner radius.
- **Notice card:** `fill.subtle` bg, `rgba(255,255,255,.08)` border, r20, 8px colored dot + title (14/600) + body (13, `text.secondary`).

## 4. Glass effect

| Token | Spec |
|---|---|
| `glass.chip` | `glass.fill` bg · blur 16 saturate 150% · `glass.border` 1px · shadow 0 4 14 rgba(0,0,0,.32) · inset top highlight rgba(255,255,255,.3) |
| `glass.tabBar` | `rgba(30,34,44,.5)` bg · blur 30 saturate 170% · border rgba(255,255,255,.16) · shadow 0 18 44 rgba(0,0,0,.5) · inset rgba(255,255,255,.22) |

RN has no `backdrop-filter`. Decision recorded in the Verified Versions table (P1.4): either `@react-native-community/blur` (native BlurView) or a **graceful degrade** — solid fills at higher alpha (≈ `rgba(30,34,44,.92)`) with the same borders/shadows. Degrade path must still look intentional; shadows and inset highlights are plain RN styles either way.

## 5. Screen inventory → plan tasks

| # | Concept screen | Contents | Plan task |
|---|---|---|---|
| 1 | Diary "Today" | date nav, kcal summary card (consumed/target, remaining, %), macro target bars, search field, "Logged today" rows, glass tab bar | **P4.2** (P3.3 implements the list styling as diary-lite) |
| 2 | Search & manual log | search input + Cancel, `N OF 120 FOODS · FUZZY MATCH` micro-label, result rows with `+`, dashed "Enter it by hand" row | **P4.4** |
| 3 | Camera capture | full-bleed preview, gradient scrims top/bottom, glass ×/⚡ buttons, corner-bracket viewfinder, "Fill the frame with your plate", Library chip · 82px shutter · "Type it" | **P1.8** ("Type it" arrives with P4.4 — omit in MVP) |
| 4 | Result peek | photo top + Retake, bottom sheet: drag handle, "drag up" hint, `PROBABLY · 82%` micro-label, food name, portion chip, nutrition card, pinned "Add to diary" CTA | **P1.13** (MVP: per-100 g card, no portion chip / no Add CTA — those are P4.3/P4.2) |
| 5 | Portion editor | − / value / + stepper (mono 44, accent underline, "tap to type"), preset chips row, THIS PORTION card with live math, time chip + "Add N g" CTA | **P4.3** |
| 6 | Full breakdown | expanded sheet: nutrition card, "Which one is it?" radio list of alternatives with confidences (`not food` rows dimmed), "Numbers came from cache" notice, CTA | **P1.13** (alternatives list = the brief's label list) · cache notice **P4.5** |
| 7 | Settings | DAILY TARGETS card, BACKEND card (gateway URL, masked API key + Show, health dot), preference rows (default portion, dim non-food toggle, clear data), ON THIS DEVICE info | **P4.6** |

Floating glass tab bar (Diary / Snap / Settings, center button elevated −30px): **P4.1**. MVP navigation stays a plain stack per the brief.

## 6. MVP styling notes (Phase 1–3, brief scope)

- **CaptureScreen (P1.8):** style per screen 3 — dark full-bleed, viewfinder brackets, big shutter, Library glass chip. `react-native-image-picker` launches the system camera, so the "live preview" is the system UI; our screen is the pre-capture home with the same visual language.
- **ResultsScreen (P1.13):** photo top, sheet-styled breakdown below: micro-label `PROBABLY · NN%` + top-1 name; "Which one is it?" list for remaining labels (radio-select swaps the queried food); confidence as mono percentages; nutrition card per 100 g with macro bars; backend unreachable → notice card (plain offline wording in MVP; cache wording arrives with P4.5). Low-relevance labels render dimmed like the concept's "not food" row.
- **HistoryScreen (P3.3):** diary-style rows (screen 1's list) — thumb, name, mono meta (grams only if known · time), kcal right. No targets/summary card (that's P4.2).
