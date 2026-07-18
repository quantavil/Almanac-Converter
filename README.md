# Almanac-Converter

A smart-bar unit converter, live-currency tool, and unit-aware calculator — one
input that understands conversions, expressions, and plain arithmetic. Ships as a
statically prerendered, installable PWA with no backend.

## Features

- **Smart bar** — `12 km to mi`, `5 ft 10 in to cm`, `2 lakh inr to usd`,
  `15% of 240`, `1250 * 1.08`, `sqrt(16)`. Live results as you type, with a
  swap button (⇄) to flip direction and unit autocomplete after `to`.
- **Type-once-fill-all grid** — 16 categories including regional units
  (bigha, tola, gaj, maund…). Pin favourites to the top.
- **Live currency** — 35 currencies in the grid (160+ recognised in the smart
  bar), fetched keyless with a cached + bundled offline fallback; a dot flags
  stale rates. Works in expressions too.
- **Date tab** — days between dates, add/subtract durations, timezone
  conversion across major zones, and Unix-epoch ↔ calendar (UTC).
- **Notation** — Auto / Decimal / Indian / Scientific / Engineering, plus an
  adjustable significant-digits precision (2–10); INR results also show a
  lakh/crore hint.
- **Keyboard-first** — type anywhere to focus, `/` to focus, `↑↓` through
  suggestions, `Enter` copies and logs to history, `Esc` clears.
- **Shareable URLs** — every result mirrors to `?q=…` for copy-paste sharing.
- **History** — persisted, re-runnable, copyable, clearable.
- **Dark "night almanac" theme** — auto / light / dark toggle.

## Tech

SvelteKit (adapter-static) · Svelte 5 runes · TypeScript · Bun · mathjs (lazy) ·
Vitest · Playwright.

Pure-TS logic modules (`registry`, `parser`, `format`, `currency`, `date`) power
the grid and date math instantly with zero framework or math-library
dependencies; mathjs is lazy-loaded only for smart-bar expressions.

## Develop

```sh
bun install
bun run dev        # dev server
bun run check      # svelte-check (types)
bun run test       # unit tests (Vitest)
bun run test:e2e   # end-to-end (Playwright)
bun run build      # static site -> build/
bun run preview    # preview the production build
```
