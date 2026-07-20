<script lang="ts">
	import { copyWithToast } from '$lib/clipboard';
	import { toWordsEn, toWordsIn, toRoman, fromRoman } from '$lib/numerals/numerals';

	let numStr = $state('');
	let romanStr = $state('');
	let sourceId = $state<string | null>(null);

	// canonical integer behind both inputs; null when empty or invalid
	let n = $state<number | null>(null);

	function onNum(raw: string) {
		sourceId = 'num';
		const sanitized = raw.replace(/[^0-9-]/g, '');
		numStr = sanitized;
		if (sanitized === '' || sanitized === '-') {
			n = null;
			romanStr = '';
			return;
		}
		const parsed = parseInt(sanitized, 10);
		n = Number.isSafeInteger(parsed) ? parsed : null;
		romanStr = n !== null ? (toRoman(n) ?? '') : '';
	}

	function onRoman(raw: string) {
		sourceId = 'roman';
		const sanitized = raw.replace(/[^mdclxviMDCLXVI]/g, '').toUpperCase();
		romanStr = sanitized;
		if (sanitized === '') {
			n = null;
			numStr = '';
			return;
		}
		n = fromRoman(sanitized);
		numStr = n !== null ? String(n) : '';
	}

	let wordsEn = $derived(n !== null ? toWordsEn(n) : null);
	let wordsIn = $derived(n !== null ? toWordsIn(n) : null);
</script>

<div class="grid">
	<label class="cell" class:source={sourceId === 'num'}>
		<span class="cell-label">Number</span>
		<input
			type="text"
			inputmode="numeric"
			placeholder="0"
			value={numStr}
			oninput={(e) => onNum(e.currentTarget.value)}
		/>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); if (numStr) copyWithToast(numStr); }}>⧉</button>
	</label>

	<label class="cell" class:source={sourceId === 'roman'}>
		<span class="cell-label">Roman (1–3999)</span>
		<input
			type="text"
			placeholder="—"
			value={romanStr}
			oninput={(e) => onRoman(e.currentTarget.value)}
		/>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); if (romanStr) copyWithToast(romanStr); }}>⧉</button>
	</label>

	<div class="cell">
		<span class="cell-label">English words</span>
		<div class="readout">{wordsEn ?? '—'}</div>
		<button class="copy" title="Copy" onclick={() => { if (wordsEn) copyWithToast(wordsEn); }}>⧉</button>
	</div>

	<div class="cell">
		<span class="cell-label">Indian words</span>
		<div class="readout">{wordsIn ?? '—'}</div>
		<button class="copy" title="Copy" onclick={() => { if (wordsIn) copyWithToast(wordsIn); }}>⧉</button>
	</div>
</div>

<style>
	.readout {
		min-height: 1.4em;
		padding-right: 22px;
		font: 600 19px var(--sans);
		color: var(--ink);
		word-break: break-word;
		text-transform: capitalize;
	}
</style>
