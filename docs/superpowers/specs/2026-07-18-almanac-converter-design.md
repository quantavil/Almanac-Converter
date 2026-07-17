# Almanac Converter — Design Spec

**Date:** 2026-07-18
**Status:** Approved direction; pending final user review
**Replaces:** single-file `index.html` brutalist converter

## 1. Product

**Almanac Converter** — a smart-bar unit converter and unit-aware calculator.
One intelligent input handles conversions, unit math, and plain arithmetic; a
browsable, live-syncing unit grid sits below it. Universal audience. Shipped as
a static, installable, offline-capable PWA. Visual identity: **D2 · Almanac**
(warm parchment, serif display, sage + rust accents), chosen by the user from
nine explored directions.

### Core interactions

1. **Smart bar (hero):** type `12 km to mi`, `3 * (4 ft + 2 in) in cm`,
   `100 usd to inr`, or `1250 * 1.08` — live result as you type.
2. **Unit grid:** type a value into any unit cell; every sibling unit in the
   category fills instantly. Any cell is editable and becomes the source.

## 2. Tech stack

- **SvelteKit** + **Vite**, run and package-managed with **Bun**;
  `adapter-static` (no backend, deploys to any static host).
- **TypeScript** throughout.
- **mathjs** — expression engine, lazy-loaded after first paint.
- **Vitest** (unit), **Playwright** (e2e).
- PWA: web manifest + service worker (cache-first shell,
  stale-while-revalidate currency rates).

## 3. Architecture

Modules with strict boundaries; each usable and testable alone.

### 3.1 `unit-registry` (no dependencies)
Single source of truth for all categories/units. Each unit: canonical name,
symbol, aliases (for parsing/autocomplete), and either a linear `factor` to the
category base or custom `toBase`/`fromBase` functions (temperature offsets,
reciprocal fuel economy). Regional units included (Bigha, Gaj, Biswa, Kanal,
Marla, Guntha, Ground, Cent, Tola, Maund, Hath). Digital units are explicit:
kB = 1000 B, KiB = 1024 B — both listed.

Exposes `convert(value, fromUnit, toUnit)` for same-category conversion.
**The grid uses only this module** — it works before mathjs loads.

### 3.2 `engine` (wraps mathjs, lazy)
Configures mathjs custom units from the registry (aliases included), injects
currency units at runtime (with `override: true` on rate refresh), and exposes
`evaluate(normalizedQuery)` → `{ value, unit, dimension } | TypedError`.
Loaded asynchronously; until ready, the smart bar handles plain `X unit to
unit` conversions via the registry so the app is never dead.

### 3.3 `query-parser`
Normalizes natural language before the engine sees it:
- Conversion keywords: `to`, `in`, `→`, `as`.
- **`in` disambiguation:** `in` is a conversion keyword only when followed by
  a unit token; otherwise it is inches (`5 in to cm` works).
- Alias resolution via the registry (`kmph` → `km/h`, `sq ft` → `ft^2`).
- Classifies input: conversion | expression | plain number | unit-name lookup
  (drives the suggestions dropdown and grid jump).

### 3.4 `currency`
Fetches rates from a keyless public API (primary: `open.er-api.com`;
fallback: bundled snapshot shipped with the app). Caches to `localStorage`
with timestamp; UI always shows “rates as of «date»”. Fetch is non-blocking;
failure is silent with a stale badge. Currencies covered: major world + INR,
AED, and other user-relevant currencies (~20).

### 3.5 UI components (Svelte)
- `SmartBar` — hero input, live result card, suggestions dropdown.
- `ResultCard` — primary answer + 3–4 sibling-unit mini-conversions;
  click/Enter to copy.
- `UnitGrid` — category grid of editable cells, live sync from any source
  cell; source cell visually marked.
- `CategoryNav` — grouped category navigation (Common / Science / Digital /
  Regional), not a 16-tab wall.
- `HistoryPanel` — recent calculations (persisted, click to re-run).
- `SettingsPopover` — precision (significant digits), theme override,
  clear history.
- `ThemeToggle`, `Toast`.

### 3.6 `stores`
Svelte stores persisted to `localStorage`: theme override, precision,
active category, history (max 50), currency cache metadata.

## 4. Data flow

