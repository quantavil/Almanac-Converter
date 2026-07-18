# Project: Almanac Converter

## Overview
Almanac Converter is a smart unit converter, live currency converter, and unit-aware calculator built with SvelteKit, TypeScript, and mathjs.

## Structure
```
almanac-converter/
├── src/
│   ├── lib/
│   │   ├── components/  # Svelte UI components (SmartBar, UnitGrid, CategoryNav, DatePanel, ResultCard, etc.)
│   │   ├── registry/    # Unit categories + data, findUnit/searchUnits/convert
│   │   ├── parser/      # parse() — classifies input (convert/expression/lookup/date_math)
│   │   ├── engine/      # evaluateParsed — registry fast-path + lazy mathjs
│   │   ├── date/        # Shared date-math (resolveDate, diffDaysLabel, addDuration) for engine + DatePanel
│   │   ├── currency/    # Live currency exchange rate loaders + bundled fallback
│   │   ├── stores/      # Svelte stores for settings, history, and rates
│   │   ├── clipboard.ts # Safe fallback clipboard copy (+ copyWithToast)
│   │   ├── format.ts    # Number formatting (auto/decimal/indian/scientific/engineering)
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
- Built with `vite` and `@sveltejs/kit` (adapter-static); Bun is the runtime/package manager.
- Run `bun run dev` to start the dev server (`bun run test` / `check` / `build`).
- `mathjs` is lazy-loaded for smart-bar expressions only; the grid and date math need no dependencies.

## Critical Information
- Currency conversion relies on stored exchange rates loaded on mount.
- All 160+ currency rates returned from API are injected into mathjs; conflicting names (like CUP) are registered as uppercase-only.
- Date logic (arithmetic, differences, weekdays, timezone conversion, Unix-epoch ↔ calendar) is vanilla JS — no moment/date-fns. The smart bar (engine.ts) and the graphical Date tab (DatePanel.svelte) share one helper, `lib/date/datemath.ts`, so they can't drift. Timezone offsets come from `Intl.DateTimeFormat`; epoch and calendar fields round-trip in UTC.

## Insights
- `loadEngine` and `loadRates` run asynchronously and in parallel, and don't block the first paint.

## Blunders
- Hallucinated `setInterval` polling leak and mathjs `h` parsing conflict in initial audit draft. Rectified by testing behavior directly in node/bun run times before finalizing plans.
