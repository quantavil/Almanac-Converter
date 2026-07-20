import { describe, it, expect } from 'vitest';
import { toWordsEn, toWordsIn, toRoman, fromRoman } from './numerals';

describe('toWordsEn', () => {
	it('handles small numbers', () => {
		expect(toWordsEn(0)).toBe('zero');
		expect(toWordsEn(7)).toBe('seven');
		expect(toWordsEn(19)).toBe('nineteen');
		expect(toWordsEn(42)).toBe('forty-two');
		expect(toWordsEn(100)).toBe('one hundred');
		expect(toWordsEn(305)).toBe('three hundred five');
	});
	it('handles large numbers with scales', () => {
		expect(toWordsEn(1234)).toBe('one thousand two hundred thirty-four');
		expect(toWordsEn(1000000)).toBe('one million');
		expect(toWordsEn(1234567)).toBe(
			'one million two hundred thirty-four thousand five hundred sixty-seven'
		);
	});
	it('handles negatives', () => {
		expect(toWordsEn(-45)).toBe('negative forty-five');
	});
	it('rejects non-integers', () => {
		expect(toWordsEn(1.5)).toBeNull();
		expect(toWordsEn(NaN)).toBeNull();
	});
});

describe('toWordsIn', () => {
	it('uses lakh/crore grouping', () => {
		expect(toWordsIn(100000)).toBe('one lakh');
		expect(toWordsIn(1234567)).toBe(
			'twelve lakh thirty-four thousand five hundred sixty-seven'
		);
		expect(toWordsIn(10000000)).toBe('one crore');
	});
	it('matches English below one lakh', () => {
		expect(toWordsIn(999)).toBe('nine hundred ninety-nine');
	});
});

describe('toRoman', () => {
	it('converts common values', () => {
		expect(toRoman(4)).toBe('IV');
		expect(toRoman(9)).toBe('IX');
		expect(toRoman(2026)).toBe('MMXXVI');
		expect(toRoman(3999)).toBe('MMMCMXCIX');
	});
	it('rejects out-of-range', () => {
		expect(toRoman(0)).toBeNull();
		expect(toRoman(4000)).toBeNull();
		expect(toRoman(1.5)).toBeNull();
	});
});

describe('fromRoman', () => {
	it('parses valid numerals', () => {
		expect(fromRoman('IV')).toBe(4);
		expect(fromRoman('mmxxvi')).toBe(2026);
		expect(fromRoman(' MCMXCIX ')).toBe(1999);
	});
	it('rejects non-canonical or invalid input', () => {
		expect(fromRoman('IIII')).toBeNull();
		expect(fromRoman('VX')).toBeNull();
		expect(fromRoman('ABC')).toBeNull();
		expect(fromRoman('')).toBeNull();
	});
});
