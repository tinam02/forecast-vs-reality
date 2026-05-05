import type { City } from '../src/lib/types';

/**
 * Cities the daily archiver (Phase 2) will collect 30-day forecasts for.
 *
 * To customize after forking:
 *   1. Edit this list — add/remove entries.
 *   2. Run `npm run geocode "Some City"` to get lat/lon for a new city.
 *   3. Push. The GitHub Actions cron will pick up your list on its next run.
 *
 * The Phase 1 on-demand UI does NOT use this list — it geocodes whatever the
 * user types. This list only drives the long-running self-archive.
 */
export const TRACKED_CITIES: City[] = [
	{ id: 'belgrade', name: 'Beograd', country: 'RS', lat: 44.804, lon: 20.4651 },
	{ id: 'novi-sad', name: 'Novi Sad', country: 'RS', lat: 45.2517, lon: 19.8369 },
	{ id: 'nis', name: 'Niš', country: 'RS', lat: 43.319, lon: 21.8957 },
	{ id: 'alghero', name: 'Alghero', country: 'IT', lat: 40.5588, lon: 8.3197 }
];
