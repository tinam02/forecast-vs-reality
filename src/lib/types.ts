export interface City {
	id: string;
	name: string;
	country: string;
	lat: number;
	lon: number;
}

export interface GeocodingResult {
	id: number;
	name: string;
	country: string;
	country_code: string;
	latitude: number;
	longitude: number;
	admin1?: string;
	population?: number;
	timezone?: string;
}

export interface ForecastVsActual {
	targetDate: string;
	leadDays: number;
	hourlyTime: string[];
	hourlyActual: (number | null)[];
	hourlyPredicted: (number | null)[];
	dailyActualMax: number | null;
	dailyActualMin: number | null;
	dailyPredictedMax: number | null;
	dailyPredictedMin: number | null;
}

export interface HistoricalDay {
	date: string;
	tempMax: number | null;
	tempMin: number | null;
	precipitation: number | null;
	windSpeedMax: number | null;
	weatherCode: number | null;
	cloudCoverMean: number | null;
}
