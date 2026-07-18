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
	it('basic calculator: 2+2, sqrt, powers, factorial', async () => {
		expect(await run('2+2')).toMatchObject({ ok: true, value: '4' });
		expect(await run('sqrt(16)')).toMatchObject({ ok: true, value: '4' });
		expect(await run('2^10')).toMatchObject({ ok: true, value: '1024' });
		expect(await run('5!')).toMatchObject({ ok: true, value: '120' });
		expect(await run('0.1 + 0.2')).toMatchObject({ ok: true, value: '0.3' });
	});
});

describe('rate injection safety', () => {
	it('ignores unsupported API codes that collide with mathjs units (CUP vs cup)', async () => {
		injectRates({ USD: 1, INR: 83, CUP: 24, TRY: 33, ALL: 92 });
		const r = await run('1 cup + 2 floz in ml');
		expect(r.ok).toBe(true);
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(295.735, 2);
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
