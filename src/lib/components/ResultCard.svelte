<script lang="ts">
	import { categories, convert } from '$lib/registry';
	import { formatNumber } from '$lib/format';
	import { notation, precision } from '$lib/stores/settings';

	let {
		value,
		unit,
		fast,
		oncopy
	}: {
		value: string;
		unit: string;
		fast?: { categoryId: string; toId: string; raw: number };
		oncopy: () => void;
	} = $props();

	// sibling conversions only when we know the registry category (fast path)
	let siblings = $derived.by(() => {
		if (!fast) return [];
		const cat = categories[fast.categoryId];
		return cat.units
			.filter((u) => u.id !== fast.toId)
			.slice(0, 4)
			.map((u) => ({
				symbol: u.symbol,
				value: formatNumber(convert(fast.raw, fast.categoryId, fast.toId, u.id), $notation, $precision)
			}));
	});
</script>

<div
	class="result-card"
	onclick={oncopy}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			oncopy();
		}
	}}
	role="button"
	tabindex="0"
	title="Click to copy"
>
	<div class="big"><span class="num">{value}</span>{#if unit}&nbsp;{unit}{/if}</div>
	<div class="hint">Enter or click to copy</div>
	{#if siblings.length}
		<div class="siblings">
			{#each siblings as s}
				<span class="sib">{s.value} {s.symbol}</span>
			{/each}
		</div>
	{/if}
</div>
