<script lang="ts">
	import { categories, convert } from '$lib/registry';
	import { formatSigFigs } from '$lib/format';
	import { showToast } from '$lib/stores/toast';

	let { categoryId }: { categoryId: string } = $props();
	let category = $derived(categories[categoryId]);
	let values = $state<Record<string, string>>({});
	let sourceId = $state<string | null>(null);

	$effect(() => {
		categoryId; // reset when category changes
		values = {};
		sourceId = null;
	});

	function onInput(unitId: string, raw: string) {
		sourceId = unitId;
		const v = parseFloat(raw);
		const next: Record<string, string> = { [unitId]: raw };
		if (raw.trim() !== '' && !Number.isNaN(v)) {
			for (const u of category.units) {
				if (u.id !== unitId) next[u.id] = formatSigFigs(convert(v, categoryId, unitId, u.id));
			}
		}
		values = next;
	}

	async function copyCell(unitId: string) {
		const v = values[unitId];
		if (!v) return;
		await navigator.clipboard.writeText(v);
		showToast('Copied to clipboard');
	}
</script>

<div class="grid">
	{#each category.units as u (u.id)}
		<label class="cell" class:source={sourceId === u.id}>
			<span class="cell-label">{u.name}</span>
			<input
				inputmode="decimal"
				placeholder="0"
				value={values[u.id] ?? ''}
				oninput={(e) => onInput(u.id, e.currentTarget.value)}
			/>
			<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell(u.id); }}>⧉</button>
		</label>
	{/each}
</div>
