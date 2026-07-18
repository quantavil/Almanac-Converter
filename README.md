# Almanac-Converter

A smart-bar unit converter, live-currency tool, and unit-aware calculator — one
input that understands conversions, expressions, and plain arithmetic. Ships as a
statically prerendered, installable PWA with no backend.

## Features

- **Smart bar** — `12 km to mi`, `3 ft + 12 in in cm`, `5 ft 10 in to cm`,
  `2 lakh inr to usd`, `1250 * 1.08`, `sqrt(16)`. Live results as you type.
- **Type-once-fill-all grid** — 16 categories including regional units
  (bigha, tola, gaj, maund…). Pin favourites to the top.
- **Live currency** — 37 currencies, fetched keyless with a cached + bundled
  offline fallback; a dot flags stale rates. Works in expressions too.
- **Notation** — Auto / Decimal / Scientific / Engineering, plus an adjustable
  significant-digits precision (2–10).
- **Keyboard-first** — type anywhere to focus, `/` to focus, `↑↓` through
  suggestions, `Enter` copies, `Esc` clears.
- **Shareable URLs** — every result mirrors to `?q=…` for copy-paste sharing.
- **History** — persisted, re-runnable, copyable, clearable.
- **Dark "night almanac" theme** — auto / light / dark toggle.

## Tech

SvelteKit (adapter-static) · Svelte 5 runes · TypeScript · Bun · mathjs (lazy) ·
Vitest · Playwright.

Pure-TS logic modules (`registry`, `parser`, `format`, `currency`) power the grid
instantly with zero framework or math-library dependencies; mathjs is lazy-loaded
only for smart-bar expressions.

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
