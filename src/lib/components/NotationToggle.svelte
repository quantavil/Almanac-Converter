<script lang="ts">
	import { NOTATIONS } from '$lib/format';
	import { notation } from '$lib/stores/settings';

	let label = $derived(NOTATIONS.find((n) => n.id === $notation)?.label ?? 'Auto');

	function cycle() {
		const i = NOTATIONS.findIndex((n) => n.id === $notation);
		notation.set(NOTATIONS[(i + 1) % NOTATIONS.length].id);
	}
</script>

<button
	class="notation-switch"
	onclick={cycle}
	title="Number notation — click to cycle"
	aria-label="Number notation: {label}. Click to cycle."
>
	{label}
</button>
