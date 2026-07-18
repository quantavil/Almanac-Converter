<script lang="ts">
	import { onMount } from 'svelte';
	import SmartBar from '$lib/components/SmartBar.svelte';
	import CategoryNav from '$lib/components/CategoryNav.svelte';
	import NotationToggle from '$lib/components/NotationToggle.svelte';
	import PrecisionStepper from '$lib/components/PrecisionStepper.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import UnitGrid from '$lib/components/UnitGrid.svelte';
	import DatePanel from '$lib/components/DatePanel.svelte';
	import HelpModal from '$lib/components/HelpModal.svelte';
	import HistoryPanel from '$lib/components/HistoryPanel.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { activeCategory } from '$lib/stores/settings';
	import { ratesStale } from '$lib/stores/rates';
	import { loadRates } from '$lib/currency/currency';
	import { loadEngine, injectRates } from '$lib/engine/engine';

	let smartBar = $state<SmartBar | null>(null);
	let showHelp = $state(false);

	onMount(() => {
		// engine + rates load in parallel; neither blocks first paint
		const engineReady = loadEngine();
		loadRates(localStorage)
			.then(async (info) => {
				ratesStale.set(info.stale);
				await engineReady;
				injectRates(info.rates);
			})
			.catch(() => {
				// engine import failed (offline/CDN) — the smart bar surfaces its own
				// error on use; nothing to do here but avoid an unhandled rejection
			});

		// type-anywhere: printable keys (or "/") focus the bar and start a query
		function onWindowKey(e: KeyboardEvent) {
			const t = e.target as HTMLElement | null;
			if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === '/') {
				e.preventDefault();
				smartBar?.focus();
			} else if (e.key.length === 1 && /\S/.test(e.key)) {
				e.preventDefault();
				smartBar?.append(e.key);
			}
		}
		window.addEventListener('keydown', onWindowKey);
		return () => window.removeEventListener('keydown', onWindowKey);
	});
</script>

<header class="masthead">
	<div>
		<h1>Almanac Converter</h1>
		<div class="tagline">Units · Currency · Calculation</div>
	</div>
	<div class="masthead-controls">
		<ThemeToggle />
		<PrecisionStepper />
		<NotationToggle />
		<button class="help-btn" onclick={() => showHelp = true} aria-label="Show help guide">?</button>
	</div>
</header>

<SmartBar bind:this={smartBar} />
<CategoryNav />
{#if $activeCategory === 'date'}
	<DatePanel />
{:else}
	<UnitGrid categoryId={$activeCategory} />
{/if}
<HistoryPanel onrerun={(q) => smartBar?.setQuery(q)} />
<Toast />

<HelpModal bind:isOpen={showHelp} onselect={(code) => smartBar?.setQuery(code)} />
