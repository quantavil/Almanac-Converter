<script lang="ts">
	import type { UnitRef } from '$lib/registry';

	let {
		matches,
		selected = -1,
		onjump
	}: { matches: UnitRef[]; selected?: number; onjump: (categoryId: string) => void } = $props();
</script>

<div class="suggestions">
	{#each matches.slice(0, 5) as m, i}
		<button class:sel={i === selected} onclick={() => onjump(m.category.id)}>
			<span>Jump to <strong>{m.unit.name}</strong></span>
			<span class="cat">{m.category.label}</span>
		</button>
	{/each}
</div>
