export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  forecast: ForecastDay[];
  soilMoisture: number;
  region: string;
}

export interface ForecastDay {
  day: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  rainChance: number;
}

export const mockWeather: WeatherData = {
  temperature: 34,
  humidity: 72,
  rainfall: 0,
  windSpeed: 12,
  condition: 'sunny',
  soilMoisture: 45,
  region: 'Nashik, Maharashtra',
  forecast: [
    { day: 'Today', tempHigh: 34, tempLow: 24, condition: 'sunny', rainChance: 5 },
    { day: 'Tomorrow', tempHigh: 33, tempLow: 23, condition: 'cloudy', rainChance: 20 },
    { day: 'Wed', tempHigh: 30, tempLow: 22, condition: 'rainy', rainChance: 75 },
    { day: 'Thu', tempHigh: 28, tempLow: 21, condition: 'stormy', rainChance: 90 },
    { day: 'Fri', tempHigh: 31, tempLow: 22, condition: 'cloudy', rainChance: 30 },
  ],
};
