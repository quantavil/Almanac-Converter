/** Bundled snapshot (units per USD), refreshed at build time when convenient. */
export const FALLBACK_RATES = {
	asOf: '2026-07-01 (bundled)',
	rates: {
		USD: 1, INR: 83, EUR: 0.92, GBP: 0.79, JPY: 150, AED: 3.6725,
		CAD: 1.35, AUD: 1.52, CNY: 7.2, CHF: 0.88, SGD: 1.34
	} as Record<string, number>
};
