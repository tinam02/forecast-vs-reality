// Helper: print a ready-to-paste config/cities.ts entry for a given city name.
// Usage: npm run geocode "Lisbon"

const name = process.argv[2];
if (!name) {
	console.error('Usage: npm run geocode "<City Name>"');
	process.exit(1);
}

const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
url.searchParams.set('name', name);
url.searchParams.set('count', '5');
url.searchParams.set('format', 'json');

const res = await fetch(url);
if (!res.ok) {
	console.error(`Geocoding failed: ${res.status}`);
	process.exit(1);
}
const data: { results?: Array<{
	name: string;
	country: string;
	country_code: string;
	admin1?: string;
	latitude: number;
	longitude: number;
	population?: number;
}> } = await res.json();

const results = data.results ?? [];
if (results.length === 0) {
	console.error(`No matches for "${name}"`);
	process.exit(1);
}

console.log(`Top matches for "${name}":\n`);
results.forEach((r, i) => {
	const id = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	console.log(
		`${i + 1}. ${r.name}, ${r.admin1 ?? ''}${r.admin1 ? ', ' : ''}${r.country} ` +
			`(pop. ${r.population?.toLocaleString() ?? '?'})`
	);
	console.log(
		`   { id: '${id}', name: '${r.name}', country: '${r.country_code}', ` +
			`lat: ${r.latitude}, lon: ${r.longitude} },\n`
	);
});