- **Smart bar:** keystroke → `query-parser` → `engine.evaluate()` (or registry
  fast-path) → `ResultCard` (+ optional grid jump to the result's dimension).
  Debounce ≤ 50 ms; evaluation is synchronous once mathjs is loaded.
- **Grid:** cell edit → registry `convert()` from source to base → all sibling
  cells formatted to current precision. No mathjs involved.
- **URL state:** bar query mirrored to `?q=` via debounced
  `history.replaceState`; loading a shared URL restores and evaluates it.
- **Currency:** boot → non-blocking fetch → cache → inject/override engine
  units → grid + bar recompute if a currency query is active.

## 5. Feature set (v1)

1. Smart bar: conversions, unit-aware math, plain arithmetic, live results.
2. Unit grid with type-once-fill-all behavior, ~15 categories incl. regional.
3. Live currency with offline cache, bundled fallback, "as of" stamp.
4. Suggestions dropdown: interpretation preview, unit-name autocomplete,
   "Jump to «Category · Unit»" (replaces old search).
5. History (persisted, re-runnable, copyable).
6. Copy: Enter or click copies the plain number (no thousands separators).
7. Shareable URLs (`?q=12+km+to+mi`).
8. Keyboard-first: typing anywhere focuses the bar; `Enter` copy; `Esc` clear;
   `/` focus; arrow keys navigate suggestions.
9. Precision as **significant digits** (default 6) with exponential fallback —
   never renders a misleading `0.00`.
10. PWA: installable, fully offline except live-rate refresh.
11. Light/dark Almanac theme; follows `prefers-color-scheme`, manual override
    persists.
12. Accessibility: WCAG AA contrast, `aria-live` result announcements, real
    label associations, full keyboard operation, `prefers-reduced-motion`.

### Explicitly out of scope (v1)
Accounts, backend, synced history, i18n, native apps, plotting,
programmer/scientific calculator modes beyond what mathjs expressions give
for free.

## 6. Visual design — D2 · Almanac

**Mood:** field-guide / almanac. Studious, warm, precise, distinctly not
generic.

- **Ground:** warm parchment `#f6f3e9`; panels `#fffdf6`; hairlines `#d8d3c0`.
- **Ink:** deep warm gray-green `#2c3327`.
- **Accents:** rust `#a8492c` (primary result, source cell, focus), sage
  `#5b6b4a` (structure rules, secondary UI). Both AA-checked on both grounds.
- **Dark "night almanac":** deep ink-brown ground (~`#1d1b16`), parchment-
  tinted text, same accent hues lightened to maintain AA.
- **Type:** Source Serif 4 (600) for headings and the hero result number;
  Inter/system sans for UI and all tabular data with `font-variant-numeric:
  tabular-nums lining-nums` — serif oldstyle figures are banned from grids
  (they misalign).
- **Shape:** mostly square-ish (6–10px radius), thin 1px hairlines, one
  5px sage rule on the result card's left edge as the signature device.
- **Layout:** single centered column, max-width 1080px; smart bar sticky on
  scroll; grid `repeat(auto-fill, minmax(160px, 1fr))`.
- **Motion:** restrained — 120–180ms eases on focus/hover, no springs;
  collapses under reduced-motion.

## 7. Error handling

- Bar never hard-errors: partial/invalid input shows a quiet inline hint
  ("unknown unit 'kmm' — did you mean km?", "can't convert length to mass").
- Typed error union from the engine: `UnknownUnit`, `DimensionMismatch`,
  `ParseError`, `DivisionByZero`; UI maps each to friendly copy.
- Currency fetch failure → stale badge, cached/bundled rates keep working.
- Reciprocal fuel-economy zero input → shows "—" (undefined), not Infinity.

## 8. Testing

- **Registry:** every unit round-trips (x → base → x within epsilon);
  golden-value tests against known conversions (1 mi = 1609.344 m,
  100 °C = 212 °F, 1 Bigha = 2529.28 m², 1 Tola = 11.6638 g).
- **Parser:** `in`/`to` disambiguation table, alias resolution, classification.
- **Engine:** unit math (`3 ft + 12 in in cm`), precedence, currency
  injection/override, error taxonomy.
- **E2E (Playwright):** bar query → result; grid edit → siblings update;
  settings persist across reload; offline mode still converts; share-URL
  restores state.

## 9. Milestones

1. Scaffold (SvelteKit + Bun + adapter-static + CI-less local verify).
2. `unit-registry` + tests → `UnitGrid` working with Almanac theme.
3. `query-parser` + `engine` (mathjs) + `SmartBar` + `ResultCard`.
4. Currency module + injection.
5. History, share URLs, settings, keyboard layer.
6. PWA (manifest, service worker), a11y pass, Playwright e2e, polish.
