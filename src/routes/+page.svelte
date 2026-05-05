<script lang="ts">
	import {
		fetchForecastVsActual,
		fetchHistoricalDay,
		geocodeCity,
		MAX_LEAD_DAYS
	} from '$lib/openmeteo';
	import type { ForecastVsActual, GeocodingResult, HistoricalDay } from '$lib/types';
	import TempChart from '$lib/TempChart.svelte';

	let query = $state('Belgrade');
	let candidates = $state<GeocodingResult[]>([]);
	let selected = $state<GeocodingResult | null>(null);

	let targetDate = $state(defaultTargetDate());
	let leadDays = $state(7);

	let comparison = $state<ForecastVsActual | null>(null);
	let actualDay = $state<HistoricalDay | null>(null);

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
			const [forecast, actual] = await Promise.all([
				fetchForecastVsActual(selected.latitude, selected.longitude, targetDate, leadDays),
				fetchHistoricalDay(selected.latitude, selected.longitude, targetDate)
			]);
			comparison = forecast;
			actualDay = actual;
		} catch (e) {
			errorMsg = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function diff(a: number | null, b: number | null): string {
		if (a === null || b === null) return '—';
		const d = a - b;
		const sign = d > 0 ? '+' : '';
		return `${sign}${d.toFixed(1)}°C`;
	}
</script>

<main>
	<h1>Weather Forecast Accuracy</h1>
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

	{#if comparison && actualDay}
		<section class="summary">
			<div class="card">
				<h3>Daily max</h3>
				<p class="big">{actualDay.tempMax?.toFixed(1) ?? '—'}°C <span class="label">actual</span></p>
				<p>
					{comparison.dailyPredictedMax?.toFixed(1) ?? '—'}°C
					<span class="label">predicted ({leadDays}d lead)</span>
				</p>
				<p class="diff">Δ {diff(comparison.dailyPredictedMax, actualDay.tempMax)}</p>
			</div>
			<div class="card">
				<h3>Daily min</h3>
				<p class="big">{actualDay.tempMin?.toFixed(1) ?? '—'}°C <span class="label">actual</span></p>
				<p>
					{comparison.dailyPredictedMin?.toFixed(1) ?? '—'}°C
					<span class="label">predicted ({leadDays}d lead)</span>
				</p>
				<p class="diff">Δ {diff(comparison.dailyPredictedMin, actualDay.tempMin)}</p>
			</div>
		</section>

		<section class="chart">
			<TempChart
				time={comparison.hourlyTime}
				actual={comparison.hourlyActual}
				predicted={comparison.hourlyPredicted}
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
		max-width: 880px;
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
	.summary {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin: 1rem 0;
	}
	.card {
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
	}
	.card h3 {
		margin: 0 0 0.5rem;
	}
	.big {
		font-size: 1.6rem;
		font-weight: 600;
		margin: 0.25rem 0;
	}
	.label {
		font-size: 0.8rem;
		color: #666;
		font-weight: normal;
	}
	.diff {
		font-size: 1.1rem;
		font-weight: 600;
		color: #c24545;
		margin-top: 0.5rem;
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
