# Almanac Converter v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Almanac Converter v1 — a smart-bar unit converter + unit-aware calculator with a live-syncing unit grid, live currency, suggestions, history, copy, and shareable URLs (spec features 1–7).

**Architecture:** Pure-TS logic modules (`registry`, `format`, `parser`, `currency`) with zero framework deps power the grid instantly; a lazy-loaded mathjs `engine` powers smart-bar expressions. Svelte 5 components assemble them in a single SvelteKit page, statically prerendered.

**Tech Stack:** SvelteKit (adapter-static) + Vite + Bun + TypeScript, mathjs (lazy), Vitest (unit), Playwright (e2e). D2 "Almanac" light theme.

**Spec:** `docs/superpowers/specs/2026-07-18-almanac-converter-design.md`

---

## File structure

```
src/
  app.css                      # Almanac theme tokens + all component styles
  app.html                     # fonts, title
  lib/
    format.ts                  # significant-digit number formatting
    format.test.ts
    registry/
      types.ts                 # Unit/Category types
      data.ts                  # all categories + units (single source of truth)
      index.ts                 # convert(), findUnit(), searchUnits()
      registry.test.ts
    parser/
      parse.ts                 # normalize + classify queries; fast-path detection
      parse.test.ts
    engine/
      engine.ts                # lazy mathjs wrapper: loadEngine, evaluate, injectRates
      engine.test.ts
    currency/
      fallback.ts              # bundled rate snapshot
      currency.ts              # loadRates (fetch+cache), applyToRegistry
      currency.test.ts
    stores/
      persisted.ts             # localStorage-backed writable
      settings.ts              # active category (persisted)
      history.ts               # history store (max 50) + pure pushEntry
      history.test.ts
      toast.ts                 # toast message store
      rates.ts                 # rates info store (asOf/stale)
    components/
      SmartBar.svelte          # hero input + live eval + Enter-to-copy + ?q= sync
      ResultCard.svelte        # big result + sibling mini-conversions
      Suggestions.svelte       # interpretation preview + unit jump list
      CategoryNav.svelte       # grouped category tabs
      UnitGrid.svelte          # type-once-fill-all grid
      HistoryPanel.svelte
      Toast.svelte
  routes/
    +layout.ts                 # prerender = true
    +layout.svelte             # imports app.css, page chrome
    +page.svelte               # assembles everything
e2e/
  app.test.ts                  # Playwright flows
legacy/index.html              # the old app, kept for reference
```

---

### Task 1: Scaffold SvelteKit project with Bun + adapter-static + Vitest + Playwright

**Files:**
- Move: `index.html` → `legacy/index.html`
- Create: SvelteKit scaffold (whole project), `svelte.config.js`, `vite.config.ts`, `src/routes/+layout.ts`, `src/app.html`, `playwright.config.ts`

- [ ] **Step 1: Preserve the old app and scaffold**

```bash
cd /home/quantavil/Documents/Project/unit-convertor
mkdir -p legacy && git mv index.html legacy/index.html
bunx sv create scaffold --template minimal --types ts --no-add-ons --install bun
```

If the flags are rejected (CLI version drift), run `bunx sv create scaffold` interactively and choose: **minimal**, **TypeScript**, **no add-ons**, install with **bun**.

```bash
rm -rf scaffold/.git
cp -r scaffold/. .
rm -rf scaffold
```

- [ ] **Step 2: Add dependencies**

```bash
bun add mathjs
bun add -D @sveltejs/adapter-static vitest @playwright/test
bunx playwright install chromium
```

- [ ] **Step 3: Configure static adapter + prerender**

Replace `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter() }
};

export default config;
```

Create `src/routes/+layout.ts`:

```ts
export const prerender = true;
```

- [ ] **Step 4: Configure Vitest and scripts**

Replace `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```

In `package.json` scripts, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: { baseURL: 'http://localhost:4173' }
});
```

- [ ] **Step 5: Fonts + title in `src/app.html`**

Inside `<head>`, before `%sveltekit.head%`:

```html
<title>Almanac Converter</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
	href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600&display=swap"
	rel="stylesheet"
/>
```

- [ ] **Step 6: Verify build works**

Run: `bun run check && bun run build`
Expected: check passes (0 errors), build completes producing `build/` directory.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit + Bun + adapter-static + Vitest + Playwright"
```

---

### Task 2: Number formatting (`format.ts`)

Significant digits (default 6), exponential fallback for extreme magnitudes, `—` for non-finite. This is the only formatter in the app — the grid, result card, and engine display all use it.

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/format.test.ts
import { describe, expect, it } from 'vitest';
import { formatSigFigs } from './format';

