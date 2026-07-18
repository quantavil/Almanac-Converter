<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { parse, type Parsed } from '$lib/parser/parse';
	import { evaluateParsed, type EvalResult } from '$lib/engine/engine';
	import { recordHistory } from '$lib/stores/history';
	import { showToast } from '$lib/stores/toast';
	import { activeCategory, notation } from '$lib/stores/settings';
	import ResultCard from './ResultCard.svelte';
	import Suggestions from './Suggestions.svelte';

	let query = $state('');
	let parsed = $state<Parsed>({ kind: 'empty' });
	let result = $state<EvalResult | null>(null);
	let seq = 0; // stale-async guard

	async function run(q: string) {
		const my = ++seq;
		parsed = parse(q);
		if (parsed.kind === 'empty' || parsed.kind === 'lookup') {
			result = null;
			return;
		}
		const r = await evaluateParsed(parsed, $notation);
		if (my === seq) result = r;
	}

	// re-render the current result when the notation toggle changes.
	// untrack: run() reads and writes `parsed`/`result` — tracking them would loop.
	$effect(() => {
		$notation;
		untrack(() => {
			if (query) run(query);
		});
	});

	function onInput(e: Event) {
		query = (e.currentTarget as HTMLInputElement).value;
		run(query);
	}

	async function copyResult() {
		if (!result?.ok) return;
		await navigator.clipboard.writeText(result.value);
		showToast('Copied to clipboard');
		recordHistory(query, `${result.value}${result.unit ? ' ' + result.unit : ''}`);
		const url = new URL(location.href);
		url.searchParams.set('q', query);
		history.replaceState(null, '', url);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') copyResult();
	}

	export function setQuery(q: string) {
		query = q;
		run(q);
	}

	onMount(() => {
		const q = new URLSearchParams(location.search).get('q');
		if (q) setQuery(q);
	});
</script>

<div class="smartbar-wrap">
	<input
		class="smartbar"
		value={query}
		oninput={onInput}
		onkeydown={onKeydown}
		placeholder="Try: 12 km to mi · 3 ft + 12 in in cm · 100 usd to inr · 1250 * 1.08"
		aria-label="Smart converter input"
	/>
	{#if parsed.kind === 'lookup'}
		<Suggestions matches={parsed.matches} onjump={(id) => activeCategory.set(id)} />
	{:else if result?.ok}
		<ResultCard value={result.value} unit={result.unit} fast={result.fast} oncopy={copyResult} />
	{:else if result && !result.ok && result.error}
		<div class="result-error">{result.error}</div>
	{/if}
</div>
