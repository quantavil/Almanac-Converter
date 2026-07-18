<script lang="ts">
	import { history } from '$lib/stores/history';

	let { onrerun }: { onrerun: (query: string) => void } = $props();
</script>

{#if $history.length}
	<section class="history">
		<h2>Recent</h2>
		<ul>
			{#each $history.slice(0, 10) as h}
				<li>
					<button class="entry" onclick={() => onrerun(h.query)}>
						<span>{h.query}</span>
						<span class="res">{h.result}</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
