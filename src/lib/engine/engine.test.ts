import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateParsed, injectRates, loadEngine } from './engine';
import { parse } from '../parser/parse';

beforeAll(async () => {
	await loadEngine();
	injectRates({ INR: 83, EUR: 0.92 });
});

const run = (q: string) => evaluateParsed(parse(q));

describe('conversions', () => {
	it('12 km to mi', async () => {
		const r = await run('12 km to mi');
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value).toBe('7.45645');
			expect(r.unit).toBe('mi');
		}
	});
	it('unit math: 3 ft + 12 in in cm = 121.92 cm', async () => {
		const r = await run('3 ft + 12 in in cm');
		if (r.ok) expect(r.value).toBe('121.92');
		expect(r.ok).toBe(true);
	});
	it('regional: 1 bigha to m^2', async () => {
		const r = await run('1 bigha to m^2');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(2529.28, 1);
	});
	it('currency: 100 usd to inr = 8300', async () => {
		const r = await run('100 usd to inr');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(8300, 0);
	});
	it('fuel economy reciprocal via registry: 10 l/100km to mpg', async () => {
		const r = await run('10 l/100km to mpg');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(23.5215, 3);
	});
});

describe('plain math', () => {
	it('1250 * 1.08', async () => {
		const r = await run('1250 * 1.08');
		if (r.ok) expect(r.value).toBe('1350');
	});
});

describe('errors are typed and friendly', () => {
	it('unknown unit', async () => {
		const r = await run('12 kmm to mi');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/unknown|undefined/i);
	});
	it('dimension mismatch', async () => {
		const r = await run('12 km to kg');
		expect(r.ok).toBe(false);
	});
});
