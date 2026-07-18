/** Bundled snapshot (units per USD), refreshed at build time when convenient. */
export const FALLBACK_RATES = {
	asOf: '2026-07-01 (bundled)',
	rates: {
		USD: 1, INR: 83, EUR: 0.92, GBP: 0.79, JPY: 150, AED: 3.6725,
		CAD: 1.35, AUD: 1.52, CNY: 7.2, CHF: 0.88, SGD: 1.34,
		HKD: 7.8, NZD: 1.65, KRW: 1350, BRL: 5.4, ZAR: 18, RUB: 92, MXN: 18,
		TRY: 33, SEK: 10.5, NOK: 10.7, DKK: 6.9, PLN: 4, THB: 36, IDR: 16000,
		MYR: 4.7, PHP: 58, SAR: 3.75, PKR: 280, BDT: 118, NPR: 133, LKR: 300,
		EGP: 48, ILS: 3.7, TWD: 32
	} as Record<string, number>
};
