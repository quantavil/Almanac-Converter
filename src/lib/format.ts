export type Notation = 'auto' | 'decimal' | 'scientific' | 'engineering';

export const NOTATIONS: { id: Notation; label: string }[] = [
	{ id: 'auto', label: 'Auto' },
	{ id: 'decimal', label: 'Decimal' },
	{ id: 'scientific', label: 'Scientific' },
	{ id: 'engineering', label: 'Engineering' }
];

/**
 * Format a number to `sig` significant digits in the requested notation.
 * auto: plain decimal inside 1e-6..1e12, exponential outside.
 * decimal: always expanded, never an exponent.
 * scientific: mantissa in [1,10) × 10^e.
 * engineering: like scientific but exponent is a multiple of 3.
 */
export function formatNumber(n: number, notation: Notation = 'auto', sig = 6): string {
	if (!Number.isFinite(n)) return '—';
	if (n === 0) return '0';
	switch (notation) {
		case 'decimal':
			return n.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: sig });
		case 'scientific': {
			const [mantissa, exp] = n.toExponential(sig - 1).split('e');
			return `${parseFloat(mantissa)}e${exp}`;
		}
		case 'engineering': {
			const exp = Math.floor(Math.log10(Math.abs(n)) / 3) * 3;
			const mantissa = parseFloat((n / 10 ** exp).toPrecision(sig));
			return `${mantissa}e${exp >= 0 ? '+' : ''}${exp}`;
		}
		default: {
			const abs = Math.abs(n);
			if (abs >= 1e12 || abs < 1e-6) return n.toExponential(4);
			return String(parseFloat(n.toPrecision(sig)));
		}
	}
}

/** Auto-notation shorthand; the historical default formatter. */
export function formatSigFigs(n: number, sig = 6): string {
	return formatNumber(n, 'auto', sig);
}
