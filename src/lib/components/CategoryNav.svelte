<script lang="ts">
	import { categoryList } from '$lib/registry';
	import { activeCategory } from '$lib/stores/settings';

	const groups = ['Common', 'Regional-heavy', 'Science', 'Digital'] as const;
	const labels: Record<string, string> = {
		Common: 'Everyday', 'Regional-heavy': 'Land & regional', Science: 'Science', Digital: 'Digital'
	};
</script>

<nav class="catnav" aria-label="Unit categories">
	{#each groups as g}
		{@const cats = categoryList.filter((c) => c.group === g)}
		{#if cats.length}
			<div class="group-label">{labels[g]}</div>
			<div class="tabs">
				{#each cats as c}
					<button
						class:active={$activeCategory === c.id}
						onclick={() => activeCategory.set(c.id)}
					>{c.label}</button>
				{/each}
			</div>
		{/if}
	{/each}
</nav>
