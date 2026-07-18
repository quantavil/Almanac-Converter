import { describe, expect, it } from 'vitest';
import { addDuration, diffDaysLabel, formatLongDate, resolveDate } from './datemath';

describe('resolveDate', () => {
	it('parses ISO dates in local time (no UTC day shift)', () => {
		const d = resolveDate('2026-07-18')!;
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(6); // July
		expect(d.getDate()).toBe(18);
	});

	it('defaults year-less dates to the current year, not 2001', () => {
		const d = resolveDate('may 5')!;
		expect(d).not.toBeNull();
		expect(d.getFullYear()).toBe(new Date().getFullYear());
		expect(d.getMonth()).toBe(4); // May
		expect(d.getDate()).toBe(5);
	});

	it('handles today/tomorrow/yesterday at local midnight', () => {
		const today = resolveDate('today')!;
		expect(today.getHours()).toBe(0);
		const tomorrow = resolveDate('tomorrow')!;
		expect(Math.round((tomorrow.getTime() - today.getTime()) / 86400000)).toBe(1);
		const yesterday = resolveDate('yesterday')!;
		expect(Math.round((yesterday.getTime() - today.getTime()) / 86400000)).toBe(-1);
	});

	it('returns null for garbage', () => {
		expect(resolveDate('not a date')).toBeNull();
		expect(resolveDate('')).toBeNull();
	});
});

describe('diffDaysLabel', () => {
	it('formats spans with weeks + days', () => {
		expect(diffDaysLabel(resolveDate('2026-07-18')!, resolveDate('2026-09-01')!)).toBe(
			'45 days (6 weeks, 3 days)'
		);
	});
	it('singularizes one day', () => {
		expect(diffDaysLabel(resolveDate('2026-07-18')!, resolveDate('2026-07-19')!)).toBe('1 day');
	});
	it('signs negative spans', () => {
		expect(diffDaysLabel(resolveDate('2026-07-19')!, resolveDate('2026-07-18')!)).toBe('-1 day');
	});
	it('omits the days remainder on exact weeks', () => {
		expect(diffDaysLabel(resolveDate('2026-07-18')!, resolveDate('2026-08-01')!)).toBe(
			'14 days (2 weeks)'
		);
	});
});

describe('addDuration', () => {
	it('adds and subtracts across unit kinds', () => {
		const base = resolveDate('2026-07-18')!;
		expect(formatLongDate(addDuration(base, 45, 'day', '+'))).toContain('September 1, 2026');
		expect(formatLongDate(addDuration(base, 3, 'week', '-'))).toContain('June 27, 2026');
		expect(formatLongDate(addDuration(base, 1, 'month', '+'))).toContain('August 18, 2026');
		expect(formatLongDate(addDuration(base, 1, 'year', '-'))).toContain('July 18, 2025');
	});
});
