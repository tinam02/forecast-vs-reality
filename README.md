# Forecast vs Reality

How wrong was the forecast? Pick a city and a past date, see what the forecast said N days earlier vs. what actually happened.

Built on free [Open-Meteo](https://open-meteo.com/) APIs

## Two-phase plan

**Phase 1 (working now):** On-demand. Type any city, pick any date, lead time 1–7 days. Uses Open-Meteo's Previous Runs API + Historical Weather API entirely from the browser.

**Phase 2 (rolling out):** A daily GitHub Actions cron archives 30-day forecasts for a list of "tracked" cities into JSON files in this repo. After ~30 days of running, the archive has long-range forecast-vs-actual data that nobody else publishes for free.

Why two phases? Open-Meteo only archives short-range (1–7 day) past forecasts. For longer lead times, the data has to be self-archived going forward. Phase 1 ships immediate value; Phase 2 fills in over time.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Customize for your fork (Phase 2)

The cron archiver pulls forecasts for the cities in [`config/cities.ts`](config/cities.ts). After forking:

1. Edit `config/cities.ts` — add/remove entries.
2. Need lat/lon for a new city? Run `npm run geocode "Your City"` and paste the printed entry.
3. Push. The GitHub Actions cron starts collecting on its next scheduled run.

The Phase 1 search UI ignores this list — it geocodes anything the user types. The list only drives the long-running self-archive.

## Limits to know

- Lead time in Phase 1 is capped at **7 days** because that's all Open-Meteo's Previous Runs archive holds for any model. Beyond ~10 days, deterministic forecast skill collapses anyway — the apps that show "30-day forecasts" are mostly publishing climate-anomaly probabilities dressed up as point predictions.
- Geocoding returns multiple matches for ambiguous names (e.g. "Belgrade" → Serbia / Montana / Belgium) — pick the right one in the dropdown.
