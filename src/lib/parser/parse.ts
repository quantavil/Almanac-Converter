import { findUnit, searchUnits, type Category, type UnitRef } from '../registry';
import { fromRoman } from '../numerals/numerals';

export type BaseTarget = 'dec' | 'hex' | 'bin' | 'oct';

export interface FastConvert {
	value: number;
	categoryId: string;
	fromId: string;
	toId: string;
}

export interface DateMathParsed {
	kind: 'date_math';
	subkind: 'arithmetic' | 'difference' | 'weekday';
	baseDate?: string;
	operator?: '+' | '-';
	durationVal?: number;
	durationUnit?: 'day' | 'week' | 'month' | 'year';
	startDate?: string;
	endDate?: string;
	targetDate?: string;
}

export type Parsed =
	| { kind: 'empty' }
	| { kind: 'number'; value: number }
	| { kind: 'lookup'; query: string; matches: UnitRef[] }
	| { kind: 'lookup_target'; expr: string; target: string; matches: UnitRef[] }
	| { kind: 'convert'; expr: string; target: string; fast?: FastConvert }
	| { kind: 'convert_multi'; expr: string; targets: string[]; fasts: (FastConvert | undefined)[] }
	| { kind: 'base'; value: number; targets: BaseTarget[] }
	| { kind: 'numeral'; to: 'words' | 'roman' | 'number'; n: number }
	| { kind: 'expression'; expr: string }
	| DateMathParsed;

const NUMBER_RE = /^-?[\d,]*\.?\d+(e-?\d+)?$/i;
const ARITH_RE = /^[\d\s.,+\-*/^()eE%]+$/;
/** unit-ish: a token that is a known unit alias, or looks like a unit expression (m^2, km/h) */
function isUnitish(s: string): boolean {
	if (findUnit(s)) return true;
	return /^[a-z°µ$€£₹][a-z0-9^/°µ]*(\s*\/\s*[a-z0-9^]+)?$/i.test(s);
}

/** Split a conversion RHS on commas: "mi, ft, m" -> targets; "mi" -> one target.
 *  A trailing comma ("mi,") yields one target, so typing the separator doesn't
 *  break the live result. */
function splitTargets(s: string): string[] {
	return s.split(',').map((t) => t.trim()).filter(Boolean);
}

/** Indian scale words: "2 lakh" -> 200000, "1.5 crore" -> 15000000. */
function expandScaleWords(s: string): string {
	return s.replace(/(-?\d[\d,]*\.?\d*)\s*(lakhs?|lacs?|crores?|cr)\b/gi, (_, num: string, word: string) => {
		const scale = /^cr/i.test(word) ? 1e7 : 1e5;
		return String(parseFloat(num.replace(/,/g, '')) * scale);
	});
}

