/**
 * weatherAPI.js - Fetch REAL weather: past, current, and 7-day forecast
 * Uses Open-Meteo API — FREE, no API key required!
 *
 * Features:
 * - Geocode city name → lat/lon
 * - Fetch past 7 days weather history
 * - Fetch current weather
 * - Fetch 7-day forecast
 * - Map real weather codes to game weather types
 * - Simple weather prediction based on trends
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORY_URL = 'https://archive-api.open-meteo.com/v1/archive';

// ─── GEOCODING ─────────────────────────────────────────

/**
 * Geocode a city name to coordinates.
 * @param {string} city - City name (e.g., "Nagpur", "Mumbai")
 * @returns {Promise<{ lat: number, lon: number, name: string } | null>}
 */
export async function geocodeCity(city) {
    try {
        const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const r = data.results[0];
            return { lat: r.latitude, lon: r.longitude, name: r.name };
        }
        return null;
    } catch (e) {
        console.warn('Geocoding failed:', e.message);
        return null;
    }
}

// ─── WEATHER CODE MAPPING ──────────────────────────────

/**
 * Map WMO weather code to game weather type.
 * WMO codes: https://open-meteo.com/en/docs
 */
function mapWeatherCode(code, temperature) {
    if (code >= 95) return 'Storm';       // Thunderstorm
    if (code >= 80) return 'Rain';        // Rain showers
    if (code >= 61) return 'Rain';        // Rain
    if (code >= 51) return 'Rain';        // Drizzle
    if (code >= 45) return 'Rain';        // Fog (treat as rain for farming)
    // Check for heatwave based on temperature
    if (temperature && temperature > 40) return 'Heatwave';
    if (temperature && temperature > 38) return 'Heatwave';
    return 'Sunny';
}

/**
 * Get weather emoji for a weather type.
 */
function getEmoji(type) {
    return { Sunny: '☀️', Rain: '🌧️', Heatwave: '🔥', Storm: '⛈️' }[type] || '☀️';
}

// ─── CURRENT WEATHER ───────────────────────────────────

/**
 * Fetch current weather for coordinates.
 * @returns {Promise<{ weather: string, temperature: number, humidity: number, windSpeed: number }>}
 */
export async function fetchCurrentWeather(lat, lon) {
    try {
        const res = await fetch(
            `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
        );
        const data = await res.json();
        const c = data.current;
        return {
            weather: mapWeatherCode(c.weather_code, c.temperature_2m),
            temperature: c.temperature_2m,
            humidity: c.relative_humidity_2m,
            windSpeed: c.wind_speed_10m,
        };
    } catch (e) {
        console.warn('Current weather fetch failed:', e.message);
        return { weather: 'Sunny', temperature: 30, humidity: 60, windSpeed: 10 };
    }
}

/**
 * Shorthand: fetch game weather type for a location.
 */
export async function fetchGameWeather(lat, lon) {
    const result = await fetchCurrentWeather(lat, lon);
    return result.weather;
}

// ─── 7-DAY FORECAST ────────────────────────────────────

/**
 * Fetch 7-day weather forecast.
 * @returns {Promise<Array<{ date: string, weather: string, emoji: string, tempMax: number, tempMin: number, rain: number }>>}
 */
export async function fetchForecast(lat, lon) {
    try {
        const res = await fetch(
            `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`
        );
        const data = await res.json();
        const d = data.daily;

        return d.time.map((date, i) => ({
            date,
            weather: mapWeatherCode(d.weather_code[i], d.temperature_2m_max[i]),
            emoji: getEmoji(mapWeatherCode(d.weather_code[i], d.temperature_2m_max[i])),
            tempMax: d.temperature_2m_max[i],
            tempMin: d.temperature_2m_min[i],
            rain: d.precipitation_sum[i],
        }));
    } catch (e) {
        console.warn('Forecast fetch failed:', e.message);
        return [];
    }
}

// ─── PAST 7-DAY HISTORY ────────────────────────────────

/**
 * Fetch past 7 days weather history.
 * @returns {Promise<Array<{ date: string, weather: string, emoji: string, tempMax: number, tempMin: number, rain: number }>>}
 */
export async function fetchWeatherHistory(lat, lon) {
    try {
        const today = new Date();
        const end = new Date(today);
        end.setDate(end.getDate() - 1); // Yesterday
        const start = new Date(today);
        start.setDate(start.getDate() - 7);

        const fmt = (d) => d.toISOString().split('T')[0];

        const res = await fetch(
            `${HISTORY_URL}?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
        );
        const data = await res.json();
        const d = data.daily;

        if (!d || !d.time) return [];

        return d.time.map((date, i) => ({
            date,
            weather: mapWeatherCode(d.weather_code[i], d.temperature_2m_max[i]),
            emoji: getEmoji(mapWeatherCode(d.weather_code[i], d.temperature_2m_max[i])),
            tempMax: d.temperature_2m_max[i],
            tempMin: d.temperature_2m_min[i],
            rain: d.precipitation_sum[i],
        }));
    } catch (e) {
        console.warn('Weather history fetch failed:', e.message);
        return [];
    }
}

