/**
 * Real-time weather service using Open-Meteo API (FREE, no API key needed)
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

// Default location: Nashik, Maharashtra
const DEFAULT_LOCATION = { lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra' };

export interface RealWeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  forecast: RealForecastDay[];
  soilMoisture: number;
  region: string;
  lastUpdated: string;
}

export interface RealForecastDay {
  day: string;
  tempHigh: number;
  tempLow: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  rainChance: number;
}

function mapWeatherCode(code: number, temp?: number): 'sunny' | 'cloudy' | 'rainy' | 'stormy' {
  if (code >= 95) return 'stormy';
  if (code >= 80) return 'rainy';
  if (code >= 61) return 'rainy';
  if (code >= 51) return 'rainy';
  if (code >= 45) return 'cloudy';
  if (code >= 3) return 'cloudy';
  if (temp && temp > 40) return 'sunny'; // heatwave treated as sunny
  return 'sunny';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en`);
    const data = await res.json();
    if (data.results?.length > 0) {
      const r = data.results[0];
      return { lat: r.latitude, lon: r.longitude, name: `${r.name}, ${r.admin1 || r.country}` };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRealWeather(
  lat: number = DEFAULT_LOCATION.lat,
  lon: number = DEFAULT_LOCATION.lon,
  regionName: string = DEFAULT_LOCATION.name
): Promise<RealWeatherData> {
  try {
    const res = await fetch(
      `${WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
      `&hourly=soil_moisture_0_to_1cm` +
      `&timezone=auto&forecast_days=7`
    );
    const data = await res.json();
    const current = data.current;
    const daily = data.daily;

    // Get soil moisture (average of first 24 hours)
    const soilMoistureHourly = data.hourly?.soil_moisture_0_to_1cm || [];
    const avgSoilMoisture = soilMoistureHourly.length > 0
      ? Math.round((soilMoistureHourly.slice(0, 24).reduce((a: number, b: number) => a + b, 0) / Math.min(24, soilMoistureHourly.length)) * 100)
      : 45;

    const forecast: RealForecastDay[] = daily.time.slice(0, 5).map((date: string, i: number) => {
      const d = new Date(date);
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()];
      return {
        day: dayLabel,
        tempHigh: Math.round(daily.temperature_2m_max[i]),
        tempLow: Math.round(daily.temperature_2m_min[i]),
        condition: mapWeatherCode(daily.weather_code[i], daily.temperature_2m_max[i]),
        rainChance: daily.precipitation_probability_max?.[i] ?? Math.round(daily.precipitation_sum[i] > 0 ? 70 : 10),
      };
    });

    return {
      temperature: Math.round(current.temperature_2m),
      humidity: Math.round(current.relative_humidity_2m),
      rainfall: current.precipitation || 0,
      windSpeed: Math.round(current.wind_speed_10m),
      condition: mapWeatherCode(current.weather_code, current.temperature_2m),
      forecast,
      soilMoisture: avgSoilMoisture,
      region: regionName,
      lastUpdated: new Date().toLocaleTimeString(),
    };
  } catch (error) {
    console.warn('Weather fetch failed, using defaults:', error);
    // Return sensible defaults when offline
    return {
      temperature: 30,
      humidity: 60,
      rainfall: 0,
      windSpeed: 10,
      condition: 'sunny',
      forecast: [
        { day: 'Today', tempHigh: 30, tempLow: 22, condition: 'sunny', rainChance: 10 },
        { day: 'Tomorrow', tempHigh: 31, tempLow: 23, condition: 'cloudy', rainChance: 20 },
        { day: 'Wed', tempHigh: 29, tempLow: 21, condition: 'rainy', rainChance: 60 },
        { day: 'Thu', tempHigh: 28, tempLow: 20, condition: 'cloudy', rainChance: 30 },
        { day: 'Fri', tempHigh: 32, tempLow: 23, condition: 'sunny', rainChance: 5 },
      ],
      soilMoisture: 45,
      region: regionName,
      lastUpdated: new Date().toLocaleTimeString(),
    };
  }
}
