<script lang="ts">
	import { onMount } from 'svelte';
	import SmartBar from '$lib/components/SmartBar.svelte';
	import CategoryNav from '$lib/components/CategoryNav.svelte';
	import NotationToggle from '$lib/components/NotationToggle.svelte';
	import UnitGrid from '$lib/components/UnitGrid.svelte';
	import HistoryPanel from '$lib/components/HistoryPanel.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { activeCategory } from '$lib/stores/settings';
	import { loadRates } from '$lib/currency/currency';
	import { loadEngine, injectRates } from '$lib/engine/engine';

	let smartBar = $state<SmartBar | null>(null);

	onMount(async () => {
		// engine + rates load in parallel; neither blocks first paint
		const engineReady = loadEngine();
		const info = await loadRates(localStorage);
		await engineReady;
		injectRates(info.rates);
	});
</script>

<header class="masthead">
	<div>
		<h1>Almanac Converter</h1>
		<div class="tagline">Units · Currency · Calculation</div>
	</div>
	<NotationToggle />
</header>

<SmartBar bind:this={smartBar} />
<CategoryNav />
<UnitGrid categoryId={$activeCategory} />
<HistoryPanel onrerun={(q) => smartBar?.setQuery(q)} />
<Toast />
