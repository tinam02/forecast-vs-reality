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

export interface VariableComparison {
	predicted: number | null;
	actual: number | null;
}

export interface MultiVariableComparison {
	targetDate: string;
	leadDays: number;
	tempMax: VariableComparison;
	tempMin: VariableComparison;
	precipitationSum: VariableComparison;
	windMax: VariableComparison;
	cloudMean: VariableComparison;
	hourlyTime: string[];
	hourlyTempActual: (number | null)[];
	hourlyTempPredicted: (number | null)[];
}

export interface LieScore {
	score: number;
	contributions: Partial<Record<keyof MultiVariableComparison, number>>;
}
