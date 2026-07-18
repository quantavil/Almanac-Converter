/** Format a number to `sig` significant digits; exponential fallback outside 1e-6..1e12. */
export function formatSigFigs(n: number, sig = 6): string {
	if (!Number.isFinite(n)) return '—';
	if (n === 0) return '0';
	const abs = Math.abs(n);
	if (abs >= 1e12 || abs < 1e-6) return n.toExponential(4);
	return String(parseFloat(n.toPrecision(sig)));
}
