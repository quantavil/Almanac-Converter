<script lang="ts">
	import type { UnitRef } from '$lib/registry';

	let {
		matches,
		onjump
	}: { matches: UnitRef[]; onjump: (categoryId: string) => void } = $props();
</script>

<div class="suggestions">
	{#each matches.slice(0, 5) as m}
		<button onclick={() => onjump(m.category.id)}>
			<span>Jump to <strong>{m.unit.name}</strong></span>
			<span class="cat">{m.category.label}</span>
		</button>
	{/each}
</div>