describe('formatSigFigs', () => {
	it('formats to 6 significant digits by default', () => {
		expect(formatSigFigs(7.456454306)).toBe('7.45645');
		expect(formatSigFigs(16.40419948)).toBe('16.4042');
	});
	it('never renders a misleading zero for small values', () => {
		expect(formatSigFigs(0.0004)).toBe('0.0004');
		expect(formatSigFigs(0.000621371)).toBe('0.000621371');
	});
	it('strips trailing zeros', () => {
		expect(formatSigFigs(500)).toBe('500');
		expect(formatSigFigs(1.5)).toBe('1.5');
	});
	it('falls back to exponential for extreme magnitudes', () => {
		expect(formatSigFigs(1.23456789e13)).toBe('1.2346e+13');
		expect(formatSigFigs(0.0000001234)).toBe('1.2340e-7');
	});
	it('handles zero and non-finite', () => {
		expect(formatSigFigs(0)).toBe('0');
		expect(formatSigFigs(Infinity)).toBe('—');
		expect(formatSigFigs(NaN)).toBe('—');
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Implement**

```ts
// src/lib/format.ts
/** Format a number to `sig` significant digits; exponential fallback outside 1e-6..1e12. */
export function formatSigFigs(n: number, sig = 6): string {
	if (!Number.isFinite(n)) return '—';
	if (n === 0) return '0';
	const abs = Math.abs(n);
	if (abs >= 1e12 || abs < 1e-6) return n.toExponential(4);
	return String(parseFloat(n.toPrecision(sig)));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/format.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: significant-digit number formatting"
```

---

### Task 3: Unit registry (types, data, convert, search)

The dependency-free source of truth. Linear units store a `toBase` factor (value × factor = base units); non-linear units (temperature, fuel economy) store functions. Powers the grid without mathjs.

**Files:**
- Create: `src/lib/registry/types.ts`, `src/lib/registry/data.ts`, `src/lib/registry/index.ts`
- Test: `src/lib/registry/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/registry/registry.test.ts
import { describe, expect, it } from 'vitest';
import { categories, convert, findUnit, searchUnits } from './index';

const close = (a: number, b: number, eps = 1e-6) =>
	expect(Math.abs(a - b) / Math.max(Math.abs(b), 1)).toBeLessThan(eps);

describe('registry golden values', () => {
	it('1 mile = 1609.344 m', () => close(convert(1, 'length', 'mi', 'm'), 1609.344));
	it('100 °C = 212 °F', () => close(convert(100, 'temperature', 'c', 'f'), 212));
	it('1 bigha = 2529.28 m²', () => close(convert(1, 'area', 'bigha', 'm2'), 2529.28));
	it('1 tola = 11.6638 g', () => close(convert(1, 'mass', 'tola', 'g'), 11.6638));
	it('10 L/100km ≈ 23.5215 MPG (reciprocal)', () =>
		close(convert(10, 'fuelEconomy', 'l100km', 'mpg'), 23.5214583, 1e-4));
	it('1 KiB = 1024 B but 1 kB = 1000 B', () => {
		close(convert(1, 'digital', 'kib', 'b'), 1024);
		close(convert(1, 'digital', 'kb', 'b'), 1000);
	});
});

describe('round-trips', () => {
	it('every linear unit round-trips through its base', () => {
		for (const cat of Object.values(categories)) {
			for (const u of cat.units) {
				close(convert(convert(7.3, cat.id, u.id, cat.units[0].id), cat.id, cat.units[0].id, u.id), 7.3, 1e-9);
			}
		}
	});
});

describe('fuel economy zero guard', () => {
	it('0 mpg converts to NaN, not Infinity crash', () => {
		expect(Number.isFinite(convert(0, 'fuelEconomy', 'mpg', 'l100km'))).toBe(false);
	});
});

describe('lookup', () => {
	it('findUnit resolves aliases case-insensitively', () => {
		expect(findUnit('KM')?.unit.id).toBe('km');
		expect(findUnit('kilometre')?.unit.id).toBe('km');
		expect(findUnit('bogus')).toBeNull();
	});
	it('searchUnits returns ranked matches', () => {
		const r = searchUnits('mile');
		expect(r.length).toBeGreaterThan(0);
		expect(r[0].unit.id).toBe('mi');
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/registry`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement types**

```ts
// src/lib/registry/types.ts
export interface Unit {
	id: string;
	name: string;
	symbol: string;
	aliases: string[];
	/** number: multiply value by this to get base units. functions: non-linear. */
	toBase: number | ((v: number) => number);
	fromBase?: (v: number) => number; // required when toBase is a function
}

export interface Category {
	id: string;
	label: string;
	group: 'Common' | 'Science' | 'Digital' | 'Regional-heavy';
	/** true = engine must not send these to mathjs (reciprocal/currency handled locally) */
	registryOnly?: boolean;
	units: Unit[];
}
```

- [ ] **Step 4: Implement data**

```ts
// src/lib/registry/data.ts
import type { Category } from './types';

const u = (
	id: string,
	name: string,
	symbol: string,
	toBase: number,
	aliases: string[] = []
) => ({ id, name, symbol, toBase, aliases });

export const categoryList: Category[] = [
	{
		id: 'length', label: 'Length', group: 'Common',
		units: [
			u('m', 'Meter', 'm', 1, ['meters', 'metre', 'metres']),
			u('km', 'Kilometer', 'km', 1000, ['kilometers', 'kilometre', 'kms']),
			u('cm', 'Centimeter', 'cm', 0.01, ['centimeters', 'centimetre']),
			u('mm', 'Millimeter', 'mm', 0.001, ['millimeters', 'millimetre']),
			u('mi', 'Mile', 'mi', 1609.344, ['miles', 'mile']),
			u('yd', 'Yard', 'yd', 0.9144, ['yards', 'yard']),
			u('ft', 'Foot', 'ft', 0.3048, ['feet', 'foot']),
			u('inch', 'Inch', 'in', 0.0254, ['inches', 'in']),
			u('nmi', 'Nautical mile', 'nmi', 1852, ['nauticalmile']),
			u('gaj', 'Gaj', 'gaj', 0.9144, []),
			u('hath', 'Hath', 'hath', 0.4572, [])
		]
	},
	{
		id: 'area', label: 'Area', group: 'Regional-heavy',
		units: [
			u('m2', 'Square meter', 'm²', 1, ['sqm', 'm^2', 'sq m']),
			u('km2', 'Square kilometer', 'km²', 1e6, ['sqkm', 'km^2']),
			u('ft2', 'Square foot', 'ft²', 0.09290304, ['sqft', 'ft^2', 'sq ft']),
			u('gajsq', 'Gaj (sq yd)', 'gaj²', 0.83612736, ['sqyd', 'yd^2', 'sqgaj']),
			u('acre', 'Acre', 'ac', 4046.8564224, ['acres']),
			u('hectare', 'Hectare', 'ha', 10000, ['hectares', 'ha']),
			u('bigha', 'Bigha', 'bigha', 2529.28, []),
			u('biswa', 'Biswa', 'biswa', 126.464, []),
			u('kanal', 'Kanal', 'kanal', 505.857, []),
			u('marla', 'Marla', 'marla', 25.29285264, []),
			u('guntha', 'Guntha', 'guntha', 101.17, []),
			u('ground', 'Ground', 'ground', 222.967296, []),
			u('cent', 'Cent', 'cent', 40.468564224, [])
		]
	},
	{
		id: 'mass', label: 'Mass', group: 'Common',
		units: [
			u('kg', 'Kilogram', 'kg', 1, ['kilograms', 'kgs', 'kilo']),
			u('g', 'Gram', 'g', 0.001, ['grams', 'gram']),
			u('mg', 'Milligram', 'mg', 1e-6, ['milligrams']),
			u('tonne', 'Metric ton', 't', 1000, ['ton', 'tons', 'tonnes']),
			u('lb', 'Pound', 'lb', 0.45359237, ['pounds', 'lbs', 'pound']),
			u('oz', 'Ounce', 'oz', 0.028349523125, ['ounces', 'ounce']),
			u('carat', 'Carat', 'ct', 0.0002, ['carats']),
			u('tola', 'Tola', 'tola', 0.0116638, ['tolas']),
			u('maund', 'Maund', 'maund', 37.3242, [])
		]
	},
	{
		id: 'temperature', label: 'Temperature', group: 'Common',
		units: [
			{ id: 'c', name: 'Celsius', symbol: '°C', aliases: ['celsius', 'degc', '°c'],
				toBase: (v) => v + 273.15, fromBase: (v) => v - 273.15 },
			{ id: 'f', name: 'Fahrenheit', symbol: '°F', aliases: ['fahrenheit', 'degf', '°f'],
				toBase: (v) => ((v - 32) * 5) / 9 + 273.15, fromBase: (v) => ((v - 273.15) * 9) / 5 + 32 },
			{ id: 'k', name: 'Kelvin', symbol: 'K', aliases: ['kelvin'],
				toBase: (v) => v, fromBase: (v) => v },
			{ id: 'r', name: 'Rankine', symbol: '°R', aliases: ['rankine'],
				toBase: (v) => (v * 5) / 9, fromBase: (v) => (v * 9) / 5 }
		]
	},
	{
		id: 'volume', label: 'Volume', group: 'Common',
		units: [
			u('l', 'Liter', 'L', 1, ['liters', 'litre', 'litres']),
			u('ml', 'Milliliter', 'mL', 0.001, ['milliliters', 'millilitre']),
			u('m3', 'Cubic meter', 'm³', 1000, ['m^3', 'cbm']),
			u('gal', 'Gallon (US)', 'gal', 3.785411784, ['gallon', 'gallons']),
			u('qt', 'Quart (US)', 'qt', 0.946352946, ['quart', 'quarts']),
			u('pt', 'Pint (US)', 'pt', 0.473176473, ['pint', 'pints']),
			u('floz', 'Fluid ounce', 'fl oz', 0.0295735295625, ['floz', 'fluidounce']),
			u('cup', 'Cup (US)', 'cup', 0.2365882365, ['cups'])
		]
	},
	{
		id: 'time', label: 'Time', group: 'Common',
		units: [
			u('s', 'Second', 's', 1, ['seconds', 'sec', 'secs']),
			u('min', 'Minute', 'min', 60, ['minutes', 'mins']),
			u('hr', 'Hour', 'h', 3600, ['hours', 'hrs', 'h']),
			u('day', 'Day', 'd', 86400, ['days']),
			u('week', 'Week', 'wk', 604800, ['weeks']),
			u('year', 'Year', 'yr', 31556952, ['years', 'yrs'])
		]
	},
	{
		id: 'digital', label: 'Digital storage', group: 'Digital',
		units: [
			u('bit', 'Bit', 'bit', 0.125, ['bits']),
			u('b', 'Byte', 'B', 1, ['bytes']),
			u('kb', 'Kilobyte (1000)', 'kB', 1e3, ['kilobyte', 'kilobytes']),
			u('mb', 'Megabyte (1000²)', 'MB', 1e6, ['megabyte', 'megabytes']),
			u('gb', 'Gigabyte (1000³)', 'GB', 1e9, ['gigabyte', 'gigabytes']),
			u('tb', 'Terabyte (1000⁴)', 'TB', 1e12, ['terabyte', 'terabytes']),
			u('kib', 'Kibibyte (1024)', 'KiB', 1024, ['kibibyte']),
			u('mib', 'Mebibyte (1024²)', 'MiB', 1048576, ['mebibyte']),
			u('gib', 'Gibibyte (1024³)', 'GiB', 1073741824, ['gibibyte']),
			u('tib', 'Tebibyte (1024⁴)', 'TiB', 1099511627776, ['tebibyte'])
		]
	},
	{
		id: 'speed', label: 'Speed', group: 'Common',
		units: [
			u('ms', 'Meter/second', 'm/s', 1, ['m/s', 'mps']),
			u('kmh', 'Kilometer/hour', 'km/h', 0.2777777777777778, ['km/h', 'kmph', 'kph']),
			u('mph', 'Mile/hour', 'mph', 0.44704, ['mi/h']),
			u('knot', 'Knot', 'kn', 0.5144444444444445, ['knots', 'kt']),
			u('fts', 'Foot/second', 'ft/s', 0.3048, ['ft/s', 'fps'])
		]
	},
	{
		id: 'pressure', label: 'Pressure', group: 'Science',
		units: [
			u('pa', 'Pascal', 'Pa', 1, ['pascal', 'pascals']),
			u('kpa', 'Kilopascal', 'kPa', 1000, ['kilopascal']),
			u('bar', 'Bar', 'bar', 1e5, ['bars']),
			u('psi', 'PSI', 'psi', 6894.757293168, []),
			u('atm', 'Atmosphere', 'atm', 101325, ['atmosphere', 'atmospheres']),
			u('mmhg', 'mmHg', 'mmHg', 133.322387415, ['torr'])
		]
	},
	{
		id: 'energy', label: 'Energy', group: 'Science',
		units: [
			u('j', 'Joule', 'J', 1, ['joules', 'joule']),
			u('kj', 'Kilojoule', 'kJ', 1000, ['kilojoules']),
			u('cal', 'Calorie', 'cal', 4.184, ['calories', 'calorie']),
			u('kcal', 'Kilocalorie', 'kcal', 4184, ['kilocalories', 'kcals']),
			u('wh', 'Watt-hour', 'Wh', 3600, ['watthour']),
			u('kwh', 'Kilowatt-hour', 'kWh', 3.6e6, ['kilowatthour', 'unit']),
			u('btu', 'BTU', 'BTU', 1055.05585262, ['btus'])
		]
	},
	{
		id: 'power', label: 'Power', group: 'Science',
		units: [
			u('w', 'Watt', 'W', 1, ['watts', 'watt']),
			u('kw', 'Kilowatt', 'kW', 1000, ['kilowatts', 'kilowatt']),
			u('mw', 'Megawatt', 'MW', 1e6, ['megawatts']),
			u('hp', 'Horsepower', 'hp', 745.69987158227, ['horsepower'])
		]
	},
	{
		id: 'frequency', label: 'Frequency', group: 'Science',
		units: [
			u('hz', 'Hertz', 'Hz', 1, ['hertz']),
			u('khz', 'Kilohertz', 'kHz', 1e3, ['kilohertz']),
			u('mhz', 'Megahertz', 'MHz', 1e6, ['megahertz']),
			u('ghz', 'Gigahertz', 'GHz', 1e9, ['gigahertz'])
		]
	},
	{
		id: 'angle', label: 'Angle', group: 'Science',
		units: [
			u('deg', 'Degree', '°', 1, ['degrees', 'degree']),
			u('rad', 'Radian', 'rad', 57.29577951308232, ['radians', 'radian']),
			u('grad', 'Gradian', 'gon', 0.9, ['gradians', 'gon']),
			u('arcmin', 'Arcminute', '′', 1 / 60, ['arcminutes']),
			u('arcsec', 'Arcsecond', '″', 1 / 3600, ['arcseconds'])
		]
	},
	{
		id: 'dataRate', label: 'Data rate', group: 'Digital',
		units: [
			u('bps', 'Bit/second', 'bit/s', 1, ['bit/s']),
			u('kbps', 'Kilobit/s', 'kbit/s', 1e3, ['kbit/s']),
			u('mbps', 'Megabit/s', 'Mbit/s', 1e6, ['mbit/s']),
			u('gbps', 'Gigabit/s', 'Gbit/s', 1e9, ['gbit/s']),
			u('mbyps', 'Megabyte/s', 'MB/s', 8e6, ['mb/s'])
		]
	},
	{
		id: 'fuelEconomy', label: 'Fuel economy', group: 'Common', registryOnly: true,
		units: [
			{ id: 'l100km', name: 'L/100km', symbol: 'L/100km', aliases: ['l/100km'],
				toBase: (v) => v, fromBase: (v) => v },
			{ id: 'mpg', name: 'MPG (US)', symbol: 'mpg', aliases: ['mpgus'],
				toBase: (v) => 235.214583 / v, fromBase: (v) => 235.214583 / v },
			{ id: 'kml', name: 'km/L', symbol: 'km/L', aliases: ['km/l', 'kmpl'],
				toBase: (v) => 100 / v, fromBase: (v) => 100 / v }
		]
	},
	{
		id: 'currency', label: 'Currency', group: 'Common', registryOnly: true,
		// toBase = USD per unit; mutated at runtime by currency/applyToRegistry
		units: [
			u('usd', 'US Dollar', 'USD', 1, ['$', 'dollar', 'dollars']),
			u('inr', 'Indian Rupee', 'INR', 1 / 83, ['₹', 'rupee', 'rupees', 'rs']),
			u('eur', 'Euro', 'EUR', 1 / 0.92, ['€', 'euro', 'euros']),
			u('gbp', 'British Pound', 'GBP', 1 / 0.79, ['£', 'pound sterling']),
			u('jpy', 'Japanese Yen', 'JPY', 1 / 150, ['¥', 'yen']),
			u('aed', 'UAE Dirham', 'AED', 1 / 3.6725, ['dirham']),
			u('cad', 'Canadian Dollar', 'CAD', 1 / 1.35, []),
			u('aud', 'Australian Dollar', 'AUD', 1 / 1.52, []),
			u('cny', 'Chinese Yuan', 'CNY', 1 / 7.2, ['yuan', 'rmb']),
			u('chf', 'Swiss Franc', 'CHF', 1 / 0.88, ['franc']),
			u('sgd', 'Singapore Dollar', 'SGD', 1 / 1.34, [])
		]
	}
];
```

- [ ] **Step 5: Implement the API**

```ts
// src/lib/registry/index.ts
import { categoryList } from './data';
import type { Category, Unit } from './types';

export const categories: Record<string, Category> = Object.fromEntries(
	categoryList.map((c) => [c.id, c])
);
export { categoryList };
export type { Category, Unit };

function toBase(u: Unit, v: number): number {
	return typeof u.toBase === 'number' ? v * u.toBase : u.toBase(v);
}
function fromBase(u: Unit, v: number): number {
	return typeof u.toBase === 'number' ? v / u.toBase : u.fromBase!(v);
}

export function convert(value: number, categoryId: string, fromId: string, toId: string): number {
	const cat = categories[categoryId];
	const from = cat.units.find((x) => x.id === fromId)!;
	const to = cat.units.find((x) => x.id === toId)!;
	return fromBase(to, toBase(from, value));
}

export interface UnitRef { category: Category; unit: Unit }

/** Exact match on id, symbol, name, or alias — case-insensitive. */
export function findUnit(token: string): UnitRef | null {
	const q = token.trim().toLowerCase();
	if (!q) return null;
	for (const category of categoryList) {
		for (const unit of category.units) {
			if (
				unit.id === q ||
				unit.symbol.toLowerCase() === q ||
				unit.name.toLowerCase() === q ||
				unit.aliases.some((a) => a.toLowerCase() === q)
			)
				return { category, unit };
		}
	}
	return null;
}

/** Ranked substring search over names/symbols/aliases for the suggestions dropdown. */
export function searchUnits(query: string, limit = 6): UnitRef[] {
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];
	const scored: { ref: UnitRef; score: number }[] = [];
	for (const category of categoryList) {
		for (const unit of category.units) {
			const hay = [unit.name, unit.symbol, unit.id, ...unit.aliases].map((s) => s.toLowerCase());
			let score = 0;
			if (hay.some((h) => h === q)) score = 3;
			else if (hay.some((h) => h.startsWith(q))) score = 2;
			else if (hay.some((h) => h.includes(q))) score = 1;
			if (score) scored.push({ ref: { category, unit }, score });
		}
	}
	return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.ref);
}
```

- [ ] **Step 6: Run to verify pass**

Run: `bun run test src/lib/registry`
Expected: PASS (all tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/registry/
git commit -m "feat: dependency-free unit registry with regional units and golden tests"
```

---

### Task 4: Query parser

Normalizes natural language and classifies input. Key rule: the **last** `to`/`in`/`as` whose right side is unit-ish splits a conversion; otherwise `in` means inches. Detects the registry fast path (`<number> <unit> to <unit>`, same category).

**Files:**
- Create: `src/lib/parser/parse.ts`
- Test: `src/lib/parser/parse.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/parser/parse.test.ts
import { describe, expect, it } from 'vitest';
import { parse } from './parse';

describe('classification', () => {
	it('empty', () => expect(parse('  ').kind).toBe('empty'));
	it('plain number', () => expect(parse('42.5')).toEqual({ kind: 'number', value: 42.5 }));
	it('plain arithmetic is an expression', () =>
		expect(parse('1250 * 1.08')).toEqual({ kind: 'expression', expr: '1250 * 1.08' }));
	it('bare unit name is a lookup', () => {
		const p = parse('mile');
		expect(p.kind).toBe('lookup');
	});
});

describe('conversion splitting', () => {
	it('splits on to', () => {
		const p = parse('12 km to mi');
		expect(p).toMatchObject({ kind: 'convert', expr: '12 km', target: 'mi' });
	});
	it('treats in as keyword when followed by a unit', () => {
		expect(parse('12 km in mi')).toMatchObject({ kind: 'convert', expr: '12 km', target: 'mi' });
	});
	it('treats in as inches when not followed by a unit', () => {
		expect(parse('5 in to cm')).toMatchObject({ kind: 'convert', expr: '5 in', target: 'cm' });
	});
	it('splits at the LAST keyword: 5 in in cm', () => {
		expect(parse('5 in in cm')).toMatchObject({ kind: 'convert', expr: '5 in', target: 'cm' });
	});
	it('normalizes arrow', () => {
		expect(parse('12 km → mi')).toMatchObject({ kind: 'convert', expr: '12 km', target: 'mi' });
	});
	it('unit math stays in expr', () => {
		expect(parse('3 ft + 12 in in cm')).toMatchObject({
			kind: 'convert', expr: '3 ft + 12 in', target: 'cm'
		});
	});
});

describe('fast path', () => {
	it('simple same-category conversion gets fast info', () => {
		const p = parse('12 km to mi');
		expect(p.kind).toBe('convert');
		if (p.kind === 'convert')
			expect(p.fast).toEqual({ value: 12, categoryId: 'length', fromId: 'km', toId: 'mi' });
	});
	it('registryOnly categories always resolve fast (fuel economy)', () => {
		const p = parse('10 l/100km to mpg');
		if (p.kind === 'convert')
			expect(p.fast).toEqual({ value: 10, categoryId: 'fuelEconomy', fromId: 'l100km', toId: 'mpg' });
	});
	it('currency resolves fast', () => {
		const p = parse('100 usd to inr');
		if (p.kind === 'convert')
			expect(p.fast).toMatchObject({ categoryId: 'currency', fromId: 'usd', toId: 'inr' });
	});
	it('expression conversions have no fast path', () => {
		const p = parse('3 ft + 12 in in cm');
		if (p.kind === 'convert') expect(p.fast).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/parser`
Expected: FAIL — cannot resolve `./parse`.

- [ ] **Step 3: Implement**

```ts
// src/lib/parser/parse.ts
import { findUnit, searchUnits, type UnitRef } from '../registry';

export interface FastConvert {
	value: number;
	categoryId: string;
	fromId: string;
	toId: string;
}

export type Parsed =
	| { kind: 'empty' }
	| { kind: 'number'; value: number }
	| { kind: 'lookup'; query: string; matches: UnitRef[] }
	| { kind: 'convert'; expr: string; target: string; fast?: FastConvert }
	| { kind: 'expression'; expr: string };

const NUMBER_RE = /^-?[\d,]*\.?\d+(e-?\d+)?$/i;
const ARITH_RE = /^[\d\s.,+\-*/^()eE%]+$/;
/** unit-ish: a token that is a known unit alias, or looks like a unit expression (m^2, km/h) */
function isUnitish(s: string): boolean {
	if (findUnit(s)) return true;
	return /^[a-z°µ$€£₹][a-z0-9^/°µ]*(\s*\/\s*[a-z0-9^]+)?$/i.test(s);
}

export function parse(raw: string): Parsed {
	let q = raw.trim().replace(/\s+/g, ' ').replace(/→/g, ' to ');
	q = q.replace(/\s+/g, ' ').trim();
	if (!q) return { kind: 'empty' };

	if (NUMBER_RE.test(q)) return { kind: 'number', value: parseFloat(q.replace(/,/g, '')) };

	// find LAST occurrence of a conversion keyword with a unit-ish RHS
	const kw = /\s(to|in|as)\s/gi;
	let match: RegExpExecArray | null;
	let split: { index: number; length: number } | null = null;
	while ((match = kw.exec(q))) {
		const rhs = q.slice(match.index + match[0].length).trim();
		if (rhs && isUnitish(rhs)) split = { index: match.index, length: match[0].length };
	}

	if (split) {
		const expr = q.slice(0, split.index).trim();
		const target = q.slice(split.index + split.length).trim();
		const fast = detectFast(expr, target);
		return { kind: 'convert', expr, target, ...(fast ? { fast } : {}) };
	}

	if (ARITH_RE.test(q)) return { kind: 'expression', expr: q };

	const exact = findUnit(q);
	const matches = exact ? [exact, ...searchUnits(q).filter((m) => m.unit !== exact.unit)] : searchUnits(q);
	if (matches.length && !/\d/.test(q)) return { kind: 'lookup', query: q, matches };

	return { kind: 'expression', expr: q };
}

function detectFast(expr: string, target: string): FastConvert | undefined {
	const m = expr.match(/^(-?[\d,]*\.?\d+)\s*(.+)$/);
	if (!m) return undefined;
	const from = findUnit(m[2]);
	const to = findUnit(target);
	if (!from || !to) return undefined;
	if (from.category.id !== to.category.id) return undefined;
	return {
		value: parseFloat(m[1].replace(/,/g, '')),
		categoryId: from.category.id,
		fromId: from.unit.id,
		toId: to.unit.id
	};
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/parser`
Expected: PASS. If `5 in in cm` fails, check that the keyword regex uses `gi` and the loop keeps the *last* valid split.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parser/
git commit -m "feat: query parser with to/in disambiguation and fast-path detection"
```

---

### Task 5: Engine (lazy mathjs wrapper)

Wraps mathjs: registers regional units + currency, evaluates parsed queries, returns typed results/errors. Fast paths (registry conversions) are handled here too so the UI has a single entry point.

**Files:**
- Create: `src/lib/engine/engine.ts`
- Test: `src/lib/engine/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/engine/engine.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateParsed, injectRates, loadEngine } from './engine';
import { parse } from '../parser/parse';

beforeAll(async () => {
	await loadEngine();
	injectRates({ INR: 83, EUR: 0.92 });
});

const run = (q: string) => evaluateParsed(parse(q));

describe('conversions', () => {
	it('12 km to mi', async () => {
		const r = await run('12 km to mi');
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value).toBe('7.45645');
			expect(r.unit).toBe('mi');
		}
	});
	it('unit math: 3 ft + 12 in in cm = 121.92 cm', async () => {
		const r = await run('3 ft + 12 in in cm');
		if (r.ok) expect(r.value).toBe('121.92');
		expect(r.ok).toBe(true);
	});
	it('regional: 1 bigha to m^2', async () => {
		const r = await run('1 bigha to m^2');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(2529.28, 1);
	});
	it('currency: 100 usd to inr = 8300', async () => {
		const r = await run('100 usd to inr');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(8300, 0);
	});
	it('fuel economy reciprocal via registry: 10 l/100km to mpg', async () => {
		const r = await run('10 l/100km to mpg');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(23.5215, 3);
	});
});

describe('plain math', () => {
	it('1250 * 1.08', async () => {
		const r = await run('1250 * 1.08');
		if (r.ok) expect(r.value).toBe('1350');
	});
});

describe('errors are typed and friendly', () => {
	it('unknown unit', async () => {
		const r = await run('12 kmm to mi');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/unknown|undefined/i);
	});
	it('dimension mismatch', async () => {
		const r = await run('12 km to kg');
		expect(r.ok).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/engine`
Expected: FAIL — cannot resolve `./engine`.

- [ ] **Step 3: Implement**

```ts
// src/lib/engine/engine.ts
import { categories, convert, findUnit } from '../registry';
import { formatSigFigs } from '../format';
import type { Parsed } from '../parser/parse';

export type EvalResult =
	| { ok: true; value: string; unit: string; fast?: { categoryId: string; toId: string; raw: number } }
	| { ok: false; error: string };

// mathjs is heavy — loaded lazily, cached.
let math: typeof import('mathjs') | null = null;
let loading: Promise<void> | null = null;

const REGIONAL_UNITS: [string, string][] = [
	['gaj', '0.9144 m'],
	['hath', '0.4572 m'],
	['bigha', '2529.28 m^2'],
	['biswa', '126.464 m^2'],
	['kanal', '505.857 m^2'],
	['marla', '25.29285264 m^2'],
	['guntha', '101.17 m^2'],
	['tola', '11.6638 g'],
	['maund', '37.3242 kg']
];

export function loadEngine(): Promise<void> {
	if (!loading) {
		loading = import('mathjs').then((m) => {
			math = m;
			for (const [name, def] of REGIONAL_UNITS) {
				m.createUnit(name, def, { override: true });
			}
			m.createUnit('USD', { aliases: ['usd'] });
		});
	}
	return loading;
}

/** rates: currency code -> units per USD. Also updates the registry factors. */
export function injectRates(rates: Record<string, number>): void {
	if (!math) throw new Error('engine not loaded');
	for (const [code, perUsd] of Object.entries(rates)) {
		if (code === 'USD' || !perUsd) continue;
		math.createUnit(code, {
			definition: `${1 / perUsd} USD`,
			aliases: [code.toLowerCase()],
			override: true
		});
	}
	// keep the grid's registry in sync
	for (const unit of categories.currency.units) {
		const r = rates[unit.symbol];
		if (r) unit.toBase = 1 / r;
	}
}

export async function evaluateParsed(parsed: Parsed): Promise<EvalResult> {
	if (parsed.kind === 'empty' || parsed.kind === 'lookup')
		return { ok: false, error: '' };
	if (parsed.kind === 'number')
		return { ok: true, value: formatSigFigs(parsed.value), unit: '' };

	// registry fast path — instant, no mathjs needed
	if (parsed.kind === 'convert' && parsed.fast) {
		const { value, categoryId, fromId, toId } = parsed.fast;
		const raw = convert(value, categoryId, fromId, toId);
		const to = categories[categoryId].units.find((x) => x.id === toId)!;
		if (!Number.isFinite(raw)) return { ok: false, error: 'Undefined for this value' };
		return { ok: true, value: formatSigFigs(raw), unit: to.symbol, fast: { categoryId, toId, raw } };
	}

	// registryOnly targets can't go to mathjs
	if (parsed.kind === 'convert') {
		const target = findUnit(parsed.target);
		if (target?.category.registryOnly && !parsed.fast)
			return { ok: false, error: `Can't use ${target.unit.symbol} in expressions yet` };
	}

	await loadEngine();
	const expr = parsed.kind === 'convert' ? `(${parsed.expr}) to (${parsed.target})` : parsed.expr;
	try {
		const r = math!.evaluate(normalizeForMath(expr));
		if (typeof r === 'number') return { ok: true, value: formatSigFigs(r), unit: '' };
		const formatted: string = math!.format(r, { precision: 6 });
		const sp = formatted.indexOf(' ');
		return sp === -1
			? { ok: true, value: formatted, unit: '' }
			: { ok: true, value: formatted.slice(0, sp), unit: formatted.slice(sp + 1) };
	} catch (e) {
		return { ok: false, error: friendly((e as Error).message) };
	}
}

/** mathjs quirks: it knows 'in' as inch and most symbols; map a few common aliases. */
function normalizeForMath(expr: string): string {
	return expr
		.replace(/\bkmph\b/gi, 'km/h')
		.replace(/\bmph\b/gi, 'mi/h')
		.replace(/°c\b/gi, 'degC')
		.replace(/°f\b/gi, 'degF')
		.replace(/\bcelsius\b/gi, 'degC')
		.replace(/\bfahrenheit\b/gi, 'degF');
}

function friendly(msg: string): string {
	const sym = msg.match(/Undefined symbol (\w+)/);
	if (sym) return `Unknown unit or symbol: ${sym[1]}`;
	if (/Units do not match/i.test(msg)) return `Can't convert between those dimensions`;
	if (/Unexpected/i.test(msg)) return 'Incomplete expression';
	return msg;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/engine`
Expected: PASS. Known trap: if `12 km to mi` returns via mathjs instead of the fast path, the parser's `detectFast` isn't matching — fix there, not here.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/
git commit -m "feat: lazy mathjs engine with regional units, currency injection, typed errors"
```

---

### Task 6: Currency module

Fetch keyless rates, cache with timestamp, bundled fallback, apply to registry + engine. All I/O injected for testability.

**Files:**
- Create: `src/lib/currency/fallback.ts`, `src/lib/currency/currency.ts`
- Test: `src/lib/currency/currency.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/currency/currency.test.ts
import { describe, expect, it } from 'vitest';
import { loadRates } from './currency';
import { FALLBACK_RATES } from './fallback';

const memStorage = () => {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, v)
	};
};

const okFetch = (rates: Record<string, number>) => async () =>
	new Response(JSON.stringify({ result: 'success', rates, time_last_update_utc: 'Fri, 18 Jul 2026' }));

const failFetch = async () => {
	throw new Error('offline');
};

describe('loadRates', () => {
	it('fetches, caches, and reports fresh', async () => {
		const storage = memStorage();
		const r = await loadRates(storage, okFetch({ USD: 1, INR: 84.5 }));
		expect(r.stale).toBe(false);
		expect(r.rates.INR).toBe(84.5);
		expect(storage.getItem('almanac.rates.v1')).toContain('84.5');
	});
	it('uses cache when fresh (no fetch)', async () => {
		const storage = memStorage();
		storage.setItem('almanac.rates.v1', JSON.stringify({ rates: { USD: 1, INR: 80 }, ts: Date.now(), asOf: 'x' }));
		const r = await loadRates(storage, failFetch);
		expect(r.rates.INR).toBe(80);
		expect(r.stale).toBe(false);
	});
	it('falls back to stale cache when fetch fails', async () => {
		const storage = memStorage();
		storage.setItem(
			'almanac.rates.v1',
			JSON.stringify({ rates: { USD: 1, INR: 80 }, ts: Date.now() - 48 * 3600e3, asOf: 'old' })
		);
		const r = await loadRates(storage, failFetch);
		expect(r.rates.INR).toBe(80);
		expect(r.stale).toBe(true);
	});
	it('falls back to bundled rates with empty cache + no network', async () => {
		const r = await loadRates(memStorage(), failFetch);
		expect(r.rates).toEqual(FALLBACK_RATES.rates);
		expect(r.stale).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/currency`
Expected: FAIL — cannot resolve `./currency`.

- [ ] **Step 3: Implement**

```ts
// src/lib/currency/fallback.ts
/** Bundled snapshot (units per USD), refreshed at build time when convenient. */
export const FALLBACK_RATES = {
	asOf: '2026-07-01 (bundled)',
	rates: {
		USD: 1, INR: 83, EUR: 0.92, GBP: 0.79, JPY: 150, AED: 3.6725,
		CAD: 1.35, AUD: 1.52, CNY: 7.2, CHF: 0.88, SGD: 1.34
	} as Record<string, number>
};
```

```ts
// src/lib/currency/currency.ts
import { FALLBACK_RATES } from './fallback';

const KEY = 'almanac.rates.v1';
const TTL_MS = 24 * 3600e3;
const API = 'https://open.er-api.com/v6/latest/USD';

interface StorageLike {
	getItem(k: string): string | null;
	setItem(k: string, v: string): void;
}

export interface RatesInfo {
	rates: Record<string, number>;
	asOf: string;
	stale: boolean;
}

export async function loadRates(
	storage: StorageLike,
	fetcher: typeof fetch = fetch
): Promise<RatesInfo> {
	let cached: { rates: Record<string, number>; ts: number; asOf: string } | null = null;
	try {
		const raw = storage.getItem(KEY);
		if (raw) cached = JSON.parse(raw);
	} catch {
		cached = null;
	}

	if (cached && Date.now() - cached.ts < TTL_MS)
		return { rates: cached.rates, asOf: cached.asOf, stale: false };

	try {
		const res = await fetcher(API);
		const data = await res.json();
		if (data?.result !== 'success' || !data.rates) throw new Error('bad payload');
		const asOf = data.time_last_update_utc ?? new Date().toUTCString();
		storage.setItem(KEY, JSON.stringify({ rates: data.rates, ts: Date.now(), asOf }));
		return { rates: data.rates, asOf, stale: false };
	} catch {
		if (cached) return { rates: cached.rates, asOf: cached.asOf, stale: true };
		return { rates: FALLBACK_RATES.rates, asOf: FALLBACK_RATES.asOf, stale: true };
	}
}
```

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/currency`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/currency/
git commit -m "feat: currency rates with cache, TTL, and bundled fallback"
```

---

### Task 7: Stores (persistence, history, toast, rates)

**Files:**
- Create: `src/lib/stores/persisted.ts`, `src/lib/stores/history.ts`, `src/lib/stores/toast.ts`, `src/lib/stores/rates.ts`
- Test: `src/lib/stores/history.test.ts`

- [ ] **Step 1: Write the failing test (history logic is the only branchy part)**

```ts
// src/lib/stores/history.test.ts
import { describe, expect, it } from 'vitest';
import { pushEntry, type HistoryEntry } from './history';

const e = (q: string): HistoryEntry => ({ query: q, result: 'r', ts: 1 });

describe('pushEntry', () => {
	it('prepends newest first', () => {
		const out = pushEntry([e('a')], e('b'));
		expect(out.map((x) => x.query)).toEqual(['b', 'a']);
	});
	it('dedupes consecutive identical queries', () => {
		const out = pushEntry([e('a')], e('a'));
		expect(out).toHaveLength(1);
	});
	it('caps at 50', () => {
		const list = Array.from({ length: 50 }, (_, i) => e(String(i)));
		const out = pushEntry(list, e('new'));
		expect(out).toHaveLength(50);
		expect(out[0].query).toBe('new');
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test src/lib/stores`
Expected: FAIL — cannot resolve `./history`.

- [ ] **Step 3: Implement all four stores**

```ts
// src/lib/stores/persisted.ts
import { writable, type Writable } from 'svelte/store';

const hasStorage = typeof localStorage !== 'undefined';

export function persisted<T>(key: string, initial: T): Writable<T> {
	let start = initial;
	if (hasStorage) {
		try {
			const raw = localStorage.getItem(key);
			if (raw !== null) start = JSON.parse(raw);
		} catch {
			/* corrupted value — use initial */
		}
	}
	const store = writable<T>(start);
	if (hasStorage) {
		store.subscribe((v) => {
			try {
				localStorage.setItem(key, JSON.stringify(v));
			} catch {
				/* storage full/blocked — non-fatal */
			}
		});
	}
	return store;
}
```

```ts
// src/lib/stores/history.ts
import { persisted } from './persisted';

export interface HistoryEntry {
	query: string;
	result: string;
	ts: number;
}

export function pushEntry(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
	if (list[0]?.query === entry.query) return list;
	return [entry, ...list].slice(0, 50);
}

export const history = persisted<HistoryEntry[]>('almanac.history.v1', []);

export function recordHistory(query: string, result: string): void {
	history.update((list) => pushEntry(list, { query, result, ts: Date.now() }));
}
```

```ts
// src/lib/stores/toast.ts
import { writable } from 'svelte/store';

export const toast = writable<string | null>(null);
let timer: ReturnType<typeof setTimeout>;

export function showToast(msg: string): void {
	toast.set(msg);
	clearTimeout(timer);
	timer = setTimeout(() => toast.set(null), 2000);
}
```

```ts
// src/lib/stores/rates.ts
import { writable } from 'svelte/store';
import type { RatesInfo } from '../currency/currency';

export const ratesInfo = writable<RatesInfo | null>(null);
```

```ts
// also: active category, persisted
// src/lib/stores/settings.ts  (add this file too)
import { persisted } from './persisted';
export const activeCategory = persisted<string>('almanac.category.v1', 'length');
```

**Files addendum:** also Create `src/lib/stores/settings.ts` (shown above).

- [ ] **Step 4: Run to verify pass**

Run: `bun run test src/lib/stores`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/
git commit -m "feat: persisted stores for history, category, toast, rates"
```

---

### Task 8: Almanac theme + app shell

The full D2 stylesheet and page chrome. No logic — verify visually.

**Files:**
- Create: `src/app.css`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Write the stylesheet**

```css
/* src/app.css — D2 Almanac */
:root {
	--paper: #f6f3e9;
	--panel: #fffdf6;
	--line: #d8d3c0;
	--ink: #2c3327;
	--ink-soft: #75705f;
	--rust: #8f3d24; /* darkened from mockup #a8492c for AA on panel */
	--sage: #5b6b4a;
	--serif: 'Source Serif 4', Georgia, serif;
	--sans: 'Inter', system-ui, -apple-system, sans-serif;
	--radius: 8px;
}

* { box-sizing: border-box; }

body {
	margin: 0;
	background: var(--paper);
	color: var(--ink);
	font-family: var(--sans);
	font-size: 15px;
	line-height: 1.5;
}

.shell { max-width: 1080px; margin: 0 auto; padding: 24px 20px 80px; }

.masthead { display: flex; align-items: baseline; justify-content: space-between; gap: 16px;
	border-bottom: 2px solid var(--ink); padding-bottom: 14px; margin-bottom: 22px; }
.masthead h1 { font-family: var(--serif); font-weight: 700; font-size: 28px; margin: 0; letter-spacing: -0.3px; }
.masthead .tagline { color: var(--ink-soft); font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
.rates-badge { font-size: 11px; color: var(--ink-soft); }
.rates-badge.stale { color: var(--rust); }

/* Smart bar */
.smartbar-wrap { position: sticky; top: 0; z-index: 50; background: var(--paper); padding: 8px 0 14px; }
.smartbar { width: 100%; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
	padding: 14px 16px; font: 500 17px var(--sans); color: var(--ink); outline: none; }
.smartbar:focus { border-color: var(--sage); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sage) 18%, transparent); }
.smartbar::placeholder { color: var(--ink-soft); opacity: 0.7; }

/* Result card */
.result-card { background: var(--panel); border: 1px solid var(--line); border-left: 5px solid var(--sage);
	border-radius: 6px; padding: 16px 18px; margin-top: 10px; cursor: copy; }
.result-card .big { font-family: var(--serif); font-weight: 600; font-size: 34px; line-height: 1.1;
	font-variant-numeric: lining-nums; }
.result-card .big .num { color: var(--rust); }
.result-card .hint { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--ink-soft); margin-top: 6px; }
.result-card .siblings { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.result-card .sib { background: var(--paper); border: 1px solid var(--line); border-radius: 4px;
	padding: 4px 10px; font-size: 12px; font-variant-numeric: tabular-nums; }
.result-error { color: var(--ink-soft); font-size: 13px; margin-top: 10px; padding-left: 4px; }

/* Suggestions */
.suggestions { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; margin-top: 8px; overflow: hidden; }
.suggestions button { display: flex; justify-content: space-between; width: 100%; padding: 10px 14px;
	background: none; border: 0; border-bottom: 1px solid var(--line); font: 400 14px var(--sans);
	color: var(--ink); cursor: pointer; text-align: left; }
.suggestions button:last-child { border-bottom: 0; }
.suggestions button:hover { background: var(--paper); }
.suggestions .cat { color: var(--ink-soft); font-size: 12px; }

/* Category nav */
.catnav { margin: 26px 0 14px; }
.catnav .group-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: var(--sage);
	margin: 10px 0 6px; font-weight: 600; }
.catnav .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.catnav button { background: var(--panel); border: 1px solid var(--line); border-radius: 4px;
	padding: 6px 12px; font: 500 13px var(--sans); color: var(--ink); cursor: pointer; }
.catnav button.active { background: var(--sage); border-color: var(--sage); color: var(--panel); }

/* Unit grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.cell { position: relative; display: block; background: var(--panel); border: 1px solid var(--line);
	border-radius: var(--radius); padding: 10px 12px; }
.cell.source { border-color: var(--rust); box-shadow: 0 0 0 2px color-mix(in srgb, var(--rust) 15%, transparent); }
.cell .cell-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
	color: var(--ink-soft); margin-bottom: 2px; }
.cell input { width: 100%; border: 0; outline: none; background: transparent; color: var(--ink);
	font: 600 19px var(--sans); font-variant-numeric: tabular-nums; padding: 2px 0; }
.cell .copy { position: absolute; top: 8px; right: 8px; background: none; border: 0; cursor: copy;
	color: var(--ink-soft); font-size: 13px; padding: 2px; }
.cell .copy:hover { color: var(--rust); }

/* History */
.history { margin-top: 34px; border-top: 1px solid var(--line); padding-top: 14px; }
.history h2 { font-family: var(--serif); font-size: 17px; margin: 0 0 10px; }
.history ul { list-style: none; margin: 0; padding: 0; }
.history li { display: flex; justify-content: space-between; gap: 12px; }
.history button.entry { flex: 1; display: flex; justify-content: space-between; gap: 12px; background: none;
	border: 0; border-bottom: 1px dashed var(--line); padding: 7px 2px; font: 400 13px var(--sans);
	color: var(--ink); cursor: pointer; text-align: left; }
.history button.entry:hover { color: var(--rust); }
.history .res { color: var(--ink-soft); font-variant-numeric: tabular-nums; }

/* Toast */
.toast { position: fixed; bottom: 22px; right: 22px; background: var(--ink); color: var(--paper);
	padding: 10px 18px; border-radius: 6px; font-size: 13px; z-index: 100; }
```

- [ ] **Step 2: Wire the layout**

Replace `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="shell">
	{@render children()}
</div>
```

- [ ] **Step 3: Verify**

Run: `bun run dev` and open the printed URL.
Expected: parchment background, no console errors. (Content arrives in Tasks 9–11.)

- [ ] **Step 4: Commit**

```bash
git add src/app.css src/routes/+layout.svelte
git commit -m "feat: Almanac (D2) theme stylesheet and app shell"
```

---

### Task 9: CategoryNav + UnitGrid + page assembly (grid works end-to-end)

**Files:**
- Create: `src/lib/components/CategoryNav.svelte`, `src/lib/components/UnitGrid.svelte`, `src/lib/components/Toast.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Toast component**

```svelte
<!-- src/lib/components/Toast.svelte -->
<script lang="ts">
	import { toast } from '$lib/stores/toast';
</script>

{#if $toast}
	<div class="toast" role="status">{$toast}</div>
{/if}
```

- [ ] **Step 2: CategoryNav**

```svelte
<!-- src/lib/components/CategoryNav.svelte -->
<script lang="ts">
	import { categoryList } from '$lib/registry';
	import { activeCategory } from '$lib/stores/settings';

	const groups = ['Common', 'Regional-heavy', 'Science', 'Digital'] as const;
	const labels: Record<string, string> = {
		Common: 'Everyday', 'Regional-heavy': 'Land & regional', Science: 'Science', Digital: 'Digital'
	};
</script>

<nav class="catnav" aria-label="Unit categories">
	{#each groups as g}
		{@const cats = categoryList.filter((c) => c.group === g)}
		{#if cats.length}
			<div class="group-label">{labels[g]}</div>
			<div class="tabs">
				{#each cats as c}
					<button
						class:active={$activeCategory === c.id}
						onclick={() => activeCategory.set(c.id)}
					>{c.label}</button>
				{/each}
			</div>
		{/if}
	{/each}
</nav>
```

- [ ] **Step 3: UnitGrid**

```svelte
<!-- src/lib/components/UnitGrid.svelte -->
<script lang="ts">
	import { categories, convert } from '$lib/registry';
	import { formatSigFigs } from '$lib/format';
	import { showToast } from '$lib/stores/toast';

	let { categoryId }: { categoryId: string } = $props();
	let category = $derived(categories[categoryId]);
	let values = $state<Record<string, string>>({});
	let sourceId = $state<string | null>(null);

	$effect(() => {
		categoryId; // reset when category changes
		values = {};
		sourceId = null;
	});

	function onInput(unitId: string, raw: string) {
		sourceId = unitId;
		const v = parseFloat(raw);
		const next: Record<string, string> = { [unitId]: raw };
		if (raw.trim() !== '' && !Number.isNaN(v)) {
			for (const u of category.units) {
				if (u.id !== unitId) next[u.id] = formatSigFigs(convert(v, categoryId, unitId, u.id));
			}
		}
		values = next;
	}

	async function copyCell(unitId: string) {
		const v = values[unitId];
		if (!v) return;
		await navigator.clipboard.writeText(v);
		showToast('Copied to clipboard');
	}
</script>

<div class="grid">
	{#each category.units as u (u.id)}
		<label class="cell" class:source={sourceId === u.id}>
			<span class="cell-label">{u.name}</span>
			<input
				inputmode="decimal"
				placeholder="0"
				value={values[u.id] ?? ''}
				oninput={(e) => onInput(u.id, e.currentTarget.value)}
			/>
			<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell(u.id); }}>⧉</button>
		</label>
	{/each}
</div>
```

- [ ] **Step 4: Assemble the page (grid-only for now)**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
	import CategoryNav from '$lib/components/CategoryNav.svelte';
	import UnitGrid from '$lib/components/UnitGrid.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { activeCategory } from '$lib/stores/settings';
	import { ratesInfo } from '$lib/stores/rates';
</script>

<header class="masthead">
	<div>
		<h1>Almanac Converter</h1>
		<div class="tagline">Units · Currency · Calculation</div>
	</div>
	{#if $ratesInfo}
		<div class="rates-badge" class:stale={$ratesInfo.stale}>
			rates as of {$ratesInfo.asOf}{$ratesInfo.stale ? ' (offline)' : ''}
		</div>
	{/if}
</header>

<CategoryNav />
<UnitGrid categoryId={$activeCategory} />
<Toast />
```

- [ ] **Step 5: Verify manually**

Run: `bun run dev`
Expected: category tabs grouped under Everyday / Land & regional / Science / Digital; selecting Length and typing `5` into Meter fills Foot with `16.4042`, Mile with `0.00310686`; source cell shows rust outline; switching category clears the grid; copy button shows toast.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ src/routes/+page.svelte
git commit -m "feat: category nav and live-syncing unit grid"
```

---

### Task 10: SmartBar + ResultCard + Suggestions + share URLs

The hero. Live evaluation on input (fast path sync, engine async with stale-result guard), Enter copies + records history, `?q=` read on load and mirrored on success.

**Files:**
- Create: `src/lib/components/SmartBar.svelte`, `src/lib/components/ResultCard.svelte`, `src/lib/components/Suggestions.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: ResultCard**

```svelte
<!-- src/lib/components/ResultCard.svelte -->
<script lang="ts">
	import { categories, convert } from '$lib/registry';
	import { formatSigFigs } from '$lib/format';

	let {
		value,
		unit,
		fast,
		oncopy
	}: {
		value: string;
		unit: string;
		fast?: { categoryId: string; toId: string; raw: number };
		oncopy: () => void;
	} = $props();

	// sibling conversions only when we know the registry category (fast path)
	let siblings = $derived.by(() => {
		if (!fast) return [];
		const cat = categories[fast.categoryId];
		return cat.units
			.filter((u) => u.id !== fast.toId)
			.slice(0, 4)
			.map((u) => ({
				symbol: u.symbol,
				value: formatSigFigs(convert(fast.raw, fast.categoryId, fast.toId, u.id))
			}));
	});
</script>

<div class="result-card" onclick={oncopy} role="button" tabindex="-1" title="Click to copy">
	<div class="big"><span class="num">{value}</span>{#if unit}&nbsp;{unit}{/if}</div>
	<div class="hint">Enter or click to copy</div>
	{#if siblings.length}
		<div class="siblings">
			{#each siblings as s}
				<span class="sib">{s.value} {s.symbol}</span>
			{/each}
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Suggestions**

```svelte
<!-- src/lib/components/Suggestions.svelte -->
<script lang="ts">
	import type { UnitRef } from '$lib/registry';

	let {
		matches,
		onjump
	}: { matches: UnitRef[]; onjump: (categoryId: string) => void } = $props();
</script>

{#if matches.length}
	<div class="suggestions">
		{#each matches.slice(0, 5) as m}
			<button onclick={() => onjump(m.category.id)}>
				<span>Jump to <strong>{m.unit.name}</strong></span>
				<span class="cat">{m.category.label}</span>
			</button>
		{/each}
	</div>
{/if}
```

- [ ] **Step 3: SmartBar**

```svelte
<!-- src/lib/components/SmartBar.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { parse, type Parsed } from '$lib/parser/parse';
	import { evaluateParsed, type EvalResult } from '$lib/engine/engine';
	import { recordHistory } from '$lib/stores/history';
	import { showToast } from '$lib/stores/toast';
	import { activeCategory } from '$lib/stores/settings';
	import ResultCard from './ResultCard.svelte';
	import Suggestions from './Suggestions.svelte';

	let query = $state('');
	let parsed = $state<Parsed>({ kind: 'empty' });
	let result = $state<EvalResult | null>(null);
	let seq = 0; // stale-async guard

	async function run(q: string) {
		const my = ++seq;
		parsed = parse(q);
		if (parsed.kind === 'empty' || parsed.kind === 'lookup') {
			result = null;
			return;
		}
		const r = await evaluateParsed(parsed);
		if (my === seq) result = r;
	}

	function onInput(e: Event) {
		query = (e.currentTarget as HTMLInputElement).value;
		run(query);
	}

	async function copyResult() {
		if (!result?.ok) return;
		await navigator.clipboard.writeText(result.value);
		showToast('Copied to clipboard');
		recordHistory(query, `${result.value}${result.unit ? ' ' + result.unit : ''}`);
		const url = new URL(location.href);
		url.searchParams.set('q', query);
		history.replaceState(null, '', url);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') copyResult();
	}

	export function setQuery(q: string) {
		query = q;
		run(q);
	}

	onMount(() => {
		const q = new URLSearchParams(location.search).get('q');
		if (q) setQuery(q);
	});
</script>

<div class="smartbar-wrap">
	<input
		class="smartbar"
		value={query}
		oninput={onInput}
		onkeydown={onKeydown}
		placeholder="Try: 12 km to mi · 3 ft + 12 in in cm · 100 usd to inr · 1250 * 1.08"
		aria-label="Smart converter input"
	/>
	{#if parsed.kind === 'lookup'}
		<Suggestions matches={parsed.matches} onjump={(id) => activeCategory.set(id)} />
	{:else if result?.ok}
		<ResultCard value={result.value} unit={result.unit} fast={result.fast} oncopy={copyResult} />
	{:else if result && !result.ok && result.error}
		<div class="result-error">{result.error}</div>
	{/if}
</div>
```

- [ ] **Step 4: Mount in the page + boot currency**

Replace `src/routes/+page.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import SmartBar from '$lib/components/SmartBar.svelte';
	import CategoryNav from '$lib/components/CategoryNav.svelte';
	import UnitGrid from '$lib/components/UnitGrid.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { activeCategory } from '$lib/stores/settings';
	import { ratesInfo } from '$lib/stores/rates';
	import { loadRates } from '$lib/currency/currency';
	import { loadEngine, injectRates } from '$lib/engine/engine';

	let smartBar = $state<SmartBar | null>(null);

	onMount(async () => {
		// non-blocking: engine + rates load in background
		const info = await loadRates(localStorage);
		ratesInfo.set(info);
		await loadEngine();
		injectRates(info.rates);
	});
</script>

<header class="masthead">
	<div>
		<h1>Almanac Converter</h1>
		<div class="tagline">Units · Currency · Calculation</div>
	</div>
	{#if $ratesInfo}
		<div class="rates-badge" class:stale={$ratesInfo.stale}>
			rates as of {$ratesInfo.asOf}{$ratesInfo.stale ? ' (offline)' : ''}
		</div>
	{/if}
</header>

<SmartBar bind:this={smartBar} />
<CategoryNav />
<UnitGrid categoryId={$activeCategory} />
<Toast />
```

- [ ] **Step 5: Verify manually**

Run: `bun run dev`. Check:
- `12 km to mi` → result card `7.45645 mi` with sibling chips, live while typing.
- `3 ft + 12 in in cm` → `121.92 cm`.
- `100 usd to inr` → uses live rates (badge shows "rates as of …").
- `mile` (bare word) → suggestions with "Jump to Mile / Length"; clicking switches the grid.
- Enter → toast "Copied to clipboard", URL gains `?q=`.
- Reload with `?q=12+km+to+mi` → result restored.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ src/routes/+page.svelte
git commit -m "feat: smart bar with live eval, suggestions, copy, and share URLs"
```

---

### Task 11: HistoryPanel

**Files:**
- Create: `src/lib/components/HistoryPanel.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Component**

```svelte
<!-- src/lib/components/HistoryPanel.svelte -->
<script lang="ts">
	import { history } from '$lib/stores/history';

	let { onrerun }: { onrerun: (query: string) => void } = $props();
</script>

{#if $history.length}
	<section class="history">
		<h2>Recent</h2>
		<ul>
			{#each $history.slice(0, 10) as h (h.ts)}
				<li>
					<button class="entry" onclick={() => onrerun(h.query)}>
						<span>{h.query}</span>
						<span class="res">{h.result}</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
```

- [ ] **Step 2: Mount below the grid in `src/routes/+page.svelte`**

Add import:

```ts
import HistoryPanel from '$lib/components/HistoryPanel.svelte';
```

Add after `<UnitGrid …/>`:

```svelte
<HistoryPanel onrerun={(q) => smartBar?.setQuery(q)} />
```

- [ ] **Step 3: Verify manually**

Run: `bun run dev`. Convert something, press Enter, see it under "Recent"; click it → smart bar re-runs it; reload → history persists.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/HistoryPanel.svelte src/routes/+page.svelte
git commit -m "feat: persistent re-runnable history panel"
```

---

### Task 12: Playwright e2e + final verification

**Files:**
- Create: `e2e/app.test.ts`

- [ ] **Step 1: Write the e2e tests**

```ts
// e2e/app.test.ts
import { expect, test } from '@playwright/test';

test('smart bar converts live', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Smart converter input').fill('12 km to mi');
	await expect(page.locator('.result-card .num')).toHaveText('7.45645');
	await expect(page.locator('.result-card')).toContainText('mi');
});

test('unit math works', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Smart converter input').fill('3 ft + 12 in in cm');
	await expect(page.locator('.result-card .num')).toHaveText('121.92');
});

test('grid fills all siblings from one input', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Length' }).click();
	const meterInput = page.locator('.cell', { hasText: 'Meter' }).first().locator('input');
	await meterInput.fill('5');
	const footInput = page.locator('.cell', { hasText: 'Foot' }).locator('input');
	await expect(footInput).toHaveValue('16.4042');
});

test('share URL restores a query', async ({ page }) => {
	await page.goto('/?q=2+km+to+mi');
	await expect(page.locator('.result-card .num')).toHaveText('1.24274');
});

test('suggestions jump to a category', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Smart converter input').fill('tola');
	await page.getByRole('button', { name: /Jump to Tola/ }).click();
	await expect(page.locator('.cell', { hasText: 'Tola' })).toBeVisible();
});
```

- [ ] **Step 2: Run e2e**

Run: `bun run test:e2e`
Expected: 5 passed. (webServer builds + previews automatically.)

- [ ] **Step 3: Full verification sweep**

```bash
bun run check && bun run test && bun run test:e2e && bun run build
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test: e2e coverage for smart bar, grid sync, share URLs, suggestions"
```

---

## Post-plan notes for the implementer

- **Svelte 5 runes** are used throughout (`$state`, `$derived`, `$props`, `$effect`, `onclick=`). Do not mix in Svelte 4 `export let` / `on:click` syntax.
- If mathjs formatting produces `7.456454` instead of `7.45645` in Task 5, the fast path isn't firing — the expected values assume registry fast-path formatting via `formatSigFigs`. Debug `detectFast` in the parser first.
- The old app lives at `legacy/index.html` for factor cross-checking; the registry factors here are more precise (e.g., mile = 1609.344 m exactly).
- Deferred to v1.1 (do NOT build): keyboard shortcuts beyond Enter, precision settings UI, PWA/service worker, dark theme, formal a11y audit.
