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

describe('date math', () => {
	it('parses standalone date for weekday info', () => {
		expect(parse('2026-12-25')).toEqual({
			kind: 'date_math',
			subkind: 'weekday',
			targetDate: '2026-12-25'
		});
		expect(parse('today')).toEqual({
			kind: 'date_math',
			subkind: 'weekday',
			targetDate: 'today'
		});
	});
	it('parses date arithmetic (+/-)', () => {
		expect(parse('today + 45 days')).toEqual({
			kind: 'date_math',
			subkind: 'arithmetic',
			baseDate: 'today',
			operator: '+',
			durationVal: 45,
			durationUnit: 'day'
		});
		expect(parse('2026-07-18 - 2 weeks')).toEqual({
			kind: 'date_math',
			subkind: 'arithmetic',
			baseDate: '2026-07-18',
			operator: '-',
			durationVal: 2,
			durationUnit: 'week'
		});
	});
	it('parses date difference (to)', () => {
		expect(parse('today to 2026-12-25')).toEqual({
			kind: 'date_math',
			subkind: 'difference',
			startDate: 'today',
			endDate: '2026-12-25'
		});
	});
});

describe('feet and inches shorthand parsing', () => {
	it('expands smart quotes and single/double prime primes', () => {
		expect(parse('5\'10" to cm')).toMatchObject({
			kind: 'convert',
			expr: '5 ft 10 in',
			target: 'cm'
		});
		expect(parse('5\' 10" to cm')).toMatchObject({
			kind: 'convert',
			expr: '5 ft 10 in',
			target: 'cm'
		});
		expect(parse('5 ft 10 to cm')).toMatchObject({
			kind: 'convert',
			expr: '5 ft 10 in',
			target: 'cm'
		});
		expect(parse('5\'10.5"')).toMatchObject({
			kind: 'expression',
			expr: '5 ft 10.5 in'
		});
	});
	it('does not split unit-with-digit tokens like ft2 (square foot)', () => {
		expect(parse('10 ft2 to m2')).toMatchObject({
			kind: 'convert',
			expr: '10 ft2',
			target: 'm2'
		});
		expect(parse('6 ft2')).toMatchObject({ kind: 'expression', expr: '6 ft2' });
	});
});

describe('percentage idioms parsing', () => {
	it('expands % of phrase', () => {
		expect(parse('15% of 240')).toEqual({
			kind: 'expression',
			expr: '(240) * (15 / 100)'
		});
	});
	it('expands percentage addition and subtraction', () => {
		expect(parse('240 + 18%')).toEqual({
			kind: 'expression',
			expr: '(240) * (1 + (18 / 100))'
		});
		expect(parse('240 - 18%')).toEqual({
			kind: 'expression',
			expr: '(240) * (1 - (18 / 100))'
		});
	});
	it('handles subsequent nested percentages', () => {
		expect(parse('240 + 18% + 10%')).toEqual({
			kind: 'expression',
			expr: '((240) * (1 + (18 / 100))) * (1 + (10 / 100))'
		});
	});
	it('handles multiplication and standalone percentages', () => {
		expect(parse('240 * 18%')).toEqual({
			kind: 'expression',
			expr: '240 * (18 / 100)'
		});
	});
});

describe('target autocomplete parsing', () => {
	it('detects empty target autocomplete and retrieves same-category matches', () => {
		const p = parse('12 km to ');
		expect(p.kind).toBe('lookup_target');
		if (p.kind === 'lookup_target') {
			expect(p.expr).toBe('12 km');
			expect(p.target).toBe('');
			expect(p.matches.length).toBeGreaterThan(0);
			expect(p.matches[0].category.id).toBe('length');
		}
	});
	it('detects partial target autocomplete and filters same-category matches', () => {
		const p = parse('12 km to mil');
		expect(p.kind).toBe('lookup_target');
		if (p.kind === 'lookup_target') {
			expect(p.expr).toBe('12 km');
			expect(p.target).toBe('mil');
			const names = p.matches.map(m => m.unit.name.toLowerCase());
			expect(names).toContain('mile');
		}
	});
	it('falls back to global unit search if source unit cannot be identified', () => {
		const p = parse('1200 to usd');
		expect(p.kind).toBe('convert'); // exact match "usd" -> kind: convert
	});
	it('falls back to global unit search on partial RHS if LHS has no unit', () => {
		const p = parse('1200 to us');
		expect(p.kind).toBe('lookup_target');
		if (p.kind === 'lookup_target') {
			expect(p.expr).toBe('1200');
			expect(p.target).toBe('us');
			const names = p.matches.map(m => m.unit.id);
			expect(names).toContain('usd');
		}
	});
});

