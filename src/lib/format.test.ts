import { describe, expect, it } from 'vitest';
import { formatSigFigs } from './format';

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
