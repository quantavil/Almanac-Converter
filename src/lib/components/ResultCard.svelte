<script lang="ts">
	import { categories, convert } from '$lib/registry';
	import { formatNumber } from '$lib/format';
	import { notation, precision } from '$lib/stores/settings';

	let {
		value,
		unit,
		fast,
		oncopy,
		onswap
	}: {
		value: string;
		unit: string;
		fast?: { categoryId: string; toId: string; raw: number };
		oncopy: () => void;
		onswap?: () => void;
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

	let indianLabel = $derived.by(() => {
		if (unit !== 'INR' && unit !== '₹' && unit !== 'Rs') return '';
		const numValue = parseFloat(value.replace(/,/g, ''));
		if (!Number.isFinite(numValue)) return '';
		const absVal = Math.abs(numValue);
		if (absVal >= 1e7) {
			return `(${formatNumber(numValue / 1e7, $notation, 4)} crore)`;
		}
		if (absVal >= 1e5) {
			return `(${formatNumber(numValue / 1e5, $notation, 4)} lakh)`;
		}
		return '';
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
>
	<div class="result-header">
		<div class="big"><span class="num">{value}</span>{#if unit}&nbsp;{unit}{/if}{#if indianLabel}&nbsp;<span class="indian-label">{indianLabel}</span>{/if}</div>
		{#if onswap}
			<button
				class="swap-btn"
				onclick={(e) => {
					e.stopPropagation();
					onswap();
				}}
				title="Swap conversion direction"
				aria-label="Swap units"
			>
				⇄
			</button>
		{/if}
	</div>
	{#if siblings.length}
		<div class="siblings">
			{#each siblings as s}
				<span class="sib">{s.value} {s.symbol}</span>
			{/each}
		</div>
	{/if}
</div>
