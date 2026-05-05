import type { ForecastVsActual, GeocodingResult, HistoricalDay } from './types';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const PREVIOUS_RUNS_URL = 'https://previous-runs-api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

export const MAX_LEAD_DAYS = 7;

export async function geocodeCity(name: string, count = 8): Promise<GeocodingResult[]> {
	if (name.trim().length < 2) return [];
	const url = new URL(GEOCODE_URL);
	url.searchParams.set('name', name);
	url.searchParams.set('count', String(count));
	url.searchParams.set('format', 'json');
	const r = await fetch(url);
	if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
	const data = await r.json();
	return data.results ?? [];
}

function maxOf(values: (number | null)[]): number | null {
	const filtered = values.filter((v): v is number => v !== null && !Number.isNaN(v));
	return filtered.length ? Math.max(...filtered) : null;
}

function minOf(values: (number | null)[]): number | null {
	const filtered = values.filter((v): v is number => v !== null && !Number.isNaN(v));
	return filtered.length ? Math.min(...filtered) : null;
}

export async function fetchForecastVsActual(
	lat: number,
	lon: number,
	targetDate: string,
	leadDays: number
): Promise<ForecastVsActual> {
	if (leadDays < 1 || leadDays > MAX_LEAD_DAYS) {
		throw new Error(`leadDays must be between 1 and ${MAX_LEAD_DAYS}`);
	}
	const previousField = `temperature_2m_previous_day${leadDays}`;
	const url = new URL(PREVIOUS_RUNS_URL);
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('start_date', targetDate);
	url.searchParams.set('end_date', targetDate);
	url.searchParams.set('hourly', `temperature_2m,${previousField}`);
	url.searchParams.set('timezone', 'auto');

	const r = await fetch(url);
	if (!r.ok) throw new Error(`Previous Runs API failed: ${r.status}`);
	const data = await r.json();

	const hourlyTime: string[] = data.hourly?.time ?? [];
	const hourlyActual: (number | null)[] = data.hourly?.temperature_2m ?? [];
	const hourlyPredicted: (number | null)[] = data.hourly?.[previousField] ?? [];

	return {
		targetDate,
		leadDays,
		hourlyTime,
		hourlyActual,
		hourlyPredicted,
		dailyActualMax: maxOf(hourlyActual),
		dailyActualMin: minOf(hourlyActual),
		dailyPredictedMax: maxOf(hourlyPredicted),
		dailyPredictedMin: minOf(hourlyPredicted)
	};
}

export async function fetchHistoricalDay(
	lat: number,
	lon: number,
	date: string
): Promise<HistoricalDay> {
	const url = new URL(ARCHIVE_URL);
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('start_date', date);
	url.searchParams.set('end_date', date);
	url.searchParams.set(
		'daily',
		'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,cloud_cover_mean'
	);
	url.searchParams.set('timezone', 'auto');

	const r = await fetch(url);
	if (!r.ok) throw new Error(`Historical API failed: ${r.status}`);
	const data = await r.json();
	const d = data.daily;
	return {
		date,
		tempMax: d?.temperature_2m_max?.[0] ?? null,
		tempMin: d?.temperature_2m_min?.[0] ?? null,
		precipitation: d?.precipitation_sum?.[0] ?? null,
		windSpeedMax: d?.wind_speed_10m_max?.[0] ?? null,
		weatherCode: d?.weather_code?.[0] ?? null,
		cloudCoverMean: d?.cloud_cover_mean?.[0] ?? null
	};
}
