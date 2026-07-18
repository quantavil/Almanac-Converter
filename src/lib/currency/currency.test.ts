import { describe, expect, it } from 'vitest';
import { loadRates } from './currency';
import { FALLBACK_RATES } from './fallback';

const memStorage = () => {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, v)
	};
};

const okFetch = (rates: Record<string, number>) => async () =>
	new Response(JSON.stringify({ result: 'success', rates, time_last_update_utc: 'Fri, 18 Jul 2026' }));

const failFetch = async () => {
	throw new Error('offline');
};

describe('loadRates', () => {
	it('fetches, caches, and reports fresh', async () => {
		const storage = memStorage();
		const r = await loadRates(storage, okFetch({ USD: 1, INR: 84.5 }));
		expect(r.stale).toBe(false);
		expect(r.rates.INR).toBe(84.5);
		expect(storage.getItem('almanac.rates.v1')).toContain('84.5');
	});
	it('uses cache when fresh (no fetch)', async () => {
		const storage = memStorage();
		storage.setItem('almanac.rates.v1', JSON.stringify({ rates: { USD: 1, INR: 80 }, ts: Date.now(), asOf: 'x' }));
		const r = await loadRates(storage, failFetch);
		expect(r.rates.INR).toBe(80);
		expect(r.stale).toBe(false);
	});
	it('falls back to stale cache when fetch fails', async () => {
		const storage = memStorage();
		storage.setItem(
			'almanac.rates.v1',
			JSON.stringify({ rates: { USD: 1, INR: 80 }, ts: Date.now() - 48 * 3600e3, asOf: 'old' })
		);
		const r = await loadRates(storage, failFetch);
		expect(r.rates.INR).toBe(80);
		expect(r.stale).toBe(true);
	});
	it('falls back to bundled rates with empty cache + no network', async () => {
		const r = await loadRates(memStorage(), failFetch);
		expect(r.rates).toEqual(FALLBACK_RATES.rates);
		expect(r.stale).toBe(true);
	});
});
