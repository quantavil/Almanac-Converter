<script lang="ts">
	import { precision } from '$lib/stores/settings';

	const MIN = 2;
	const MAX = 10;
	const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));
</script>

<div class="precision" role="group" aria-label="Significant digits">
	<button
		onclick={() => precision.update((p) => clamp(p - 1))}
		disabled={$precision <= MIN}
		aria-label="Fewer digits"
	>−</button>
	<span class="val" title="Significant digits">{$precision} sig</span>
	<button
		onclick={() => precision.update((p) => clamp(p + 1))}
		disabled={$precision >= MAX}
		aria-label="More digits"
	>+</button>
</div>
