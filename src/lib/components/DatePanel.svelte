<script lang="ts">
	// State for duration calculator
	let startStr = $state(new Date().toISOString().slice(0, 10));
	let endStr = $state(new Date(Date.now() + 86400000).toISOString().slice(0, 10));

	const durationResult = $derived.by(() => {
		const d1 = new Date(startStr);
		const d2 = new Date(endStr);
		if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 'Invalid Dates';
		d1.setHours(0, 0, 0, 0);
		d2.setHours(0, 0, 0, 0);
		const diffMs = d2.getTime() - d1.getTime();
		const diffDays = Math.round(diffMs / 86400000);
		const absDays = Math.abs(diffDays);
		let label = `${absDays} ${absDays === 1 ? 'day' : 'days'}`;
		if (absDays >= 7) {
			const weeks = Math.floor(absDays / 7);
			const remDays = absDays % 7;
			label += ` (${weeks} ${weeks === 1 ? 'week' : 'weeks'}${remDays > 0 ? `, ${remDays} ${remDays === 1 ? 'day' : 'days'}` : ''})`;
		}
		return diffDays < 0 ? `-${label}` : label;
	});

	// State for arithmetic calculator
	let baseStr = $state(new Date().toISOString().slice(0, 10));
	let offsetVal = $state(1);
	let offsetUnit = $state<'day' | 'week' | 'month' | 'year'>('day');
	let offsetOp = $state<'+' | '-'>('+');

	const arithmeticResult = $derived.by(() => {
		const base = new Date(baseStr);
		if (isNaN(base.getTime())) return 'Invalid Date';
		base.setHours(0, 0, 0, 0);
		const mult = offsetOp === '-' ? -1 : 1;
		const result = new Date(base);
		const val = Number(offsetVal) || 0;

		if (offsetUnit === 'day') result.setDate(result.getDate() + val * mult);
		else if (offsetUnit === 'week') result.setDate(result.getDate() + val * 7 * mult);
		else if (offsetUnit === 'month') result.setMonth(result.getMonth() + val * mult);
		else if (offsetUnit === 'year') result.setFullYear(result.getFullYear() + val * mult);

		return result.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	});

	// State for epoch converter
	let timestampStr = $state(Math.floor(Date.now() / 1000).toString());
	let calendarStr = $state(new Date().toISOString().replace('T', ' ').slice(0, 19));

	// Dual-binding sync
	function onTimestampInput(e: Event) {
		const val = (e.currentTarget as HTMLInputElement).value;
		timestampStr = val;
		const seconds = parseInt(val);
		if (!isNaN(seconds)) {
			const d = new Date(seconds * 1000);
			calendarStr = d.toISOString().replace('T', ' ').slice(0, 19);
		}
	}

	function onCalendarInput(e: Event) {
		const val = (e.currentTarget as HTMLInputElement).value;
		calendarStr = val;
		const d = new Date(val.trim());
		if (!isNaN(d.getTime())) {
			timestampStr = Math.floor(d.getTime() / 1000).toString();
		}
	}
</script>

<div class="date-panel">
	<div class="panel-section">
		<h3>Time Between Dates</h3>
		<div class="input-row">
			<label class="field-wrap flex-1">
				<span class="label">Start Date</span>
				<input type="date" bind:value={startStr} />
			</label>
			<span class="to-label">to</span>
			<label class="field-wrap flex-1">
				<span class="label">End Date</span>
				<input type="date" bind:value={endStr} />
			</label>
		</div>
		<div class="output-row">
			<span class="output-val">{durationResult}</span>
		</div>
	</div>

	<div class="panel-section">
		<h3>Add or Subtract Time</h3>
		<div class="input-row wrap-mobile">
			<label class="field-wrap base-date">
				<span class="label">Start Date</span>
				<input type="date" bind:value={baseStr} />
			</label>
			<label class="field-wrap op-select">
				<span class="label">Operator</span>
				<select bind:value={offsetOp}>
					<option value="+">Add (+)</option>
					<option value="-">Subtract (-)</option>
				</select>
			</label>
			<label class="field-wrap offset-val">
				<span class="label">Amount</span>
				<input type="number" min="0" bind:value={offsetVal} />
			</label>
			<label class="field-wrap unit-select">
				<span class="label">Unit</span>
				<select bind:value={offsetUnit}>
					<option value="day">Days</option>
					<option value="week">Weeks</option>
					<option value="month">Months</option>
					<option value="year">Years</option>
				</select>
			</label>
		</div>
		<div class="output-row">
			<span class="output-val">{arithmeticResult}</span>
		</div>
	</div>

	<div class="panel-section">
		<h3>Unix Epoch Timestamp Converter</h3>
		<div class="input-row wrap-mobile">
			<label class="field-wrap flex-1">
				<span class="label">Unix Timestamp (seconds)</span>
				<input type="text" value={timestampStr} oninput={onTimestampInput} placeholder="e.g. 1784370200" />
			</label>
			<label class="field-wrap flex-1">
				<span class="label">Calendar Date & Time (UTC/Local)</span>
				<input type="text" value={calendarStr} oninput={onCalendarInput} placeholder="e.g. 2026-07-18 16:19:46" />
			</label>
		</div>
	</div>
</div>
