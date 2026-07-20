// Numeral conversions: integer ↔ words (English + Indian) and Roman numerals.
// Pure TS, no dependencies — same ethos as the registry/date modules.

const BELOW_20 = [
	'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
	'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
	'seventeen', 'eighteen', 'nineteen'
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Words for an integer in 0..999. */
function chunkToWords(n: number): string {
	if (n < 20) return BELOW_20[n];
	if (n < 100) {
		const ten = TENS[Math.floor(n / 10)];
		const one = n % 10;
		return one ? `${ten}-${BELOW_20[one]}` : ten;
	}
	const hundred = BELOW_20[Math.floor(n / 100)];
	const rest = n % 100;
	return rest ? `${hundred} hundred ${chunkToWords(rest)}` : `${hundred} hundred`;
}

// International short scale, grouped in thousands.
const SCALES_EN = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];
// Indian system: first group is 3 digits, then groups of 2.
const SCALES_IN = ['thousand', 'lakh', 'crore', 'arab', 'kharab'];

/** Integer → English words, e.g. 1234 → "one thousand two hundred thirty-four". */
export function toWordsEn(n: number): string | null {
	if (!Number.isSafeInteger(n)) return null;
	if (n === 0) return 'zero';
	const neg = n < 0;
	let rest = Math.abs(n);

	const groups: number[] = [];
	while (rest > 0) {
		groups.push(rest % 1000);
		rest = Math.floor(rest / 1000);
	}
	if (groups.length > SCALES_EN.length) return null;

	const parts: string[] = [];
	for (let i = groups.length - 1; i >= 0; i--) {
		if (groups[i] === 0) continue;
		const scale = SCALES_EN[i];
		parts.push(scale ? `${chunkToWords(groups[i])} ${scale}` : chunkToWords(groups[i]));
	}
	return (neg ? 'negative ' : '') + parts.join(' ');
}

/** Integer → Indian words, e.g. 1234567 → "twelve lakh thirty-four thousand five hundred sixty-seven". */
export function toWordsIn(n: number): string | null {
	if (!Number.isSafeInteger(n)) return null;
	if (n === 0) return 'zero';
	const neg = n < 0;
	let rest = Math.abs(n);

	const last3 = rest % 1000;
	rest = Math.floor(rest / 1000);

	const groups: number[] = [];
	while (rest > 0) {
		groups.push(rest % 100);
		rest = Math.floor(rest / 100);
	}
	if (groups.length > SCALES_IN.length) return null;

	const parts: string[] = [];
	for (let i = groups.length - 1; i >= 0; i--) {
		if (groups[i] === 0) continue;
		parts.push(`${chunkToWords(groups[i])} ${SCALES_IN[i]}`);
	}
	if (last3) parts.push(chunkToWords(last3));
	return (neg ? 'negative ' : '') + parts.join(' ');
}

const ROMAN: [number, string][] = [
	[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
	[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];
const ROMAN_VALUE: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** Integer 1..3999 → Roman numeral, e.g. 2026 → "MMXXVI". */
export function toRoman(n: number): string | null {
	if (!Number.isInteger(n) || n < 1 || n > 3999) return null;
	let out = '';
	for (const [value, sym] of ROMAN) {
		while (n >= value) {
			out += sym;
			n -= value;
		}
	}
	return out;
}

/** Roman numeral → integer; rejects non-canonical forms (e.g. "IIII", "VX"). */
export function fromRoman(s: string): number | null {
	const str = s.trim().toUpperCase();
	if (!/^[MDCLXVI]+$/.test(str)) return null;
	let total = 0;
	for (let i = 0; i < str.length; i++) {
		const cur = ROMAN_VALUE[str[i]];
		const next = ROMAN_VALUE[str[i + 1]];
		total += next && cur < next ? -cur : cur;
	}
	// only accept input that round-trips to its canonical spelling
	return toRoman(total) === str ? total : null;
}
