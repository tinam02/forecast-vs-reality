<script lang="ts">
	import {
		fetchComparison,
		geocodeCity,
		computeLieScore,
		MAX_LEAD_DAYS
	} from '$lib/openmeteo';
	import type {
		GeocodingResult,
		LieScore,
		MultiVariableComparison,
		VariableComparison
	} from '$lib/types';
	import TempChart from '$lib/TempChart.svelte';
	import LieMeter from '$lib/LieMeter.svelte';

	let query = $state('Belgrade');
	let candidates = $state<GeocodingResult[]>([]);
	let selected = $state<GeocodingResult | null>(null);

	let targetDate = $state(defaultTargetDate());
	let leadDays = $state(7);

	let comparison = $state<MultiVariableComparison | null>(null);
	let lieScore = $state<LieScore | null>(null);

	let loading = $state(false);
	let errorMsg = $state('');

	function defaultTargetDate(): string {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return d.toISOString().slice(0, 10);
	}

	async function search() {
		errorMsg = '';
		try {
			candidates = await geocodeCity(query);
			selected = candidates[0] ?? null;
		} catch (e) {
			errorMsg = (e as Error).message;
		}
	}

	async function compare() {
		if (!selected) {
			errorMsg = 'Pick a city first.';
			return;
		}
		errorMsg = '';
		loading = true;
		try {
			const c = await fetchComparison(selected.latitude, selected.longitude, targetDate, leadDays);
			comparison = c;
			lieScore = computeLieScore(c);
		} catch (e) {
			errorMsg = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function fmt(value: number | null, digits: number, unit: string): string {
		if (value === null) return '—';
		return `${value.toFixed(digits)}${unit}`;
	}

	function delta(pair: VariableComparison, digits: number, unit: string): string {
		if (pair.actual === null || pair.predicted === null) return '—';
		const d = pair.predicted - pair.actual;
		const sign = d > 0 ? '+' : '';
		return `${sign}${d.toFixed(digits)}${unit}`;
	}

	const cards = $derived.by(() => {
		if (!comparison) return [];
		const c = comparison;
		return [
			{ label: 'Daily max', pair: c.tempMax, digits: 1, unit: '°C' },
			{ label: 'Daily min', pair: c.tempMin, digits: 1, unit: '°C' },
			{ label: 'Precipitation', pair: c.precipitationSum, digits: 1, unit: ' mm' },
			{ label: 'Max wind', pair: c.windMax, digits: 1, unit: ' km/h' },
			{ label: 'Cloud cover', pair: c.cloudMean, digits: 0, unit: '%' }
		];
	});
</script>

<main>
	<h1>Forecast vs Reality</h1>
	<p class="lede">
		Pick a city and a past date. See what the forecast said N days earlier vs. what actually
		happened.
	</p>

	<section class="controls">
		<label>
			City
			<input
				type="text"
				bind:value={query}
				onkeydown={(e) => e.key === 'Enter' && search()}
				placeholder="e.g. Belgrade"
			/>
			<button onclick={search}>Search</button>
		</label>

		{#if candidates.length > 0}
			<label>
				Match
				<select bind:value={selected}>
					{#each candidates as c (c.id)}
						<option value={c}>
							{c.name}, {c.admin1 ? c.admin1 + ', ' : ''}{c.country}
						</option>
					{/each}
				</select>
			</label>
		{/if}

		<label>
			Target date
			<input type="date" bind:value={targetDate} />
		</label>

		<label>
			Lead time: <strong>{leadDays}</strong> day{leadDays === 1 ? '' : 's'}
			<input type="range" min="1" max={MAX_LEAD_DAYS} bind:value={leadDays} />
		</label>

		<button onclick={compare} disabled={loading || !selected}>
			{loading ? 'Loading…' : 'Compare'}
		</button>
	</section>

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}

	{#if comparison && lieScore}
		<LieMeter {lieScore} />

		<section class="cards">
			{#each cards as card (card.label)}
				<div class="card">
					<h3>{card.label}</h3>
					<p class="big">
						{fmt(card.pair.actual, card.digits, card.unit)}
						<span class="label">actual</span>
					</p>
					<p>
						{fmt(card.pair.predicted, card.digits, card.unit)}
						<span class="label">predicted ({leadDays}d lead)</span>
					</p>
					<p class="diff">Δ {delta(card.pair, card.digits, card.unit)}</p>
				</div>
			{/each}
		</section>

		<section class="chart">
			<TempChart
				time={comparison.hourlyTime}
				actual={comparison.hourlyTempActual}
				predicted={comparison.hourlyTempPredicted}
				leadDays={comparison.leadDays}
			/>
		</section>
	{/if}

	<footer>
		<p>
			Data: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · Lead
			time capped at {MAX_LEAD_DAYS} days (Previous Runs archive limit).
		</p>
	</footer>
</main>

<style>
	main {
		max-width: 960px;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		color: #1a1a1a;
	}
	h1 {
		margin-bottom: 0.25rem;
	}
	.lede {
		color: #555;
		margin-top: 0;
	}
	.controls {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: 1fr 1fr;
		background: #f7f7f7;
		padding: 1rem;
		border-radius: 8px;
		margin: 1rem 0;
	}
	.controls label {
		display: flex;
		flex-direction: column;
		font-size: 0.9rem;
		color: #333;
	}
	.controls input,
	.controls select {
		margin-top: 0.25rem;
		padding: 0.4rem;
		font-size: 1rem;
	}
	.controls button {
		grid-column: 1 / -1;
		padding: 0.6rem;
		font-size: 1rem;
		background: #1a5fb4;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.controls button:disabled {
		background: #999;
	}
	.error {
		color: #b00;
		font-weight: bold;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.75rem;
		margin: 1rem 0;
	}
	.card {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 0.85rem;
	}
	.card h3 {
		margin: 0 0 0.4rem;
		font-size: 0.95rem;
		color: #555;
	}
	.big {
		font-size: 1.4rem;
		font-weight: 600;
		margin: 0.15rem 0;
	}
	.label {
		font-size: 0.75rem;
		color: #666;
		font-weight: normal;
	}
	.diff {
		font-size: 1rem;
		font-weight: 600;
		color: #c24545;
		margin-top: 0.4rem;
	}
	.chart {
		margin-top: 1rem;
	}
	footer {
		margin-top: 2rem;
		font-size: 0.85rem;
		color: #777;
		text-align: center;
	}
</style>
