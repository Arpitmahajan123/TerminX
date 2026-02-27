/**
 * visualCrossing.js - Visual Crossing Weather API integration
 * Fetches real weather data: current + 15-day forecast
 * API Key: EL9WAFN67WCPM3YWUFH7FLGJT
 */

const API_KEY = 'EL9WAFN67WCPM3YWUFH7FLGJT';
const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

/**
 * Fetch weather timeline for a location.
 * Returns 15 days of data with all required signals.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ days: Array, location: object }>}
 */
export async function fetchWeatherTimeline(lat, lon) {
    const url = `${BASE_URL}/${lat},${lon}?unitGroup=metric&key=${API_KEY}&include=days&contentType=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();

    return {
        location: {
            lat: data.latitude,
            lon: data.longitude,
            address: data.resolvedAddress,
            timezone: data.timezone,
        },
        days: data.days.map(d => ({
            date: d.datetime,
            tempmax: d.tempmax,
            tempmin: d.tempmin,
            temp: d.temp,
            humidity: d.humidity,
            precip: d.precip || 0,
            precipprob: d.precipprob || 0,
            windspeed: d.windspeed,
            windgust: d.windgust || 0,
            solarradiation: d.solarradiation || 0,
            uvindex: d.uvindex || 0,
            conditions: d.conditions,
            description: d.description,
            icon: d.icon,
        })),
    };
}

/**
 * Geocode a city name to lat/lon using Visual Crossing.
 * @param {string} cityName
 * @returns {Promise<{ lat: number, lon: number, name: string } | null>}
 */
export async function geocodeCityVC(cityName) {
    try {
        const url = `${BASE_URL}/${encodeURIComponent(cityName)}?unitGroup=metric&key=${API_KEY}&include=days&contentType=json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            lat: data.latitude,
            lon: data.longitude,
            name: data.resolvedAddress || cityName,
        };
    } catch (e) {
        return null;
    }
}
