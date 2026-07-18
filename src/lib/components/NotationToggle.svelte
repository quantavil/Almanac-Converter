<script lang="ts">
	import { NOTATIONS } from '$lib/format';
	import { notation } from '$lib/stores/settings';
</script>

<div class="notation" role="group" aria-label="Number notation">
	{#each NOTATIONS as n (n.id)}
		<button class:active={$notation === n.id} onclick={() => notation.set(n.id)}>{n.label}</button>
	{/each}
</div>
