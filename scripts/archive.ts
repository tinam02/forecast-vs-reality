// Daily archiver: snapshots a 16-day forecast for each tracked city and
// writes it to data/forecasts/<city-id>/<YYYY-MM-DD>.json.
//
// Open-Meteo doesn't archive long-range forecasts, so we have to be the
// archive ourselves. Once this has run for a month, we have something
// nobody else publishes: a public history of forecast-vs-reality pairs.

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { TRACKED_CITIES } from '../config/cities.ts';
import type { City } from '../src/lib/types.ts';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 16;
const ROOT = 'data/forecasts';

const DAILY_VARS = [
	'temperature_2m_max',
	'temperature_2m_min',
	'precipitation_sum',
	'wind_speed_10m_max',
	'weather_code',
	'cloud_cover_mean'
];

interface ForecastResponse {
	daily?: Record<string, unknown>;
	daily_units?: Record<string, string>;
	timezone?: string;
}

async function fetchForecast(city: City): Promise<ForecastResponse> {
	const url = new URL(FORECAST_URL);
	url.searchParams.set('latitude', String(city.lat));
	url.searchParams.set('longitude', String(city.lon));
	url.searchParams.set('daily', DAILY_VARS.join(','));
	url.searchParams.set('forecast_days', String(FORECAST_DAYS));
	url.searchParams.set('timezone', 'auto');
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Forecast API ${res.status} for ${city.id}: ${await res.text()}`);
	}
	return (await res.json()) as ForecastResponse;
}

const issuedDate = new Date().toISOString().slice(0, 10);
console.log(`Archiving ${FORECAST_DAYS}-day forecasts issued ${issuedDate} for ${TRACKED_CITIES.length} cities…`);

let failures = 0;
for (const city of TRACKED_CITIES) {
	try {
		const data = await fetchForecast(city);
		const dir = join(ROOT, city.id);
		await mkdir(dir, { recursive: true });
		const file = join(dir, `${issuedDate}.json`);
		const payload = {
			city,
			issued: issuedDate,
			forecast_days: FORECAST_DAYS,
			timezone: data.timezone,
			daily: data.daily ?? {},
			daily_units: data.daily_units ?? {},
			_source: 'open-meteo forecast api',
			_archived_at: new Date().toISOString()
		};
		await writeFile(file, JSON.stringify(payload, null, 2) + '\n');
		console.log(`  ✓ ${city.id} → ${file}`);
	} catch (err) {
		console.error(`  ✗ ${city.id}: ${(err as Error).message}`);
		failures++;
	}
}

if (failures > 0) {
	console.error(`${failures} of ${TRACKED_CITIES.length} failed`);
	process.exit(1);
}
console.log('Done.');
