import { categories, convert, findUnit } from '../registry';
import { formatNumber, type Notation } from '../format';
import type { BaseTarget, DateMathParsed, Parsed } from '../parser/parse';
import { addDuration, diffDaysLabel, formatLongDate, resolveDate } from '../date/datemath';

export interface MultiRow { value: string; unit?: string; error?: string }

export type EvalResult =
	| { ok: true; value: string; unit: string; multi?: MultiRow[]; fast?: { categoryId: string; toId: string; raw: number } }
	| { ok: false; error: string };

/** Wrap several conversion rows; `value` is the flat text used for copy/history. */
function multiResult(multi: MultiRow[]): EvalResult {
	const value = multi.filter((m) => !m.error).map((m) => (m.unit ? `${m.value} ${m.unit}` : m.value)).join('\n');
	return { ok: true, value, unit: '', multi };
}

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

	if (parsed.kind === 'base') return evaluateBase(parsed.value, parsed.targets);

	if (parsed.kind === 'convert_multi') {
		const results: EvalResult[] = [];
		for (let i = 0; i < parsed.targets.length; i++) {
			results.push(await evalConvert(parsed.expr, parsed.targets[i], parsed.fasts[i], notation, precision));
		}
		// every target failed (e.g. the source expression itself is broken):
		// surface one plain error instead of a card full of error rows.
		if (results.every((r) => !r.ok)) return results[0];
		return multiResult(
			results.map((r) => (r.ok ? { value: r.value, unit: r.unit } : { value: '', error: r.error }))
		);
	}

	if (parsed.kind === 'convert')
		return evalConvert(parsed.expr, parsed.target, parsed.fast, notation, precision);

	// bare expression
	return evalMath(parsed.expr, null, notation, precision);
}

/** Convert one source expression to one target, via the registry fast path or mathjs. */
async function evalConvert(
	expr: string,
	target: string,
	fast: { value: number; categoryId: string; fromId: string; toId: string } | undefined,
	notation: Notation,
	precision: number
): Promise<EvalResult> {
	// registry fast path — instant, no mathjs needed
	if (fast) {
		const { value, categoryId, fromId, toId } = fast;
		const raw = convert(value, categoryId, fromId, toId);
		const to = categories[categoryId].units.find((x) => x.id === toId)!;
		if (!Number.isFinite(raw)) return { ok: false, error: 'Undefined for this value' };
		return { ok: true, value: formatNumber(raw, notation, precision), unit: to.symbol, fast: { categoryId, toId, raw } };
	}
	// registryOnly targets (fuel economy: reciprocal/non-linear) can't be a mathjs
	// unit, so they're only reachable via the fast path above, never in expressions.
	const to = findUnit(target);
	if (to?.category.registryOnly)
		return { ok: false, error: `Can't use ${to.unit.symbol} in expressions yet` };
	return evalMath(expr, target, notation, precision);
}

/** Evaluate an expression through mathjs, optionally converting to `target`. */
async function evalMath(
	expr: string,
	target: string | null,
	notation: Notation,
	precision: number
): Promise<EvalResult> {
	try {
		await loadEngine();
	} catch {
		return { ok: false, error: 'Calculator engine failed to load — check your connection and retry' };
	}
	const body = bridgeCompound(expr);
	const full = target ? `(${body}) to (${target})` : body;
	try {
		const r = math!.evaluate(normalizeForMath(full));
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

function evaluateBase(value: number, targets: BaseTarget[]): EvalResult {
	const repr = (t: BaseTarget): string => {
		if (t === 'dec') return String(value);
		const prefix = t === 'hex' ? '0x' : t === 'bin' ? '0b' : '0o';
		const radix = t === 'hex' ? 16 : t === 'bin' ? 2 : 8;
		return (value < 0 ? '-' : '') + prefix + Math.abs(value).toString(radix);
	};
	return multiResult(targets.map((t) => ({ value: repr(t) })));
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

function evaluateDateMath(parsed: DateMathParsed): EvalResult {
	if (parsed.subkind === 'weekday') {
		const d = resolveDate(parsed.targetDate!);
		if (!d) return { ok: false, error: `Invalid date: "${parsed.targetDate}"` };
		return { ok: true, value: formatLongDate(d), unit: '' };
	}

	if (parsed.subkind === 'arithmetic') {
		const base = resolveDate(parsed.baseDate!);
		if (!base) return { ok: false, error: `Invalid date: "${parsed.baseDate}"` };
		const result = addDuration(base, parsed.durationVal!, parsed.durationUnit!, parsed.operator!);
		return { ok: true, value: formatLongDate(result), unit: '' };
	}

	if (parsed.subkind === 'difference') {
		const start = resolveDate(parsed.startDate!);
		const end = resolveDate(parsed.endDate!);
		if (!start) return { ok: false, error: `Invalid date: "${parsed.startDate}"` };
		if (!end) return { ok: false, error: `Invalid date: "${parsed.endDate}"` };
		return { ok: true, value: diffDaysLabel(start, end), unit: '' };
	}

	return { ok: false, error: 'Unknown date math operation' };
}