// ─── FULL WEATHER DATA (PAST + CURRENT + FORECAST) ────

/**
 * Fetch complete weather data: past 7 days + current + 7-day forecast.
 * This is the main function the game uses.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ history: Array, current: object, forecast: Array, prediction: object }>}
 */
export async function fetchFullWeatherData(lat, lon) {
    const [history, current, forecast] = await Promise.all([
        fetchWeatherHistory(lat, lon),
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon),
    ]);

    // Generate prediction based on trends
    const prediction = generateWeatherPrediction(history, forecast);

    return { history, current, forecast, prediction };
}

// ─── WEATHER PREDICTION ENGINE ─────────────────────────

/**
 * Analyze past + forecast data to generate weather predictions.
 * This is the "AI" prediction that helps farmers plan.
 * @param {Array} history - Past 7 days
 * @param {Array} forecast - Next 7 days
 * @returns {{ 
 *   nextWeekOutlook: string,
 *   rainDays: number,
 *   stormRisk: string,
 *   heatwaveRisk: string,
 *   bestPlantingWindow: string,
 *   bestHarvestWindow: string,
 *   growthImpact: string,
 *   spoilageRisk: string,
 *   transportRisk: string,
 *   recommendation: string
 * }}
 */
function generateWeatherPrediction(history, forecast) {
    const allData = [...history, ...forecast];

    // Count weather types in forecast
    const forecastCounts = { Sunny: 0, Rain: 0, Heatwave: 0, Storm: 0 };
    forecast.forEach(d => { forecastCounts[d.weather] = (forecastCounts[d.weather] || 0) + 1; });

    // Count weather types in history
    const historyCounts = { Sunny: 0, Rain: 0, Heatwave: 0, Storm: 0 };
    history.forEach(d => { historyCounts[d.weather] = (historyCounts[d.weather] || 0) + 1; });

    const totalForecast = forecast.length || 1;
    const rainDays = forecastCounts.Rain + forecastCounts.Storm;
    const sunnyDays = forecastCounts.Sunny;
    const hotDays = forecastCounts.Heatwave;

    // Next week outlook
    let nextWeekOutlook;
    if (rainDays >= 4) nextWeekOutlook = '🌧️ Mostly rainy week ahead';
    else if (hotDays >= 3) nextWeekOutlook = '🔥 Heat wave expected';
    else if (forecastCounts.Storm >= 2) nextWeekOutlook = '⛈️ Multiple storms expected';
    else if (sunnyDays >= 5) nextWeekOutlook = '☀️ Clear & sunny week ahead';
    else nextWeekOutlook = '🌤️ Mixed conditions expected';

    // Storm risk
    let stormRisk;
    if (forecastCounts.Storm >= 3) stormRisk = '🔴 HIGH — Multiple storms predicted';
    else if (forecastCounts.Storm >= 1) stormRisk = '🟡 MEDIUM — Storm possible';
    else stormRisk = '🟢 LOW — No storms expected';

    // Heatwave risk
    let heatwaveRisk;
    if (hotDays >= 3) heatwaveRisk = '🔴 HIGH — Extended heat expected';
    else if (hotDays >= 1) heatwaveRisk = '🟡 MEDIUM — Brief heat possible';
    else heatwaveRisk = '🟢 LOW — Temperatures normal';

    // Best planting window
    let bestPlantingWindow;
    if (rainDays >= 2 && rainDays <= 4) bestPlantingWindow = '✅ Good — Rain will help growth';
    else if (rainDays > 4) bestPlantingWindow = '⚠️ Risky — Too much rain may damage crops';
    else if (hotDays >= 3) bestPlantingWindow = '⚠️ Risky — Heat may slow growth';
    else bestPlantingWindow = '✅ Good — Stable weather for planting';

    // Best harvest window (find consecutive sunny days in forecast)
    const sunnyStreak = findSunnyStreak(forecast);
    let bestHarvestWindow;
    if (sunnyStreak >= 3) bestHarvestWindow = `✅ Day ${forecast.findIndex(d => d.weather === 'Sunny') + 1}-${forecast.findIndex(d => d.weather === 'Sunny') + sunnyStreak} — Sunny stretch`;
    else if (forecastCounts.Storm >= 2) bestHarvestWindow = '⚠️ Harvest ASAP before storms';
    else bestHarvestWindow = '🟡 Mixed — Harvest when ready';

    // Growth impact
    let growthImpact;
    if (rainDays >= 2 && rainDays <= 4 && hotDays === 0) growthImpact = '📈 POSITIVE — Rain boosts growth';
    else if (hotDays >= 3) growthImpact = '📉 NEGATIVE — Heat slows growth';
    else if (forecastCounts.Storm >= 2) growthImpact = '📉 NEGATIVE — Storms may damage crops';
    else growthImpact = '➡️ NEUTRAL — Normal growth expected';

    // Spoilage risk
    let spoilageRisk;
    if (rainDays + hotDays >= 5) spoilageRisk = '🔴 HIGH — Sell stored crops soon!';
    else if (rainDays + hotDays >= 3) spoilageRisk = '🟡 MEDIUM — Monitor stored crops';
    else spoilageRisk = '🟢 LOW — Safe to store';

    // Transport risk
    let transportRisk;
    if (forecastCounts.Storm >= 2) transportRisk = '🔴 HIGH — Storms will delay trucks';
    else if (forecastCounts.Storm >= 1 || hotDays >= 2) transportRisk = '🟡 MEDIUM — Possible delays';
    else transportRisk = '🟢 LOW — Clear roads expected';

    // Overall recommendation
    let recommendation;
    if (stormRisk.includes('HIGH')) {
        recommendation = '⚠️ Avoid planting this week. Harvest mature crops immediately. Sell stored stock before quality drops.';
    } else if (heatwaveRisk.includes('HIGH')) {
        recommendation = '🔥 Plant heat-resistant crops (Sugarcane, Cotton). Avoid Tomato/Potato. Sell perishables quickly.';
    } else if (rainDays >= 3 && rainDays <= 5) {
        recommendation = '🌧️ Great time to plant! Rain will boost growth. Consider Rice and Sugarcane for best results.';
    } else if (sunnyDays >= 5) {
        recommendation = '☀️ Excellent for harvesting and transport. Plant if you have seeds. Sell at export market for best prices.';
    } else {
        recommendation = '🌤️ Balanced conditions. Plant strategically and monitor market prices before selling.';
    }

    return {
        nextWeekOutlook,
        rainDays,
        stormRisk,
        heatwaveRisk,
        bestPlantingWindow,
        bestHarvestWindow,
        growthImpact,
        spoilageRisk,
        transportRisk,
        recommendation,
    };
}

/**
 * Find the longest streak of sunny days in forecast.
 */
function findSunnyStreak(forecast) {
    let max = 0, current = 0;
    for (const d of forecast) {
        if (d.weather === 'Sunny') { current++; max = Math.max(max, current); }
        else { current = 0; }
    }
    return max;
}
