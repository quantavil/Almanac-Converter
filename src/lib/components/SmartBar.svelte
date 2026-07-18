<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { parse, type Parsed } from '$lib/parser/parse';
	import { evaluateParsed, type EvalResult } from '$lib/engine/engine';
	import { recordHistory } from '$lib/stores/history';
	import { activeCategory, notation, precision } from '$lib/stores/settings';
	import { copyWithToast } from '$lib/clipboard';
	import { categories } from '$lib/registry';
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
		if (parsed.kind === 'lookup' || parsed.kind === 'lookup_target') selected = 0;
		if (parsed.kind === 'empty' || parsed.kind === 'lookup' || parsed.kind === 'lookup_target') {
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

	/** Log the current result to history (deduped by pushEntry). */
	function logResult() {
		if (result?.ok) recordHistory(query, `${result.value}${result.unit ? ' ' + result.unit : ''}`);
	}

	async function copyResult() {
		if (!result?.ok) return;
		const success = await copyWithToast(result.value);
		if (success) logResult();
	}

	function jumpTo(categoryId: string) {
		activeCategory.set(categoryId);
		query = '';
		run('');
	}

	function swap() {
		const p = parsed;
		if (p.kind !== 'convert') return;
		if (p.fast) {
			const cat = categories[p.fast.categoryId];
			const fromUnit = cat.units.find((u) => u.id === p.fast!.fromId);
			const toUnit = cat.units.find((u) => u.id === p.fast!.toId);
			if (fromUnit && toUnit) {
				query = `${p.fast.value} ${toUnit.symbol} to ${fromUnit.symbol}`;
				run(query);
				inputEl?.focus();
				return;
			}
		}
		const m = p.expr.match(/^(-?[\d,]*\.?\d+)\s*(.+)$/);
		if (m) {
			const val = m[1];
			const fromUnitStr = m[2].trim();
			query = `${val} ${p.target} to ${fromUnitStr}`;
			run(query);
			inputEl?.focus();
		}
	}

	function onKeydown(e: KeyboardEvent) {
		const p = parsed;
		if ((p.kind === 'lookup' || p.kind === 'lookup_target') && p.matches.length) {
			const n = Math.min(p.matches.length, 5);
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
				const m = p.matches[selected] ?? p.matches[0];
				if (m) {
					if (p.kind === 'lookup') {
						jumpTo(m.category.id);
					} else {
						query = `${p.expr} to ${m.unit.symbol}`;
						run(query);
						inputEl?.focus();
					}
				}
				return;
			}
		}
		if (e.key === 'Enter') {
			logResult(); // record even if the clipboard copy is blocked
			copyResult();
		}
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
			<Suggestions matches={parsed.matches} {selected} onjump={jumpTo} />
		{:else if parsed.kind === 'lookup_target'}
			{@const p = parsed}
			<Suggestions
				matches={p.matches}
				{selected}
				mode="convert"
				onselect={(m) => {
					query = `${p.expr} to ${m.unit.symbol}`;
					run(query);
					inputEl?.focus();
				}}
			/>
		{:else if result?.ok}
			<ResultCard value={result.value} unit={result.unit} multi={result.multi} fast={result.fast} oncopy={copyResult} onswap={swap} />
		{:else if result && !result.ok && result.error}
			<div class="result-error">{result.error}</div>
		{/if}
	</div>
</div>
