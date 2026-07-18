<script lang="ts">
	import { history, clearHistory } from '$lib/stores/history';
	import { copyWithToast } from '$lib/clipboard';

	let { onrerun }: { onrerun: (query: string) => void } = $props();
</script>

{#if $history.length}
	<section class="history">
		<div class="history-head">
			<h2>Recent</h2>
			<button class="clear" onclick={clearHistory}>Clear</button>
		</div>
		<ul>
			{#each $history.slice(0, 10) as h}
				<li>
					<button class="entry" onclick={() => onrerun(h.query)} title="Re-run">
						<span>{h.query}</span>
						<!-- multi-target results are stored newline-joined; render inline -->
						<span class="res">{h.result.replace(/\n/g, ' · ')}</span>
					</button>
					<button class="copy" title="Copy result" onclick={() => copyWithToast(h.result)}>⧉</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
