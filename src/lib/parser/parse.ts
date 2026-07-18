import { findUnit, searchUnits, type UnitRef } from '../registry';

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
	| { kind: 'convert'; expr: string; target: string; fast?: FastConvert }
	| { kind: 'expression'; expr: string }
	| DateMathParsed;

const NUMBER_RE = /^-?[\d,]*\.?\d+(e-?\d+)?$/i;
const ARITH_RE = /^[\d\s.,+\-*/^()eE%]+$/;
/** unit-ish: a token that is a known unit alias, or looks like a unit expression (m^2, km/h) */
function isUnitish(s: string): boolean {
	if (findUnit(s)) return true;
	return /^[a-z°µ$€£₹][a-z0-9^/°µ]*(\s*\/\s*[a-z0-9^]+)?$/i.test(s);
}

/** Indian scale words: "2 lakh" -> 200000, "1.5 crore" -> 15000000. */
function expandScaleWords(s: string): string {
	return s.replace(/(-?\d[\d,]*\.?\d*)\s*(lakhs?|lacs?|crores?|cr)\b/gi, (_, num: string, word: string) => {
		const scale = /^cr/i.test(word) ? 1e7 : 1e5;
		return String(parseFloat(num.replace(/,/g, '')) * scale);
	});
}

export function parse(raw: string): Parsed {
	const q = expandScaleWords(raw.replace(/→/g, ' to ')).replace(/\s+/g, ' ').trim();
	if (!q) return { kind: 'empty' };

	const dateMath = detectDateMath(q);
	if (dateMath) return dateMath;

	if (NUMBER_RE.test(q)) return { kind: 'number', value: parseFloat(q.replace(/,/g, '')) };

	// find LAST occurrence of a conversion keyword with a unit-ish RHS.
	// Trailing space is a lookahead (not consumed) so overlapping keywords like
	// "in in" / "in to" are both matchable and the LAST valid one wins.
	const kw = /\s(to|in|as)(?=\s)/gi;
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

const DATE_KEYWORD_RE = /^(today|tomorrow|yesterday)$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WORD_DATE_RE = /^(?:\d{1,2}\s+[a-z]{3,9}(?:\s+\d{4})?|[a-z]{3,9}\s+\d{1,2}(?:,?\s+\d{4})?)$/i;
const DURATION_RE = /^(\d+)\s*(days?|weeks?|wks?|months?|years?|yrs?)$/i;

function isDateString(s: string): boolean {
	const clean = s.trim().toLowerCase();
	if (DATE_KEYWORD_RE.test(clean) || ISO_DATE_RE.test(clean) || WORD_DATE_RE.test(clean)) {
		if (DATE_KEYWORD_RE.test(clean)) return true;
		const d = new Date(clean);
		return !isNaN(d.getTime());
	}
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
