<script lang="ts">
	import { untrack } from 'svelte';
	import { categories, convert, type Unit } from '$lib/registry';
	import { formatNumber } from '$lib/format';
	import { showToast } from '$lib/stores/toast';
	import { notation, precision, pinned } from '$lib/stores/settings';
	import { copyText } from '$lib/clipboard';

	let { categoryId }: { categoryId: string } = $props();
	let category = $derived(categories[categoryId]);
	let values = $state<Record<string, string>>({});
	let sourceId = $state<string | null>(null);
	let sourceRaw = ''; // last typed text, for notation/precision re-renders

	// pinned units first, in registry order; rest after
	let orderedUnits = $derived.by<Unit[]>(() => {
		const pins = new Set($pinned[categoryId] ?? []);
		const pinnedUnits = category.units.filter((u) => pins.has(u.id));
		const rest = category.units.filter((u) => !pins.has(u.id));
		return [...pinnedUnits, ...rest];
	});

	$effect(() => {
		categoryId; // reset when category changes
		values = {};
		sourceId = null;
		sourceRaw = '';
	});

	// re-render computed cells when notation or precision changes
	$effect(() => {
		$notation;
		$precision;
		untrack(() => {
			if (sourceId && sourceRaw) onInput(sourceId, sourceRaw);
		});
	});

	// Indian scale calculation logic or similar? No, standard convert
	function onInput(unitId: string, raw: string) {
		sourceId = unitId;
		sourceRaw = raw;
		const v = parseFloat(raw);
		const next: Record<string, string> = { [unitId]: raw };
		if (raw.trim() !== '' && !Number.isNaN(v)) {
			for (const u of category.units) {
				if (u.id !== unitId)
					next[u.id] = formatNumber(convert(v, categoryId, unitId, u.id), $notation, $precision);
			}
		}
		values = next;
	}

	async function copyCell(unitId: string) {
		const v = values[unitId];
		if (!v) return;
		const success = await copyText(v);
		if (success) {
			showToast('Copied to clipboard');
		} else {
			showToast('Failed to copy to clipboard');
		}
	}

	function togglePin(unitId: string) {
		pinned.update((p) => {
			const cur = new Set(p[categoryId] ?? []);
			if (cur.has(unitId)) cur.delete(unitId);
			else cur.add(unitId);
			return { ...p, [categoryId]: [...cur] };
		});
	}

	let isPinned = $derived((id: string) => ($pinned[categoryId] ?? []).includes(id));
</script>

<div class="grid">
	{#each orderedUnits as u (u.id)}
		<label class="cell" class:source={sourceId === u.id} class:pinned={isPinned(u.id)}>
			<span class="cell-label">{u.name}</span>
			<input
				inputmode="decimal"
				placeholder="0"
				value={values[u.id] ?? ''}
				oninput={(e) => onInput(u.id, e.currentTarget.value)}
			/>
			<button
				class="pin"
				title={isPinned(u.id) ? 'Unpin' : 'Pin to top'}
				aria-pressed={isPinned(u.id)}
				onclick={(e) => { e.preventDefault(); togglePin(u.id); }}
			>{isPinned(u.id) ? '★' : '☆'}</button>
			<button class="copy" title="Copy" onclick={(e) => { e.preventDefault(); copyCell(u.id); }}>⧉</button>
		</label>
	{/each}
</div>
