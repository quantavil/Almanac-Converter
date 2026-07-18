import { categories, convert, findUnit } from '../registry';
import { formatNumber, type Notation } from '../format';
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
	// only inject currencies we actually support — the API returns ~160 codes and
	// some collide with mathjs unit names (CUP = Cuban Peso vs cup the volume unit)
	const supported = new Set(categories.currency.units.map((u) => u.symbol));
	for (const [code, perUsd] of Object.entries(rates)) {
		if (code === 'USD' || !perUsd || !supported.has(code)) continue;
		math.createUnit(
			code,
			{ definition: `${1 / perUsd} USD`, aliases: [code.toLowerCase()] },
			{ override: true }
		);
	}
	// keep the grid's registry in sync
	for (const unit of categories.currency.units) {
		const r = rates[unit.symbol];
		if (r) unit.toBase = 1 / r;
	}
}

export async function evaluateParsed(parsed: Parsed, notation: Notation = 'auto'): Promise<EvalResult> {
	if (parsed.kind === 'empty' || parsed.kind === 'lookup')
		return { ok: false, error: '' };
	if (parsed.kind === 'number')
		return { ok: true, value: formatNumber(parsed.value, notation), unit: '' };

	// registry fast path — instant, no mathjs needed
	if (parsed.kind === 'convert' && parsed.fast) {
		const { value, categoryId, fromId, toId } = parsed.fast;
		const raw = convert(value, categoryId, fromId, toId);
		const to = categories[categoryId].units.find((x) => x.id === toId)!;
		if (!Number.isFinite(raw)) return { ok: false, error: 'Undefined for this value' };
		return { ok: true, value: formatNumber(raw, notation), unit: to.symbol, fast: { categoryId, toId, raw } };
	}

	// registryOnly targets (fuel economy: reciprocal/non-linear) can't be a mathjs
	// unit, so they're only reachable via the fast path above, never in expressions.
	if (parsed.kind === 'convert') {
		const target = findUnit(parsed.target);
		if (target?.category.registryOnly)
			return { ok: false, error: `Can't use ${target.unit.symbol} in expressions yet` };
	}

	await loadEngine();
	const expr = parsed.kind === 'convert' ? `(${parsed.expr}) to (${parsed.target})` : parsed.expr;
	try {
		const r = math!.evaluate(normalizeForMath(expr));
		if (typeof r === 'number') return { ok: true, value: formatNumber(r, notation), unit: '' };
		const formatted: string = math!.format(r, { precision: 6 });
		const sp = formatted.indexOf(' ');
		const valStr = sp === -1 ? formatted : formatted.slice(0, sp);
		const unit = sp === -1 ? '' : formatted.slice(sp + 1);
		// re-render the numeric part in the chosen notation when it parses cleanly
		const num = Number(valStr);
		return { ok: true, value: Number.isFinite(num) ? formatNumber(num, notation) : valStr, unit };
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
