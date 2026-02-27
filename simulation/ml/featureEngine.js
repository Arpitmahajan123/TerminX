/**
 * featureEngine.js - Feature Engineering Layer
 * Converts raw weather data into ML-ready features.
 * 
 * This is the CRITICAL layer that makes the system intelligent.
 * Raw weather is weak — derived features win hackathons.
 */

/**
 * Compute all derived features from weather data array.
 * @param {Array<{ tempmax, tempmin, temp, humidity, precip, windgust, uvindex, solarradiation }>} days
 * @returns {object} Engineered features
 */
export function computeFeatures(days) {
    if (!days || days.length === 0) return getDefaultFeatures();

    const last7 = days.slice(0, Math.min(7, days.length));
    const all = days;

    // ─── HEAT FEATURES ─────────────────────────
    const temps = last7.map(d => d.temp);
    const tempMaxes = last7.map(d => d.tempmax);
    const avg_temp_7d = avg(temps);
    const max_temp_7d = Math.max(...tempMaxes);
    const min_temp_7d = Math.min(...last7.map(d => d.tempmin));

    // Heatwave: tempmax > 40 for 3+ consecutive days
    let heatwaveCount = 0;
    let maxHeatConsecutive = 0;
    for (const d of last7) {
        if (d.tempmax > 40) { heatwaveCount++; maxHeatConsecutive = Math.max(maxHeatConsecutive, heatwaveCount); }
        else heatwaveCount = 0;
    }
    const heatwave_flag = maxHeatConsecutive >= 3 ? 1 : 0;

    // ─── MOISTURE FEATURES ─────────────────────
    const humidities = last7.map(d => d.humidity);
    const avg_humidity = avg(humidities);
    const total_rain_7d = sum(last7.map(d => d.precip));
    const max_rain = Math.max(...last7.map(d => d.precip));

    // Drought: humidity < 20 for 5+ days
    const lowHumDays = last7.filter(d => d.humidity < 20).length;
    const drought_flag = lowHumDays >= 5 ? 1 : 0;

    // Flood risk: heavy rain
    const flood_flag = total_rain_7d > 100 ? 1 : 0;

    // ─── WIND STRESS ───────────────────────────
    const gusts = last7.map(d => d.windgust);
    const max_windgust = Math.max(...gusts);
    const avg_windspeed = avg(last7.map(d => d.windspeed || 0));
    const high_wind_flag = max_windgust > 30 ? 1 : 0;

    // ─── RADIATION STRESS ──────────────────────
    const uvs = last7.map(d => d.uvindex);
    const avg_uvindex = avg(uvs);
    const max_uvindex = Math.max(...uvs);
    const high_uv_flag = max_uvindex >= 9 ? 1 : 0;
    const avg_solar = avg(last7.map(d => d.solarradiation));

    // ─── COMPOSITE SCORES ─────────────────────
    const heat_stress_score = clamp(((avg_temp_7d - 25) / 20) + (heatwave_flag * 0.3), 0, 1);
    const moisture_stress_score = clamp(((30 - avg_humidity) / 30) + (drought_flag * 0.3) - (total_rain_7d / 50 * 0.2), 0, 1);
    const wind_stress_score = clamp((max_windgust - 15) / 30 + (high_wind_flag * 0.2), 0, 1);
    const uv_stress_score = clamp((avg_uvindex - 5) / 6 + (high_uv_flag * 0.2), 0, 1);

    // Overall environmental stress (0 = perfect, 1 = extreme)
    const overall_stress = clamp(
        heat_stress_score * 0.35 +
        moisture_stress_score * 0.30 +
        wind_stress_score * 0.15 +
        uv_stress_score * 0.20,
        0, 1
    );

    return {
        // Raw aggregates
        avg_temp_7d: round2(avg_temp_7d),
        max_temp_7d: round2(max_temp_7d),
        min_temp_7d: round2(min_temp_7d),
        avg_humidity: round2(avg_humidity),
        total_rain_7d: round2(total_rain_7d),
        max_rain: round2(max_rain),
        max_windgust: round2(max_windgust),
        avg_windspeed: round2(avg_windspeed),
        avg_uvindex: round2(avg_uvindex),
        max_uvindex: round2(max_uvindex),
        avg_solar: round2(avg_solar),

        // Flags
        heatwave_flag,
        drought_flag,
        flood_flag,
        high_wind_flag,
        high_uv_flag,

        // Composite scores (0-1)
        heat_stress_score: round2(heat_stress_score),
        moisture_stress_score: round2(moisture_stress_score),
        wind_stress_score: round2(wind_stress_score),
        uv_stress_score: round2(uv_stress_score),
        overall_stress: round2(overall_stress),
    };
}

/**
 * Get weather condition for simulation from Visual Crossing icon.
 */
export function mapConditionToWeather(icon) {
    const map = {
        'clear-day': 'Sunny', 'clear-night': 'Sunny',
        'partly-cloudy-day': 'Sunny', 'partly-cloudy-night': 'Sunny',
        'cloudy': 'Cloudy', 'rain': 'Rain', 'showers-day': 'Rain',
        'showers-night': 'Rain', 'thunder-rain': 'Storm',
        'thunder-showers-day': 'Storm', 'snow': 'Storm',
        'fog': 'Cloudy', 'wind': 'Wind', 'hail': 'Storm',
    };
    return map[icon] || 'Sunny';
}

function getDefaultFeatures() {
    return {
        avg_temp_7d: 30, max_temp_7d: 35, min_temp_7d: 22,
        avg_humidity: 50, total_rain_7d: 10, max_rain: 5,
        max_windgust: 15, avg_windspeed: 10, avg_uvindex: 6, max_uvindex: 8, avg_solar: 250,
        heatwave_flag: 0, drought_flag: 0, flood_flag: 0, high_wind_flag: 0, high_uv_flag: 0,
        heat_stress_score: 0.2, moisture_stress_score: 0.2, wind_stress_score: 0.1, uv_stress_score: 0.2,
        overall_stress: 0.2,
    };
}

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function round2(v) { return Math.round(v * 100) / 100; }
