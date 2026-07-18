<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { parse, type Parsed } from '$lib/parser/parse';
	import { evaluateParsed, type EvalResult } from '$lib/engine/engine';
	import { recordHistory } from '$lib/stores/history';
	import { showToast } from '$lib/stores/toast';
	import { activeCategory, notation, precision } from '$lib/stores/settings';
	import { copyText } from '$lib/clipboard';
	import type { UnitRef } from '$lib/registry';
	import ResultCard from './ResultCard.svelte';
	import Suggestions from './Suggestions.svelte';

	let inputEl: HTMLInputElement;
	let query = $state('');
	let parsed = $state<Parsed>({ kind: 'empty' });
	let result = $state<EvalResult | null>(null);
	let selected = $state(0); // highlighted suggestion index
	let seq = 0; // stale-async guard
	let evalTimer: ReturnType<typeof setTimeout>;
	let urlTimer: ReturnType<typeof setTimeout>;

	// mirror the query into ?q= on success (debounced) so links are shareable
	// without pressing Enter; clear it when there's nothing to share.
	function scheduleUrl(q: string, ok: boolean) {
		clearTimeout(urlTimer);
		urlTimer = setTimeout(() => {
			const url = new URL(location.href);
			if (ok && q) url.searchParams.set('q', q);
			else url.searchParams.delete('q');
			history.replaceState(null, '', url);
		}, 400);
	}

	function run(q: string) {
		parsed = parse(q);
		clearTimeout(evalTimer);
		if (parsed.kind === 'lookup') selected = 0;
		if (parsed.kind === 'empty' || parsed.kind === 'lookup') {
			result = null;
			scheduleUrl(q, false);
			return;
		}
		const p = parsed;
		// light debounce: parsing/suggestions are instant above; only the mathjs
		// evaluation waits a beat so fast typing doesn't thrash the engine.
		evalTimer = setTimeout(async () => {
			const my = ++seq;
			const r = await evaluateParsed(p, $notation, $precision);
			if (my === seq) {
				result = r;
				scheduleUrl(q, r.ok);
			}
		}, 90);
	}

	// re-render the current result when notation/precision change.
	// untrack: run() reads and writes parsed/result — tracking them would loop.
	$effect(() => {
		$notation;
		$precision;
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
		const success = await copyText(result.value);
		if (success) {
			showToast('Copied to clipboard');
			recordHistory(query, `${result.value}${result.unit ? ' ' + result.unit : ''}`);
		} else {
			showToast('Failed to copy to clipboard');
		}
	}

	function jump(m: UnitRef | undefined) {
		if (m) {
			activeCategory.set(m.category.id);
			query = '';
			run('');
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (parsed.kind === 'lookup' && parsed.matches.length) {
			const n = Math.min(parsed.matches.length, 5);
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selected = (selected + 1) % n;
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				selected = (selected - 1 + n) % n;
				return;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				jump(parsed.matches[selected] ?? parsed.matches[0]);
				return;
			}
		}
		if (e.key === 'Enter') copyResult();
		else if (e.key === 'Escape') {
			query = '';
			run('');
		}
	}

	export function setQuery(q: string) {
		query = q;
		run(q);
	}
	export function focus() {
		inputEl?.focus();
	}
	/** used by type-anywhere: focus the bar and append the pressed key */
	export function append(ch: string) {
		query += ch;
		run(query);
		inputEl?.focus();
	}

	onMount(() => {
		const q = new URLSearchParams(location.search).get('q');
		if (q) setQuery(q);
	});
</script>

<div class="smartbar-wrap">
	<input
		bind:this={inputEl}
		class="smartbar"
		value={query}
		oninput={onInput}
		onkeydown={onKeydown}
		placeholder="Try: 12 km to mi · 5 ft 10 in to cm · 2 lakh inr to usd · 1250 * 1.08"
		aria-label="Smart converter input"
	/>
	<div aria-live="polite">
		{#if parsed.kind === 'lookup'}
			<Suggestions matches={parsed.matches} {selected} onjump={(id) => {
				activeCategory.set(id);
				query = '';
				run('');
			}} />
		{:else if result?.ok}
			<ResultCard value={result.value} unit={result.unit} fast={result.fast} oncopy={copyResult} />
		{:else if result && !result.ok && result.error}
			<div class="result-error">{result.error}</div>
		{/if}
	</div>
</div>
