import type {
	GeocodingResult,
	LieScore,
	MultiVariableComparison,
	VariableComparison
} from './types';

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

function sumOf(values: (number | null)[]): number | null {
	const filtered = values.filter((v): v is number => v !== null && !Number.isNaN(v));
	return filtered.length ? filtered.reduce((a, b) => a + b, 0) : null;
}

function meanOf(values: (number | null)[]): number | null {
	const filtered = values.filter((v): v is number => v !== null && !Number.isNaN(v));
	return filtered.length ? filtered.reduce((a, b) => a + b, 0) / filtered.length : null;
}

interface PreviousRunsResponse {
	hourly?: Record<string, (number | null)[] | string[]>;
}
interface ArchiveResponse {
	daily?: Record<string, (number | null)[]>;
}

async function fetchPreviousRuns(
	lat: number,
	lon: number,
	targetDate: string,
	leadDays: number
): Promise<PreviousRunsResponse> {
	const baseVars = ['temperature_2m', 'precipitation', 'wind_speed_10m', 'cloud_cover'];
	const previousVars = baseVars.map((v) => `${v}_previous_day${leadDays}`);
	const url = new URL(PREVIOUS_RUNS_URL);
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('start_date', targetDate);
	url.searchParams.set('end_date', targetDate);
	url.searchParams.set('hourly', [...baseVars, ...previousVars].join(','));
	url.searchParams.set('timezone', 'auto');
	const r = await fetch(url);
	if (!r.ok) throw new Error(`Previous Runs API failed: ${r.status}`);
	return (await r.json()) as PreviousRunsResponse;
}

async function fetchArchive(
	lat: number,
	lon: number,
	date: string
): Promise<ArchiveResponse> {
	const url = new URL(ARCHIVE_URL);
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lon));
	url.searchParams.set('start_date', date);
	url.searchParams.set('end_date', date);
	url.searchParams.set(
		'daily',
		'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,cloud_cover_mean'
	);
	url.searchParams.set('timezone', 'auto');
	const r = await fetch(url);
	if (!r.ok) throw new Error(`Historical API failed: ${r.status}`);
	return (await r.json()) as ArchiveResponse;
}

export async function fetchComparison(
	lat: number,
	lon: number,
	targetDate: string,
	leadDays: number
): Promise<MultiVariableComparison> {
	if (leadDays < 1 || leadDays > MAX_LEAD_DAYS) {
		throw new Error(`leadDays must be between 1 and ${MAX_LEAD_DAYS}`);
	}

	const [prev, archive] = await Promise.all([
		fetchPreviousRuns(lat, lon, targetDate, leadDays),
		fetchArchive(lat, lon, targetDate)
	]);

	const tempField = `temperature_2m_previous_day${leadDays}`;
	const precipField = `precipitation_previous_day${leadDays}`;
	const windField = `wind_speed_10m_previous_day${leadDays}`;
	const cloudField = `cloud_cover_previous_day${leadDays}`;

	const hourlyTime = (prev.hourly?.time as string[]) ?? [];
	const hourlyTempActual = (prev.hourly?.temperature_2m as (number | null)[]) ?? [];
	const hourlyTempPredicted = (prev.hourly?.[tempField] as (number | null)[]) ?? [];
	const hourlyPrecipPredicted = (prev.hourly?.[precipField] as (number | null)[]) ?? [];
	const hourlyWindPredicted = (prev.hourly?.[windField] as (number | null)[]) ?? [];
	const hourlyCloudPredicted = (prev.hourly?.[cloudField] as (number | null)[]) ?? [];

	const tempMax: VariableComparison = {
		predicted: maxOf(hourlyTempPredicted),
		actual: archive.daily?.temperature_2m_max?.[0] ?? null
	};
	const tempMin: VariableComparison = {
		predicted: minOf(hourlyTempPredicted),
		actual: archive.daily?.temperature_2m_min?.[0] ?? null
	};
	const precipitationSum: VariableComparison = {
		predicted: sumOf(hourlyPrecipPredicted),
		actual: archive.daily?.precipitation_sum?.[0] ?? null
	};
	const windMax: VariableComparison = {
		predicted: maxOf(hourlyWindPredicted),
		actual: archive.daily?.wind_speed_10m_max?.[0] ?? null
	};
	const cloudMean: VariableComparison = {
		predicted: meanOf(hourlyCloudPredicted),
		actual: archive.daily?.cloud_cover_mean?.[0] ?? null
	};

	return {
		targetDate,
		leadDays,
		tempMax,
		tempMin,
		precipitationSum,
		windMax,
		cloudMean,
		hourlyTime,
		hourlyTempActual,
		hourlyTempPredicted
	};
}

// Per-variable scale: this much |error| counts as 100% wrong for that variable.
// Tuned by feel; these are the kinds of misses that would visibly change a day.
const LIE_SCALE: Record<keyof Omit<MultiVariableComparison,
	'targetDate' | 'leadDays' | 'hourlyTime' | 'hourlyTempActual' | 'hourlyTempPredicted'>, number> = {
	tempMax: 5,            // °C
	tempMin: 5,            // °C
	precipitationSum: 10,  // mm
	windMax: 15,           // km/h
	cloudMean: 50          // %
};

export function computeLieScore(c: MultiVariableComparison): LieScore {
	const keys = Object.keys(LIE_SCALE) as (keyof typeof LIE_SCALE)[];
	const contributions: LieScore['contributions'] = {};
	let total = 0;
	let count = 0;
	for (const key of keys) {
		const pair = c[key];
		if (pair.actual !== null && pair.predicted !== null) {
			const err = Math.abs(pair.actual - pair.predicted);
			const contrib = Math.min(100, (err / LIE_SCALE[key]) * 100);
			contributions[key] = contrib;
			total += contrib;
			count++;
		}
	}
	return { score: count > 0 ? total / count : 0, contributions };
}
