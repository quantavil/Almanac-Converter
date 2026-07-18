import { describe, expect, it } from 'vitest';
import { formatNumber, formatSigFigs } from './format';

describe('formatSigFigs', () => {
	it('formats to 6 significant digits by default', () => {
		expect(formatSigFigs(7.456454306)).toBe('7.45645');
		expect(formatSigFigs(16.40419948)).toBe('16.4042');
	});
	it('never renders a misleading zero for small values', () => {
		expect(formatSigFigs(0.0004)).toBe('0.0004');
		expect(formatSigFigs(0.000621371)).toBe('0.000621371');
	});
	it('strips trailing zeros', () => {
		expect(formatSigFigs(500)).toBe('500');
		expect(formatSigFigs(1.5)).toBe('1.5');
	});
	it('falls back to exponential for extreme magnitudes', () => {
		expect(formatSigFigs(1.23456789e13)).toBe('1.2346e+13');
		expect(formatSigFigs(0.0000001234)).toBe('1.2340e-7');
	});
	it('handles zero and non-finite', () => {
		expect(formatSigFigs(0)).toBe('0');
		expect(formatSigFigs(Infinity)).toBe('—');
		expect(formatSigFigs(NaN)).toBe('—');
	});
});

describe('formatNumber notations', () => {
	it('auto matches formatSigFigs', () => {
		expect(formatNumber(7.456454306)).toBe('7.45645');
		expect(formatNumber(1.23456789e13)).toBe('1.2346e+13');
	});
	it('decimal always expands, never an exponent', () => {
		expect(formatNumber(1234567890123, 'decimal')).toBe('1234570000000');
		expect(formatNumber(0.0000001234, 'decimal')).toBe('0.0000001234');
		expect(formatNumber(500, 'decimal')).toBe('500');
	});
	it('scientific normalizes mantissa to [1,10)', () => {
		expect(formatNumber(1609.344, 'scientific')).toBe('1.60934e+3');
		expect(formatNumber(0.5, 'scientific')).toBe('5e-1');
		expect(formatNumber(-1609.344, 'scientific')).toBe('-1.60934e+3');
	});
	it('engineering uses exponents in steps of 3', () => {
		expect(formatNumber(1609.344, 'engineering')).toBe('1.60934e+3');
		expect(formatNumber(0.5, 'engineering')).toBe('500e-3');
		expect(formatNumber(12345678, 'engineering')).toBe('12.3457e+6');
	});
	it('all notations handle zero and non-finite', () => {
		for (const nt of ['auto', 'decimal', 'scientific', 'engineering'] as const) {
			expect(formatNumber(0, nt)).toBe('0');
			expect(formatNumber(NaN, nt)).toBe('—');
			expect(formatNumber(Infinity, nt)).toBe('—');
		}
	});
});
