<script lang="ts">
	import { categoryList } from '$lib/registry';
	import { activeCategory } from '$lib/stores/settings';
</script>

<nav class="catnav" aria-label="Unit categories">
	<div class="tabs">
		{#each categoryList as c (c.id)}
			<button
				class:active={$activeCategory === c.id}
				onclick={() => activeCategory.set(c.id)}
			>{c.label}</button>
		{/each}
	</div>
</nav>
