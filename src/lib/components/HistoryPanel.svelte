<script lang="ts">
	import { history, clearHistory } from '$lib/stores/history';
	import { showToast } from '$lib/stores/toast';
	import { copyText } from '$lib/clipboard';

	let { onrerun }: { onrerun: (query: string) => void } = $props();

	async function copy(text: string) {
		const success = await copyText(text);
		if (success) {
			showToast('Copied to clipboard');
		} else {
			showToast('Failed to copy to clipboard');
		}
	}

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
						<span class="res">{h.result}</span>
					</button>
					<button class="copy" title="Copy result" onclick={() => copy(h.result)}>⧉</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
