# Project: Almanac Converter

## Overview
Almanac Converter is a smart unit converter, live currency converter, and unit-aware calculator built with SvelteKit, TypeScript, and mathjs.

## Structure
```
almanac-converter/
├── src/
│   ├── lib/
│   │   ├── components/  # Svelte UI components (SmartBar, UnitGrid, CategoryNav, DatePanel, etc.)
│   │   ├── currency/    # Live currency exchange rate loaders and types
│   │   ├── engine/      # Calculation and parsing engine
│   │   ├── stores/      # Svelte stores for settings, history, and rates
│   │   ├── clipboard.ts # Safe fallback clipboard copy helper
│   │   ├── format.ts    # Number and unit formatting helpers
│   ├── routes/          # SvelteKit routing (+page.svelte, +layout.svelte)
│   ├── app.css          # Main styling sheet with light/dark variables
│   ├── app.html         # HTML skeleton
│   └── service-worker.ts
├── static/              # Static assets (icon.svg, manifest, robots)
```

## Conventions
- Svelte 5 runes (`$state`, `$derived`, etc.) are used for state management.
- Styling uses CSS variables (sage, rust, paper, panel, ink) for theme support.
- Adaptive icons using `/icon.svg`.

## Dependencies & Setup
- Built with `vite` and `@sveltejs/kit` (adapter-static).
- Run `npm run dev` to start dev server.
- Uses `mathjs` for physical conversion and calculation logic.

## Critical Information
- Currency conversion relies on stored exchange rates loaded on mount.
- All 160+ currency rates returned from API are injected into mathjs; conflicting names (like CUP) are registered as uppercase-only.
- Date calculation (arithmetic, differences, weekdays) is handled entirely in vanilla JS (no external packages like moment) for light bundle footprint. A custom DatePanel.svelte renders the graphical Date tab.

## Insights
- `loadEngine` and `loadRates` run asynchronously and in parallel, and don't block the first paint.

## Blunders
- Hallucinated `setInterval` polling leak and mathjs `h` parsing conflict in initial audit draft. Rectified by testing behavior directly in node/bun run times before finalizing plans.
