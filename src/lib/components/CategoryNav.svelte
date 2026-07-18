<script lang="ts">
	import { categoryList } from '$lib/registry';
	import { activeCategory } from '$lib/stores/settings';
	import { ratesStale } from '$lib/stores/rates';
</script>

<nav class="catnav" aria-label="Unit categories">
	<div class="tabs">
		{#each categoryList as c (c.id)}
			<button
				class:active={$activeCategory === c.id}
				onclick={() => activeCategory.set(c.id)}
			>
				{c.label}{#if c.id === 'currency' && $ratesStale}<span
						class="stale-dot"
						title="Exchange rates are offline — showing cached/bundled values"
						aria-label="rates offline"
					></span>{/if}
			</button>
		{/each}
		<button
			class:active={$activeCategory === 'bases'}
			onclick={() => activeCategory.set('bases')}
		>
			Bases
		</button>
		<button
			class:active={$activeCategory === 'date'}
			onclick={() => activeCategory.set('date')}
		>
			Date
		</button>
	</div>
</nav>
