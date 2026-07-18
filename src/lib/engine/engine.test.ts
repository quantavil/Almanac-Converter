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
	it('currency arithmetic goes through mathjs: 12*3411 inr to usd', async () => {
		const r = await run('12*3411 inr to usd');
		expect(r.ok).toBe(true);
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo((12 * 3411) / 83, 2);
	});
	it('fuel economy is still blocked in expressions (non-linear)', async () => {
		const r = await run('10*2 l/100km to mpg');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/expressions yet/);
	});
});

describe('compound-unit math', () => {
	it('100 km / 2 h to mph', async () => {
		const r = await run('100 km / 2 h to mph');
		expect(r.ok).toBe(true);
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(31.0686, 3);
	});
	it('60 W * 3 h to kWh', async () => {
		const r = await run('60 W * 3 h to kWh');
		if (r.ok) expect(parseFloat(r.value)).toBeCloseTo(0.18, 4);
	});
});

describe('multi-target conversion', () => {
	it('10 km to mi, ft, m returns a row per target', async () => {
		const r = await run('10 km to mi, ft, m');
		expect(r.ok).toBe(true);
		if (r.ok && r.multi) {
			expect(r.multi.map((m) => m.unit)).toEqual(['mi', 'ft', 'm']);
			expect(parseFloat(r.multi[0].value)).toBeCloseTo(6.21371, 4);
			expect(r.value).toContain('\n');
		}
	});
	it('a mismatched target yields an error row, not a failure', async () => {
		const r = await run('10 km to mi, kg');
		expect(r.ok).toBe(true);
		if (r.ok && r.multi) {
			expect(r.multi[0].unit).toBe('mi');
			expect(r.multi[1].error).toBeTruthy();
		}
	});
	it('all targets failing collapses to a single error', async () => {
		const r = await run('12 zzz to mi, ft');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/zzz/);
	});
});

describe('base conversion', () => {
	it('255 to hex, bin, oct', async () => {
		const r = await run('255 to hex, bin, oct');
		if (r.ok && r.multi) expect(r.multi.map((m) => m.value)).toEqual(['0xff', '0b11111111', '0o377']);
	});
	it('0xff to dec', async () => {
		const r = await run('0xff to dec');
		if (r.ok && r.multi) expect(r.multi[0].value).toBe('255');
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
	it('registers CUP without overriding lowercase cup volume unit, and allows uppercase CUP currency conversion', async () => {
		injectRates({ USD: 1, INR: 83, CUP: 24, AFN: 92 });
		
		// 1. Lowercase cup still evaluates to volume
		const rVol = await run('1 cup + 2 floz in ml');
		expect(rVol.ok).toBe(true);
		if (rVol.ok) expect(parseFloat(rVol.value)).toBeCloseTo(295.735, 2);
		
		// 2. Uppercase CUP evaluates to Cuban Peso currency conversion
		const rCurr = await run('100 CUP to USD');
		expect(rCurr.ok).toBe(true);
		if (rCurr.ok) expect(parseFloat(rCurr.value)).toBeCloseTo(100 / 24, 2);

		// 3. Lowercase cup to USD fails with mismatch (volume can't convert to USD)
		const rFail = await run('100 cup to USD');
		expect(rFail.ok).toBe(false);

		// 4. Non-UI currency lowercase alias registers successfully if not colliding (AFN/afn)
		const rAfn = await run('100 afn to USD');
		expect(rAfn.ok).toBe(true);
		if (rAfn.ok) expect(parseFloat(rAfn.value)).toBeCloseTo(100 / 92, 2);
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

describe('date math engine', () => {
	it('standalone date to weekday', async () => {
		const r = await run('2026-12-25');
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value).toContain('Friday');
			expect(r.value).toContain('December 25, 2026');
		}
	});
	it('date arithmetic (+/-)', async () => {
		const r1 = await run('2026-07-18 + 45 days');
		expect(r1.ok).toBe(true);
		if (r1.ok) {
			expect(r1.value).toContain('Tuesday');
			expect(r1.value).toContain('September 1, 2026');
		}

		const r2 = await run('2026-07-18 - 3 weeks');
		expect(r2.ok).toBe(true);
		if (r2.ok) {
			expect(r2.value).toContain('Saturday');
			expect(r2.value).toContain('June 27, 2026');
		}
	});
	it('date difference (to)', async () => {
		const r = await run('2026-07-18 to 2026-09-01');
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value).toBe('45 days (6 weeks, 3 days)');
		}
	});
});

