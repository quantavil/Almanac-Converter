<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/stores/settings';

	let { children } = $props();

	// 'auto' follows the OS via CSS media query (no attribute); light/dark force it.
	$effect(() => {
		const el = document.documentElement;
		if ($theme === 'auto') el.removeAttribute('data-theme');
		else el.setAttribute('data-theme', $theme);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	{@render children()}
</div>
