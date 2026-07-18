<script lang="ts">
	import { copyWithToast } from '$lib/clipboard';

	let values = $state<Record<string, string>>({
		dec: '',
		hex: '',
		bin: '',
		oct: ''
	});

	let sourceId = $state<string | null>(null);

	function parseToBigInt(val: string, base: string): bigint | null {
		let clean = val.trim();
		if (!clean) return null;

		const isNegative = clean.startsWith('-');
		if (isNegative) {
			clean = clean.slice(1);
		}

		// remove prefixes if typed/pasted
		if (clean.toLowerCase().startsWith('0x')) clean = clean.slice(2);
		if (clean.toLowerCase().startsWith('0b')) clean = clean.slice(2);
		if (clean.toLowerCase().startsWith('0o')) clean = clean.slice(2);

		if (!clean) return null;

		let prefix = '';
		if (base === 'hex') prefix = '0x';
		else if (base === 'bin') prefix = '0b';
		else if (base === 'oct') prefix = '0o';

		try {
			return BigInt((isNegative ? '-' : '') + prefix + clean);
		} catch {
			return null;
		}
	}

	function onInput(id: string, raw: string) {
		sourceId = id;
		
		// Sanitize input characters based on base
		let sanitized = raw;
		if (id === 'dec') {
			sanitized = raw.replace(/[^0-9-]/g, '');
		} else if (id === 'hex') {
			if (raw.toLowerCase().startsWith('-0x')) {
				sanitized = '-' + raw.slice(3).replace(/[^0-9a-fA-F]/g, '');
			} else if (raw.toLowerCase().startsWith('0x')) {
				sanitized = raw.slice(2).replace(/[^0-9a-fA-F]/g, '');
			} else {
				sanitized = raw.replace(/[^0-9a-fA-F-]/g, '');
			}
		} else if (id === 'bin') {
			if (raw.toLowerCase().startsWith('-0b')) {
				sanitized = '-' + raw.slice(3).replace(/[^01]/g, '');
			} else if (raw.toLowerCase().startsWith('0b')) {
				sanitized = raw.slice(2).replace(/[^01]/g, '');
			} else {
				sanitized = raw.replace(/[^01-]/g, '');
			}
		} else if (id === 'oct') {
			if (raw.toLowerCase().startsWith('-0o')) {
				sanitized = '-' + raw.slice(3).replace(/[^0-7]/g, '');
			} else if (raw.toLowerCase().startsWith('0o')) {
				sanitized = raw.slice(2).replace(/[^0-7]/g, '');
			} else {
				sanitized = raw.replace(/[^0-7-]/g, '');
			}
		}

		values[id] = sanitized;

		if (sanitized === '' || sanitized === '-') {
			for (const k of Object.keys(values)) {
				if (k !== id) values[k] = '';
			}
			return;
		}

		const val = parseToBigInt(sanitized, id);
		if (val !== null) {
			const isNeg = val < 0n;
			const absVal = isNeg ? -val : val;

			if (id !== 'dec') values.dec = val.toString(10);
			if (id !== 'hex') values.hex = (isNeg ? '-' : '') + absVal.toString(16);
			if (id !== 'bin') values.bin = (isNeg ? '-' : '') + absVal.toString(2);
			if (id !== 'oct') values.oct = (isNeg ? '-' : '') + absVal.toString(8);
		}
	}

	function copyCell(id: string) {
		const v = values[id];
		if (!v) return;
		
		let prefix = '';
		if (id === 'hex') prefix = '0x';
		else if (id === 'bin') prefix = '0b';
		else if (id === 'oct') prefix = '0o';

		const isNeg = v.startsWith('-');
		const clean = isNeg ? v.slice(1) : v;
		
		const copyText = (isNeg ? '-' : '') + (clean ? prefix + clean : '');
		copyWithToast(copyText || v);
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
