import { FALLBACK_RATES } from './fallback';

const KEY = 'almanac.rates.v1';
const TTL_MS = 24 * 3600e3;
const API = 'https://open.er-api.com/v6/latest/USD';

interface StorageLike {
	getItem(k: string): string | null;
	setItem(k: string, v: string): void;
}

export interface RatesInfo {
	rates: Record<string, number>;
	asOf: string;
	stale: boolean;
}

export async function loadRates(
	storage: StorageLike,
	fetcher: typeof fetch = fetch
): Promise<RatesInfo> {
	let cached: { rates: Record<string, number>; ts: number; asOf: string } | null = null;
	try {
		const raw = storage.getItem(KEY);
		if (raw) cached = JSON.parse(raw);
	} catch {
		cached = null;
	}

	if (cached && Date.now() - cached.ts < TTL_MS)
		return { rates: cached.rates, asOf: cached.asOf, stale: false };

	try {
		const res = await fetcher(API);
		const data = await res.json();
		if (data?.result !== 'success' || !data.rates) throw new Error('bad payload');
		const asOf = data.time_last_update_utc ?? new Date().toUTCString();
		try {
			storage.setItem(KEY, JSON.stringify({ rates: data.rates, ts: Date.now(), asOf }));
		} catch {
			// storage full/blocked — caching is best-effort, still use the fresh rates
		}
		return { rates: data.rates, asOf, stale: false };
	} catch {
		if (cached) return { rates: cached.rates, asOf: cached.asOf, stale: true };
		return { rates: FALLBACK_RATES.rates, asOf: FALLBACK_RATES.asOf, stale: true };
	}
}
