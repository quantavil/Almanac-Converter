<script lang="ts">
	import { onMount } from 'svelte';
	import SmartBar from '$lib/components/SmartBar.svelte';
	import CategoryNav from '$lib/components/CategoryNav.svelte';
	import UnitGrid from '$lib/components/UnitGrid.svelte';
	import HistoryPanel from '$lib/components/HistoryPanel.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { activeCategory } from '$lib/stores/settings';
	import { ratesInfo } from '$lib/stores/rates';
	import { loadRates } from '$lib/currency/currency';
	import { loadEngine, injectRates } from '$lib/engine/engine';

	let smartBar = $state<SmartBar | null>(null);

	onMount(async () => {
		// non-blocking: engine + rates load in background
		const info = await loadRates(localStorage);
		ratesInfo.set(info);
		await loadEngine();
		injectRates(info.rates);
	});
</script>

<header class="masthead">
	<div>
		<h1>Almanac Converter</h1>
		<div class="tagline">Units · Currency · Calculation</div>
	</div>
	{#if $ratesInfo}
		<div class="rates-badge" class:stale={$ratesInfo.stale}>
			rates as of {$ratesInfo.asOf}{$ratesInfo.stale ? ' (offline)' : ''}
		</div>
	{/if}
</header>

<SmartBar bind:this={smartBar} />
<CategoryNav />
<UnitGrid categoryId={$activeCategory} />
<HistoryPanel onrerun={(q) => smartBar?.setQuery(q)} />
<Toast />
