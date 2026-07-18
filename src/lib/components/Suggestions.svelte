<script lang="ts">
	import type { UnitRef } from '$lib/registry';

	let {
		matches,
		selected = -1,
		mode = 'jump',
		onjump,
		onselect
	}: {
		matches: UnitRef[];
		selected?: number;
		mode?: 'jump' | 'convert';
		onjump?: (categoryId: string) => void;
		onselect?: (ref: UnitRef) => void;
	} = $props();
</script>

<div class="suggestions">
	{#each matches.slice(0, 5) as m, i}
		<button
			class:sel={i === selected}
			onclick={() => {
				if (mode === 'convert') {
					if (onselect) onselect(m);
				} else {
					if (onjump) onjump(m.category.id);
				}
			}}
		>
			{#if mode === 'convert'}
				<span>Convert to <strong>{m.unit.name}</strong> ({m.unit.symbol})</span>
			{:else}
				<span>Jump to <strong>{m.unit.name}</strong></span>
			{/if}
			<span class="cat">{m.category.label}</span>
		</button>
	{/each}
</div>
