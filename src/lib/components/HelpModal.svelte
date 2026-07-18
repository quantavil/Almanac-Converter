<script lang="ts">
	let { isOpen = $bindable(false), onselect } = $props<{
		isOpen: boolean;
		onselect?: (val: string) => void;
	}>();

	const examples = [
		{
			title: 'Unit Conversions',
			items: [
				{ label: 'Length', code: '12 km to mi' },
				{ label: 'Temperature', code: '32 c to f' },
				{ label: 'Mass / Weight', code: '5 kg to lbs' },
				{ label: 'Fuel Economy', code: '10 l/100km to mpg' }
			]
		},
		{
			title: 'Live Currency Exchange',
			items: [
				{ label: 'USD to Euro', code: '100 usd to eur' },
				{ label: 'Lek to Dollar (uppercase clash)', code: '500 ALL to USD' },
				{ label: 'Pound to Yen', code: '25 gbp to jpy' }
			]
		},
		{
			title: 'Date Math & Durations',
			items: [
				{ label: 'Date Arithmetic', code: 'today + 45 days' },
				{ label: 'Subtractions', code: '2026-07-18 - 3 weeks' },
				{ label: 'Time between Dates', code: 'today to 2026-12-25' },
				{ label: 'Weekday Lookup', code: '2026-12-25' }
			]
		},
		{
			title: 'Math Expressions & Units',
			items: [
				{ label: 'Combined Units', code: '5 ft + 10 in in cm' },
				{ label: 'Calculations', code: '1200 * 1.15' },
				{ label: 'Complex Math', code: 'sin(45 deg) + 2^3' }
			]
		}
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="modal-wrapper">
		<button class="modal-backdrop" onclick={() => (isOpen = false)} aria-label="Close guide"></button>
		
		<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<div class="modal-header">
				<h2 id="modal-title">How to use Almanac</h2>
				<button class="close-btn" onclick={() => (isOpen = false)} aria-label="Close guide">×</button>
			</div>

			<div class="modal-body">
				<p class="intro">
					Almanac is a keyboard-first converter and calculator. Type any expression below, and the app will instantly parse and compute the result. Click any example below to try it!
				</p>

				<div class="examples-grid">
					{#each examples as group}
						<div class="example-group">
							<h3>{group.title}</h3>
							<ul>
								{#each group.items as item}
									<li>
										<span class="ex-label">{item.label}:</span>
										<button
											class="ex-code"
											onclick={() => {
												if (onselect) onselect(item.code);
												isOpen = false;
											}}
										>
											<code>{item.code}</code>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
