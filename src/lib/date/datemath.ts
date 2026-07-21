/**
 * Shared date-math helpers used by both the smart bar (engine.ts) and the
 * Date panel (DatePanel.svelte) so the two can never drift apart.
 */

export type DurationUnit = 'day' | 'week' | 'month' | 'year';

const LONG_DATE: Intl.DateTimeFormatOptions = {
	weekday: 'long',
	year: 'numeric',
	month: 'long',
	day: 'numeric'
};

/** Local midnight today. */
function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Parse a user date string to a local-midnight Date, or null if unparseable.
 * - today/tomorrow/yesterday relative to local time
 * - ISO YYYY-MM-DD is built in local time (avoids the UTC-midnight day shift
 *   that `new Date("2026-07-18")` causes in negative-offset timezones)
 * - year-less strings like "may 5" default to the current year rather than the
 *   V8 fallback of 2001
 */
export function resolveDate(str: string): Date | null {
	const clean = str.trim().toLowerCase();
	if (!clean) return null;

	if (clean === 'today') return startOfToday();
	if (clean === 'tomorrow') {
		const d = startOfToday();
		d.setDate(d.getDate() + 1);
		return d;
	}
	if (clean === 'yesterday') {
		const d = startOfToday();
		d.setDate(d.getDate() - 1);
		return d;
	}

	const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);

	// validate against the raw string first so garbage ("not a date") is rejected;
	// V8 would happily read a year out of "not a date 2026" otherwise.
	const d = new Date(str);
	if (isNaN(d.getTime())) return null;

	// year-less strings ("may 5"): re-parse with the current year appended so
	// "feb 29" lands on Feb 29 in a leap year rather than defaulting to V8's 2001
	// and rolling over to March 1.
	if (!/\d{4}/.test(str)) {
		const withYear = new Date(`${str} ${new Date().getFullYear()}`);
		if (!isNaN(withYear.getTime())) {
			withYear.setHours(0, 0, 0, 0);
			return withYear;
		}
		d.setFullYear(new Date().getFullYear());
	}
	d.setHours(0, 0, 0, 0);
	return d;
}

/** e.g. "Friday, December 25, 2026" */
export function formatLongDate(d: Date): string {
	return d.toLocaleDateString('en-US', LONG_DATE);
}

/** base ± (val × unit), returned as a new Date. */
export function addDuration(base: Date, val: number, unit: DurationUnit, op: '+' | '-'): Date {
	const mult = op === '-' ? -1 : 1;
	const n = (Number(val) || 0) * mult;
	const d = new Date(base);
	if (unit === 'day') d.setDate(d.getDate() + n);
	else if (unit === 'week') d.setDate(d.getDate() + n * 7);
	else if (unit === 'month') d.setMonth(d.getMonth() + n);
	else d.setFullYear(d.getFullYear() + n);
	return d;
}

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + 's'}`;

/** Signed span between two dates, e.g. "45 days (6 weeks, 3 days)" or "-2 days". */
export function diffDaysLabel(start: Date, end: Date): string {
	const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
	const absDays = Math.abs(diffDays);

	let label = plural(absDays, 'day');
	if (absDays >= 7) {
		const weeks = Math.floor(absDays / 7);
		const remDays = absDays % 7;
		label += ` (${plural(weeks, 'week')}${remDays > 0 ? `, ${plural(remDays, 'day')}` : ''})`;
	}
	return diffDays < 0 ? `-${label}` : label;
}
