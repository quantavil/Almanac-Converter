<script lang="ts">
	import { addDuration, diffDaysLabel, formatLongDate, resolveDate, type DurationUnit } from '$lib/date/datemath';

	// State for duration calculator
	let startStr = $state(new Date().toISOString().slice(0, 10));
	let endStr = $state(new Date(Date.now() + 86400000).toISOString().slice(0, 10));

	const durationResult = $derived.by(() => {
		const d1 = resolveDate(startStr);
		const d2 = resolveDate(endStr);
		if (!d1 || !d2) return 'Invalid Dates';
		return diffDaysLabel(d1, d2);
	});

	// State for arithmetic calculator
	let baseStr = $state(new Date().toISOString().slice(0, 10));
	let offsetVal = $state(1);
	let offsetUnit = $state<DurationUnit>('day');
	let offsetOp = $state<'+' | '-'>('+');

	const arithmeticResult = $derived.by(() => {
		const base = resolveDate(baseStr);
		if (!base) return 'Invalid Date';
		return formatLongDate(addDuration(base, offsetVal, offsetUnit, offsetOp));
	});

	// State for epoch converter. Both directions use UTC so the displayed string
	// round-trips back to the same timestamp regardless of the viewer's timezone.
	const toUtcString = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);

	let timestampStr = $state(Math.floor(Date.now() / 1000).toString());
	let calendarStr = $state(toUtcString(Date.now()));

	// Dual-binding sync
	function onTimestampInput(e: Event) {
		const val = (e.currentTarget as HTMLInputElement).value;
		timestampStr = val;
		const seconds = parseInt(val);
		if (!isNaN(seconds)) calendarStr = toUtcString(seconds * 1000);
	}

	function onCalendarInput(e: Event) {
		const val = (e.currentTarget as HTMLInputElement).value;
		calendarStr = val;
		// interpret the "YYYY-MM-DD HH:MM:SS" text as UTC to match how it's rendered
		const iso = val.trim().replace(' ', 'T');
		const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z');
		if (!isNaN(d.getTime())) {
			timestampStr = Math.floor(d.getTime() / 1000).toString();
		}
	}

	// State for timezone converter
	const MAJOR_TIMEZONES = [
		{ id: 'local', label: 'Local Time' },
		{ id: 'UTC', label: 'UTC / GMT' },
		{ id: 'America/New_York', label: 'EST/EDT (New York)' },
		{ id: 'America/Chicago', label: 'CST/CDT (Chicago)' },
		{ id: 'America/Denver', label: 'MST/MDT (Denver)' },
		{ id: 'America/Los_Angeles', label: 'PST/PDT (Los Angeles)' },
		{ id: 'Europe/London', label: 'GMT/BST (London)' },
		{ id: 'Europe/Paris', label: 'CET/CEST (Paris)' },
		{ id: 'Europe/Moscow', label: 'MSK (Moscow)' },
		{ id: 'Asia/Kolkata', label: 'IST (India)' },
		{ id: 'Asia/Dubai', label: 'GST (Dubai)' },
		{ id: 'Asia/Singapore', label: 'SGT (Singapore)' },
		{ id: 'Asia/Tokyo', label: 'JST (Tokyo)' },
		{ id: 'Australia/Sydney', label: 'AEST/AEDT (Sydney)' },
		{ id: 'Pacific/Auckland', label: 'NZST/NZDT (Auckland)' }
	];

	const getLocalIso = () => {
		const offset = new Date().getTimezoneOffset() * 60000;
		return new Date(Date.now() - offset).toISOString().slice(0, 16);
	};

	let tzSourceStr = $state(getLocalIso());
	let tzSource = $state('local');
	let tzTarget = $state('UTC');

	function getTzOffset(date: Date, timeZone: string): number {
		try {
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone,
				year: 'numeric', month: 'numeric', day: 'numeric',
				hour: 'numeric', minute: 'numeric', second: 'numeric',
				hour12: false
			});
			const parts = formatter.formatToParts(date);
			const getPart = (type: string) => {
				const p = parts.find(x => x.type === type);
				return p ? parseInt(p.value) : 0;
			};
			const year = getPart('year');
			const month = getPart('month') - 1;
			const day = getPart('day');
			const hour = getPart('hour') === 24 ? 0 : getPart('hour');
			const minute = getPart('minute');
			const second = getPart('second');
			const localTime = Date.UTC(year, month, day, hour, minute, second);
			const utcTime = Date.UTC(
				date.getUTCFullYear(),
				date.getUTCMonth(),
				date.getUTCDate(),
				date.getUTCHours(),
				date.getUTCMinutes(),
				date.getUTCSeconds()
			);
			return localTime - utcTime;
		} catch {
			return 0;
		}
	}

	const tzResult = $derived.by(() => {
		if (!tzSourceStr) return 'Select Date & Time';
		try {
			const baseDate = new Date(tzSourceStr + ':00Z');
			if (isNaN(baseDate.getTime())) return 'Invalid Date';
			const resolvedFromZone = tzSource === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tzSource;
			const resolvedToZone = tzTarget === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tzTarget;
			const offset = getTzOffset(baseDate, resolvedFromZone);
			const utcTime = baseDate.getTime() - offset;
			const targetDate = new Date(utcTime);
			return targetDate.toLocaleDateString('en-US', {
				timeZone: resolvedToZone,
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			});
		} catch (e) {
			return 'Conversion Error';
		}
	});
</script>

<div class="date-panel">
	<div class="panel-section">
		<h3>Time Between Dates</h3>
		<div class="input-row date-range-row">
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
		<h3>Timezone Converter</h3>
		<div class="input-row wrap-mobile">
			<label class="field-wrap flex-2">
				<span class="label">Source Date & Time</span>
				<input type="datetime-local" bind:value={tzSourceStr} />
			</label>
			<label class="field-wrap flex-1">
				<span class="label">From Timezone</span>
				<select bind:value={tzSource}>
					{#each MAJOR_TIMEZONES as tz}
						<option value={tz.id}>{tz.label}</option>
					{/each}
				</select>
			</label>
			<label class="field-wrap flex-1">
				<span class="label">To Timezone</span>
				<select bind:value={tzTarget}>
					{#each MAJOR_TIMEZONES as tz}
						<option value={tz.id}>{tz.label}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class="output-row">
			<span class="output-val">{tzResult}</span>
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
				<span class="label">Calendar Date & Time (UTC)</span>
				<input type="text" value={calendarStr} oninput={onCalendarInput} placeholder="e.g. 2026-07-18 16:19:46" />
			</label>
		</div>
	</div>
</div>
