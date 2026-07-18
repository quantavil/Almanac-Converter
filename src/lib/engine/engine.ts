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
		loading = import('mathjs')
			.then((m) => {
				math = m;
				for (const [name, def] of REGIONAL_UNITS) {
					m.createUnit(name, def, { override: true });
				}
				m.createUnit('USD', { aliases: ['usd'] });
			})
			.catch((e) => {
				// don't cache a rejected promise — a flaky CDN import would otherwise
				// wedge the engine permanently until a full reload
				loading = null;
				throw e;
			});
	}
	return loading;
}

/** rates: currency code -> units per USD. Also updates the registry factors. */
export function injectRates(rates: Record<string, number>): void {
	if (!math) throw new Error('engine not loaded');
	for (const [code, perUsd] of Object.entries(rates)) {
		if (code === 'USD' || !perUsd) continue;
		const lcode = code.toLowerCase();
		const isReserved = lcode in math || math.Unit.isValuelessUnit(lcode);
		math.createUnit(
			code,
			{ definition: `${1 / perUsd} USD`, aliases: isReserved ? [] : [lcode] },
			{ override: true }
		);
	}
	// keep the grid's registry in sync
	for (const unit of categories.currency.units) {
		const r = rates[unit.symbol];
		if (r) unit.toBase = 1 / r;
	}
}

export async function evaluateParsed(
	parsed: Parsed,
	notation: Notation = 'auto',
	precision = 6
): Promise<EvalResult> {
	if (parsed.kind === 'empty' || parsed.kind === 'lookup')
		return { ok: false, error: '' };
	if (parsed.kind === 'date_math')
		return evaluateDateMath(parsed);
	if (parsed.kind === 'number')
		return { ok: true, value: formatNumber(parsed.value, notation, precision), unit: '' };

	// registry fast path — instant, no mathjs needed
	if (parsed.kind === 'convert' && parsed.fast) {
		const { value, categoryId, fromId, toId } = parsed.fast;
		const raw = convert(value, categoryId, fromId, toId);
		const to = categories[categoryId].units.find((x) => x.id === toId)!;
		if (!Number.isFinite(raw)) return { ok: false, error: 'Undefined for this value' };
		return { ok: true, value: formatNumber(raw, notation, precision), unit: to.symbol, fast: { categoryId, toId, raw } };
	}

	// registryOnly targets (fuel economy: reciprocal/non-linear) can't be a mathjs
	// unit, so they're only reachable via the fast path above, never in expressions.
	if (parsed.kind === 'convert') {
		const target = findUnit(parsed.target);
		if (target?.category.registryOnly)
			return { ok: false, error: `Can't use ${target.unit.symbol} in expressions yet` };
	}

	await loadEngine();
	const body = bridgeCompound(parsed.expr);
	const expr = parsed.kind === 'convert' ? `(${body}) to (${parsed.target})` : body;
	try {
		const r = math!.evaluate(normalizeForMath(expr));
		if (typeof r === 'number') return { ok: true, value: formatNumber(r, notation, precision), unit: '' };
		const formatted: string = math!.format(r, { precision });
		const sp = formatted.indexOf(' ');
		const valStr = sp === -1 ? formatted : formatted.slice(0, sp);
		const unit = sp === -1 ? '' : formatted.slice(sp + 1);
		// re-render the numeric part in the chosen notation when it parses cleanly
		const num = Number(valStr);
		return { ok: true, value: Number.isFinite(num) ? formatNumber(num, notation, precision) : valStr, unit };
	} catch (e) {
		return { ok: false, error: friendly((e as Error).message) };
	}
}

/**
 * Bridge compound units into additions so mathjs can evaluate them:
 * "5 ft 10 in" -> "5 ft + 10 in", "1 hr 30 min" -> "1 hr + 30 min".
 * Skips anything that already contains an operator (a real expression).
 */
function bridgeCompound(expr: string): string {
	if (/[+\-*/^()!%]/.test(expr)) return expr;
	// insert + between a unit token and a following number
	return expr.replace(/([a-zµ°′″][\w°′″/]*)\s+(-?\d)/gi, '$1 + $2');
}

/** mathjs quirks: it knows 'in' as inch and most symbols; map a few common aliases. */
function normalizeForMath(expr: string): string {
	return expr
		.replace(/\bkmph\b/gi, 'km/h')
		.replace(/\bmph\b/gi, 'mi/h')
		// mathjs reserves min() and mis-parses bare h/hr; spell time units out.
		// keep the bare h in km/h · mi/h untouched, and min( ) as the function.
		.replace(/\b(hours?|hrs?)\b/gi, 'hour')
		.replace(/\b(minutes?|mins?)\b(?!\s*\()/gi, 'minute')
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

function resolveDate(str: string): Date | null {
	const clean = str.trim().toLowerCase();
	const now = new Date();
	now.setHours(0, 0, 0, 0); // normalize time

	if (clean === 'today') return now;
	if (clean === 'tomorrow') {
		now.setDate(now.getDate() + 1);
		return now;
	}
	if (clean === 'yesterday') {
		now.setDate(now.getDate() - 1);
		return now;
	}

	const parsedDate = new Date(str);
	return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function evaluateDateMath(parsed: any): EvalResult {
	try {
		if (parsed.subkind === 'weekday') {
			const d = resolveDate(parsed.targetDate);
			if (!d) return { ok: false, error: `Invalid date: "${parsed.targetDate}"` };
			const weekday = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
			return { ok: true, value: weekday, unit: '' };
		}

		if (parsed.subkind === 'arithmetic') {
			const base = resolveDate(parsed.baseDate);
			if (!base) return { ok: false, error: `Invalid date: "${parsed.baseDate}"` };
			
			const mult = parsed.operator === '-' ? -1 : 1;
			const val = parsed.durationVal;
			const unit = parsed.durationUnit;

			const result = new Date(base);
			if (unit === 'day') result.setDate(result.getDate() + val * mult);
			else if (unit === 'week') result.setDate(result.getDate() + val * 7 * mult);
			else if (unit === 'month') result.setMonth(result.getMonth() + val * mult);
			else if (unit === 'year') result.setFullYear(result.getFullYear() + val * mult);

			const formatted = result.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
			return { ok: true, value: formatted, unit: '' };
		}

		if (parsed.subkind === 'difference') {
			const start = resolveDate(parsed.startDate);
			const end = resolveDate(parsed.endDate);
			if (!start) return { ok: false, error: `Invalid date: "${parsed.startDate}"` };
			if (!end) return { ok: false, error: `Invalid date: "${parsed.endDate}"` };

			const diffMs = end.getTime() - start.getTime();
			const diffDays = Math.round(diffMs / 86400000);
			const absDays = Math.abs(diffDays);

			let label = `${absDays} ${absDays === 1 ? 'day' : 'days'}`;
			if (absDays >= 7) {
				const weeks = Math.floor(absDays / 7);
				const remDays = absDays % 7;
				label += ` (${weeks} ${weeks === 1 ? 'week' : 'weeks'}${remDays > 0 ? `, ${remDays} ${remRemDaysUnit(remDays)}` : ''})`;
			}

			return { ok: true, value: diffDays < 0 ? `-${label}` : label, unit: '' };
		}

		return { ok: false, error: 'Unknown date math operation' };
	} catch (e) {
		return { ok: false, error: (e as Error).message };
	}
}

function remRemDaysUnit(remDays: number): string {
	return remDays === 1 ? 'day' : 'days';
}