/** "5'10\"" / "5 ft 10 in" / "5 feet 10" -> "5 ft 10 in" for the engine to bridge. */
function expandFeetInches(s: string): string {
	return s
		// symbol form: 5'10", 5′10″ — the inch mark is optional
		.replace(/(\d+(?:\.\d+)?)\s*['′’]\s*(\d+(?:\.\d+)?)\s*["″”]?/g, '$1 ft $2 in')
		// word form: require a space before the inches number so unit-with-digit
		// tokens like "ft2" (square foot) aren't split into "ft 2 in". The trailing
		// inch word (and its space) stays optional so "5 ft 10 to cm" keeps its space.
		.replace(
			/\b(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s+(\d+(?:\.\d+)?)(?:\s*(?:inches|inch|in))?\b/gi,
			'$1 ft $2 in'
		);
}

function expandPercentages(s: string): string {
	let res = s;
	res = res.replace(/(\d+(?:\.\d+)?)\s*%\s+of\s+(.+?)(?=\s+(?:to|in|as)\b|$)/gi, '($2) * ($1 / 100)');
	const addSubRe = /([a-z0-9\s.,+\-*/^()!]+?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*%(?=\s+(?:to|in|as)\b|\s*[+-]|\s*\)|$)/i;
	while (addSubRe.test(res)) {
		res = res.replace(addSubRe, '($1) * (1 $2 ($3 / 100))');
	}
	res = res.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1 / 100)');
	return res;
}

function findSourceUnit(expr: string): UnitRef | null {
	const words = expr.trim().split(/\s+/);
	const lastWord = words[words.length - 1];
	if (lastWord) {
		return findUnit(lastWord);
	}
	return null;
}

/** Units within one category whose name/symbol/alias contains the partial target. */
function searchCategoryUnits(category: Category, target: string): UnitRef[] {
	const q = target.trim().toLowerCase();
	return category.units
		.filter((unit) => {
			if (!q) return true;
			const hay = [unit.name, unit.symbol, unit.id, ...unit.aliases];
			return hay.some((h) => h.toLowerCase().includes(q));
		})
		.map((unit) => ({ category, unit }));
}

export function parse(raw: string): Parsed {
	let q = raw.replace(/→/g, ' to ');
	q = expandFeetInches(q);
	q = expandPercentages(q);
	q = expandScaleWords(q).replace(/\s+/g, ' ').trim();

	if (!q) return { kind: 'empty' };

	const dateMath = detectDateMath(q);
	if (dateMath) return dateMath;

	const base = detectBase(q);
	if (base) return base;

	const numeral = detectNumeral(q);
	if (numeral) return numeral;

	if (NUMBER_RE.test(q)) return { kind: 'number', value: parseFloat(q.replace(/,/g, '')) };

	// Target Autocomplete check: trailing "to/in/as" optionally followed by partial RHS.
	const kwMatch = q.match(/\b(to|in|as)(?:\s+(.*))?$/i);
	if (kwMatch && kwMatch.index !== undefined) {
		const expr = q.slice(0, kwMatch.index).trim();
		const target = (kwMatch[2] || '').trim();
		const exactTarget = findUnit(target);

		if (!exactTarget || target === '') {
			const source = findSourceUnit(expr);
			let matches: UnitRef[] = [];
			if (source) {
				matches = searchCategoryUnits(source.category, target);
			} else if (target) {
				matches = searchUnits(target);
			}
			if (matches.length || (target === '' && source)) {
				return { kind: 'lookup_target', expr, target, matches };
			}
		}
	}

	// find LAST occurrence of a conversion keyword whose RHS is one unit-ish
	// token or a comma-separated list of them (multi-target conversions).
	const kw = /\s(to|in|as)(?=\s)/gi;
	let match: RegExpExecArray | null;
	let split: { index: number; length: number } | null = null;
	while ((match = kw.exec(q))) {
		const parts = splitTargets(q.slice(match.index + match[0].length));
		if (parts.length && parts.every(isUnitish)) split = { index: match.index, length: match[0].length };
	}

	if (split) {
		const expr = q.slice(0, split.index).trim();
		const targets = splitTargets(q.slice(split.index + split.length));
		if (targets.length > 1) {
			return { kind: 'convert_multi', expr, targets, fasts: targets.map((t) => detectFast(expr, t)) };
		}
		const target = targets[0];
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

const BASE_ALIASES: Record<string, BaseTarget> = {
	dec: 'dec', decimal: 'dec',
	hex: 'hex', hexadecimal: 'hex',
	bin: 'bin', binary: 'bin',
	oct: 'oct', octal: 'oct'
};

/** Number-base conversions: "0xff to dec", "255 to hex, bin", "0b1010 to hex/dec". */
function detectBase(q: string): Parsed | null {
	const m = q.match(/^(0x[0-9a-f]+|0b[01]+|0o[0-7]+|-?\d[\d,]*)\s+(?:to|in|as)\s+(.+)$/i);
	if (!m) return null;
	const targets: BaseTarget[] = [];
	for (const part of m[2].split(/[,/]/)) {
		const b = BASE_ALIASES[part.trim().toLowerCase()];
		if (!b) return null; // any non-base target -> not a base conversion
		if (!targets.includes(b)) targets.push(b);
	}
	if (!targets.length) return null;

	// Number() handles the 0x/0b/0o prefixes natively; beyond 2^53 the digits
	// would silently round, so treat that as unparseable rather than lie.
	const value = Number(m[1].toLowerCase().replace(/,/g, ''));
	if (!Number.isSafeInteger(value)) return null;
	return { kind: 'base', value, targets };
}

const INTEGER_RE = /^-?\d[\d,]*$/;
const ROMAN_RE = /^[mdclxvi]+$/i;

function toStrictInt(s: string): number | null {
	if (!INTEGER_RE.test(s)) return null;
	const n = parseInt(s.replace(/,/g, ''), 10);
	return Number.isSafeInteger(n) ? n : null;
}

/** Numeral conversions: "1234 to words", "2026 to roman", "mcmxcix to number".
 *  The left side may be digits or a Roman numeral; the target picks the output. */
function detectNumeral(q: string): Parsed | null {
	const m = q.match(/^(.+?)\s+(?:to|in)\s+(words?|roman|numbers?|arabic)$/i);
	if (!m) return null;
	const lhs = m[1].trim();
	const tgt = m[2].toLowerCase();
	const to = tgt.startsWith('word') ? 'words' : tgt === 'roman' ? 'roman' : 'number';

	const n = toStrictInt(lhs) ?? (ROMAN_RE.test(lhs) ? fromRoman(lhs) : null);
	return n === null ? null : { kind: 'numeral', to, n };
}

const DATE_KEYWORD_RE = /^(today|tomorrow|yesterday)$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WORD_DATE_RE = /^(?:\d{1,2}\s+[a-z]{3,9}(?:\s+\d{4})?|[a-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?)$/i;
const DURATION_RE = /^(\d+)\s*(days?|weeks?|wks?|months?|years?|yrs?)$/i;

function isDateString(s: string): boolean {
	const clean = s.trim().toLowerCase();
	if (DATE_KEYWORD_RE.test(clean)) return true;
	if (ISO_DATE_RE.test(clean) || WORD_DATE_RE.test(clean)) return !isNaN(new Date(clean).getTime());
	return false;
}

function normalizeDurationUnit(u: string): 'day' | 'week' | 'month' | 'year' {
	const clean = u.toLowerCase();
	if (clean.startsWith('day')) return 'day';
	if (clean.startsWith('week') || clean.startsWith('wk')) return 'week';
	if (clean.startsWith('month')) return 'month';
	return 'year';
}

function detectDateMath(q: string): Parsed | null {
	// 1. Date Diff: <date1> to <date2>
	const toSplit = q.split(/\s+to\s+/i);
	if (toSplit.length === 2) {
		const lhs = toSplit[0].trim();
		const rhs = toSplit[1].trim();
		if (isDateString(lhs) && isDateString(rhs)) {
			return {
				kind: 'date_math',
				subkind: 'difference',
				startDate: lhs,
				endDate: rhs
			};
		}
	}

	// 2. Date Arithmetic: <date1> (+|-) <duration>
	const opMatch = q.match(/\s+([+-])\s+/);
	if (opMatch && opMatch.index !== undefined) {
		const lhs = q.slice(0, opMatch.index).trim();
		const rhs = q.slice(opMatch.index + opMatch[0].length).trim();
		if (isDateString(lhs) && DURATION_RE.test(rhs)) {
			const durMatch = rhs.match(DURATION_RE)!;
			return {
				kind: 'date_math',
				subkind: 'arithmetic',
				baseDate: lhs,
				operator: opMatch[1] as '+' | '-',
				durationVal: parseInt(durMatch[1]),
				durationUnit: normalizeDurationUnit(durMatch[2])
			};
		}
	}

	// 3. Standalone Date
	if (isDateString(q)) {
		return {
			kind: 'date_math',
			subkind: 'weekday',
			targetDate: q
		};
	}

	return null;
}
