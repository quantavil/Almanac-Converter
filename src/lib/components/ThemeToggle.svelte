<script lang="ts">
	import { theme, type Theme } from '$lib/stores/settings';

	const order: Theme[] = ['auto', 'light', 'dark'];
	const icon: Record<Theme, string> = { auto: '◐', light: '☀', dark: '☾' };

	function cycle() {
		theme.update((t) => order[(order.indexOf(t) + 1) % order.length]);
	}
</script>

<button
	class="theme-toggle"
	onclick={cycle}
	title="Theme: {$theme} — click to change"
	aria-label="Theme: {$theme}. Click to change."
>
	<span aria-hidden="true">{icon[$theme]}</span>
</button>
