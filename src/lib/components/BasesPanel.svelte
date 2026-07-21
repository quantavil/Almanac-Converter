<script lang="ts">
	import { copyWithToast } from '$lib/clipboard';

	const BASES: Record<string, { prefix: string; radix: number; junk: RegExp }> = {
		bin: { prefix: '0b', radix: 2, junk: /[^01]/g },
		oct: { prefix: '0o', radix: 8, junk: /[^0-7]/g },
		dec: { prefix: '', radix: 10, junk: /[^0-9]/g },
		hex: { prefix: '0x', radix: 16, junk: /[^0-9a-fA-F]/g }
	};

	let values = $state<Record<string, string>>({ dec: '', hex: '', bin: '', oct: '' });
	let sourceId = $state<string | null>(null);

	/** Keep a single leading "-", drop an optional matching prefix, strip anything
	 *  outside the base's digit set. Guarantees the result parses (or is empty). */
	function sanitize(id: string, raw: string): string {
		const { prefix, junk } = BASES[id];
		const neg = raw.startsWith('-');
		let body = neg ? raw.slice(1) : raw;
		if (prefix && body.toLowerCase().startsWith(prefix)) body = body.slice(2);
		return (neg ? '-' : '') + body.replace(junk, '');
	}

	function onInput(id: string, raw: string) {
		sourceId = id;
		const s = sanitize(id, raw);
		values[id] = s;

		if (s === '' || s === '-') {
			for (const k of Object.keys(values)) if (k !== id) values[k] = '';
			return;
		}

		// BigInt won't accept a sign in front of a "0x"/"0b"/"0o" prefix, so parse
		// the magnitude and re-apply the sign ourselves.
		const neg = s.startsWith('-');
		const abs = BigInt(BASES[id].prefix + (neg ? s.slice(1) : s));
		for (const k of Object.keys(BASES)) {
			if (k !== id) values[k] = (neg ? '-' : '') + abs.toString(BASES[k].radix);
		}
	}

	function copyCell(id: string) {
		const v = values[id];
		if (!v || v === '-') return;
		const neg = v.startsWith('-');
		copyWithToast((neg ? '-' : '') + BASES[id].prefix + (neg ? v.slice(1) : v));
	}
</script>

<div class="grid">
	<label class="cell" class:source={sourceId === 'bin'}>
		<span class="cell-label">Binary</span>
		<div class="input-with-prefix">
			<span class="prefix-badge">0b</span>
			<input
				type="text"
				placeholder="0"
				value={values.bin}
				oninput={(e) => onInput('bin', e.currentTarget.value)}
			/>
		</div>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell('bin'); }}>⧉</button>
	</label>

	<label class="cell" class:source={sourceId === 'oct'}>
		<span class="cell-label">Octal</span>
		<div class="input-with-prefix">
			<span class="prefix-badge">0o</span>
			<input
				type="text"
				placeholder="0"
				value={values.oct}
				oninput={(e) => onInput('oct', e.currentTarget.value)}
			/>
		</div>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell('oct'); }}>⧉</button>
	</label>

	<label class="cell" class:source={sourceId === 'dec'}>
		<span class="cell-label">Decimal</span>
		<input
			type="text"
			inputmode="numeric"
			placeholder="0"
			value={values.dec}
			oninput={(e) => onInput('dec', e.currentTarget.value)}
		/>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell('dec'); }}>⧉</button>
	</label>
	
	<label class="cell" class:source={sourceId === 'hex'}>
		<span class="cell-label">Hexadecimal</span>
		<div class="input-with-prefix">
			<span class="prefix-badge">0x</span>
			<input
				type="text"
				placeholder="0"
				value={values.hex}
				oninput={(e) => onInput('hex', e.currentTarget.value)}
			/>
		</div>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell('hex'); }}>⧉</button>
	</label>
</div>

<style>
	.input-with-prefix {
		display: flex;
		align-items: center;
		gap: 2px;
		width: 100%;
	}
	.prefix-badge {
		font: 600 19px var(--sans);
		color: var(--ink-soft);
		user-select: none;
		margin-top: 1px;
	}
</style>
