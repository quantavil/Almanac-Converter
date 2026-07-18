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
