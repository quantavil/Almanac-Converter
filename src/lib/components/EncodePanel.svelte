<script lang="ts">
	import { copyWithToast } from '$lib/clipboard';
	import {
		textToBase64,
		base64ToText,
		textToUrl,
		urlToText,
		textToHex,
		hexToText
	} from '$lib/encode/encode';

	// each cell keeps its own editable string so mid-typing invalid states survive
	let text = $state('');
	let b64 = $state('');
	let url = $state('');
	let hex = $state('');
	let sourceId = $state<string | null>('text');
	let invalidId = $state<string | null>(null);

	let taText = $state<HTMLTextAreaElement>();
	let taB64 = $state<HTMLTextAreaElement>();
	let taUrl = $state<HTMLTextAreaElement>();
	let taHex = $state<HTMLTextAreaElement>();

	// grow each textarea to fit its content; runs after the DOM reflects new values
	$effect(() => {
		void [text, b64, url, hex];
		for (const el of [taText, taB64, taUrl, taHex]) {
			if (!el) continue;
			el.style.height = 'auto';
			el.style.height = `${el.scrollHeight}px`;
		}
	});

	// re-derive every cell except the one being edited from the current plaintext
	function derive(t: string, keep: string) {
		text = t;
		invalidId = null;
		if (keep !== 'b64') b64 = textToBase64(t);
		if (keep !== 'url') url = textToUrl(t);
		if (keep !== 'hex') hex = textToHex(t);
	}

	function onText(raw: string) {
		sourceId = 'text';
		derive(raw, 'text');
	}
	function onB64(raw: string) {
		sourceId = 'b64';
		b64 = raw;
		const t = base64ToText(raw);
		if (t !== null) derive(t, 'b64');
		else invalidId = raw ? 'b64' : null;
	}
	function onUrl(raw: string) {
		sourceId = 'url';
		url = raw;
		const t = urlToText(raw);
		if (t !== null) derive(t, 'url');
		else invalidId = raw ? 'url' : null;
	}
	function onHex(raw: string) {
		sourceId = 'hex';
		hex = raw;
		const t = hexToText(raw);
		if (t !== null) derive(t, 'hex');
		else invalidId = raw ? 'hex' : null;
	}
</script>

<div class="grid">
	<label class="cell" class:source={sourceId === 'text'}>
		<span class="cell-label">Text</span>
		<textarea rows="1" placeholder="type text…" bind:this={taText} value={text} oninput={(e) => onText(e.currentTarget.value)}></textarea>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); if (text) copyWithToast(text); }}>⧉</button>
	</label>

	<label class="cell" class:source={sourceId === 'b64'} class:invalid={invalidId === 'b64'}>
		<span class="cell-label">Base64</span>
		<textarea rows="1" placeholder="—" bind:this={taB64} value={b64} oninput={(e) => onB64(e.currentTarget.value)}></textarea>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); if (b64) copyWithToast(b64); }}>⧉</button>
	</label>

	<label class="cell" class:source={sourceId === 'url'} class:invalid={invalidId === 'url'}>
		<span class="cell-label">URL-encoded</span>
		<textarea rows="1" placeholder="—" bind:this={taUrl} value={url} oninput={(e) => onUrl(e.currentTarget.value)}></textarea>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); if (url) copyWithToast(url); }}>⧉</button>
	</label>

	<label class="cell" class:source={sourceId === 'hex'} class:invalid={invalidId === 'hex'}>
		<span class="cell-label">Hex (UTF-8)</span>
		<textarea rows="1" placeholder="—" bind:this={taHex} value={hex} oninput={(e) => onHex(e.currentTarget.value)}></textarea>
		<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); if (hex) copyWithToast(hex); }}>⧉</button>
	</label>
</div>

<style>
	.cell textarea {
		width: 100%;
		border: 0;
		outline: none;
		background: transparent;
		color: var(--ink);
		font: 600 19px var(--sans);
		padding: 2px 0;
		resize: none;
		overflow: hidden;
		line-height: 1.35;
		word-break: break-word;
		display: block;
	}
	.cell.invalid {
		border-color: color-mix(in srgb, red 45%, var(--line));
	}
</style>
