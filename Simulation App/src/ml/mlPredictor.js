/**
 * mlPredictor.js - ML Prediction Model (Simulated XGBoost)
 * 
 * Predicts: Crop Yield, Risk Score, Expected Profit, Stress Level
 * 
 * In production this would be a trained XGBoost/Random Forest model.
 * For hackathon, we simulate the model output using feature-weighted scoring
 * that mimics what a trained model would produce.
 */
import CROPS from '../data/crops';
import { isHindi } from '../i18n/lang';

/**
 * @typedef {object} PredictionResult
 * @property {string} crop
 * @property {number} predicted_yield - tons/hectare
 * @property {number} risk_score - 0 to 1
 * @property {number} expected_profit - ₹
 * @property {string} stress_level - Low/Medium/High/Critical
 * @property {number} health_score - 0-100
 * @property {object} factors - breakdown of factors
 */

/**
 * Predict crop performance based on engineered weather features.
 * Simulates XGBoost model: features → weighted scoring → prediction
 * 
 * @param {string} cropName
 * @param {object} features - output from featureEngine.computeFeatures()
 * @param {object} farmParams - { acres, soilType, irrigationType }
 * @returns {PredictionResult}
 */
export function predictCropPerformance(cropName, features, farmParams = {}) {
    const crop = CROPS.find(c => c.name === cropName);
    if (!crop) return null;

    const acres = farmParams.acres || 1;
    const soilMod = getSoilModifier(farmParams.soilType || 'loamy');
    const irrigMod = getIrrigationModifier(farmParams.irrigationType || 'rainfed');

    // ─── YIELD PREDICTION ─────────────────────────
    // Base yield modified by weather features (simulating XGBoost)
    const baseYieldPerAcre = crop.baseYield / 1000; // tons

    // Weather impact on yield (each feature has a weight)
    const weatherYieldFactor =
        1.0
        - features.heat_stress_score * 0.15      // heat reduces yield
        - features.moisture_stress_score * 0.20  // drought worst for yield
        - features.wind_stress_score * 0.08      // wind moderate impact
        - features.uv_stress_score * 0.05        // UV minor impact
        + (features.total_rain_7d > 5 && features.total_rain_7d < 30 ? 0.05 : 0) // moderate rain helps
        - (features.flood_flag * 0.25)           // flooding devastating
        - (features.heatwave_flag * 0.12)        // heatwave big hit
        - (features.drought_flag * 0.15);        // drought big hit

    // Crop-specific sensitivity
    const sensitivityMod = crop.weatherSensitivity === 'High' ? 1.3 :
        crop.weatherSensitivity === 'Medium' ? 1.0 : 0.7;

    const adjustedYieldFactor = Math.max(0.2, 1 + (weatherYieldFactor - 1) * sensitivityMod);
    const predicted_yield = Math.round(baseYieldPerAcre * adjustedYieldFactor * soilMod * irrigMod * acres * 100) / 100;

    // ─── RISK SCORE ───────────────────────────────
    const risk_score = Math.min(1, Math.max(0,
        features.overall_stress * 0.4 +
        features.heatwave_flag * 0.15 +
        features.drought_flag * 0.15 +
        features.flood_flag * 0.15 +
        features.high_wind_flag * 0.05 +
        (1 - adjustedYieldFactor) * 0.3
    ));

    // ─── HEALTH SCORE ─────────────────────────────
    const health_score = Math.round(Math.max(0, Math.min(100,
        100 * (1 - features.overall_stress * 0.6 - risk_score * 0.4)
    )));

    // ─── STRESS LEVEL ─────────────────────────────
    const stress_level = risk_score > 0.7 ? 'Critical' :
        risk_score > 0.5 ? 'High' :
            risk_score > 0.3 ? 'Medium' : 'Low';

    // ─── EXPECTED PROFIT ──────────────────────────
    const yieldKg = predicted_yield * 1000;
    const revenue = yieldKg * crop.basePrice;
    const seedCost = crop.seedCostPerKg * yieldKg * 0.1; // seed cost ~10% of yield
    const expected_profit = Math.round(revenue - seedCost);

    // ─── FACTOR BREAKDOWN ─────────────────────────
    const factors = {
        heat: {
            impact: features.heat_stress_score > 0.5 ? 'Negative' : 'Normal',
            detail: `Avg ${features.avg_temp_7d}°C, Max ${features.max_temp_7d}°C${features.heatwave_flag ? ' ⚠️ HEATWAVE' : ''}`,
            detailHi: `औसत ${features.avg_temp_7d}°C, अधिकतम ${features.max_temp_7d}°C${features.heatwave_flag ? ' ⚠️ लू' : ''}`,
        },
        moisture: {
            impact: features.moisture_stress_score > 0.5 ? 'Negative' : 'Normal',
            detail: `Humidity ${features.avg_humidity}%, Rain ${features.total_rain_7d}mm${features.drought_flag ? ' ⚠️ DROUGHT' : ''}`,
            detailHi: `नमी ${features.avg_humidity}%, बारिश ${features.total_rain_7d}mm${features.drought_flag ? ' ⚠️ सूखा' : ''}`,
        },
        wind: {
            impact: features.high_wind_flag ? 'Negative' : 'Normal',
            detail: `Max gust ${features.max_windgust} km/h${features.high_wind_flag ? ' ⚠️ HIGH WIND' : ''}`,
            detailHi: `अधिकतम झोंका ${features.max_windgust} km/h${features.high_wind_flag ? ' ⚠️ तेज़ हवा' : ''}`,
        },
        uv: {
            impact: features.high_uv_flag ? 'Warning' : 'Normal',
            detail: `UV Index ${features.avg_uvindex} (max ${features.max_uvindex})${features.high_uv_flag ? ' ⚠️ HIGH UV' : ''}`,
            detailHi: `UV सूचकांक ${features.avg_uvindex} (अधिकतम ${features.max_uvindex})${features.high_uv_flag ? ' ⚠️ तेज़ धूप' : ''}`,
        },
    };

    return {
        crop: cropName,
        cropHi: crop.nameHi,
        emoji: crop.emoji,
        predicted_yield,
        risk_score: Math.round(risk_score * 100) / 100,
        expected_profit,
        stress_level,
        health_score,
        factors,
        weatherYieldFactor: Math.round(adjustedYieldFactor * 100) / 100,
    };
}

/**
 * Predict all crops at once.
 */
export function predictAllCrops(features, farmParams = {}) {
    return CROPS.map(crop => predictCropPerformance(crop.name, features, farmParams))
        .filter(Boolean)
        .sort((a, b) => b.expected_profit - a.expected_profit);
}

// ─── MODIFIERS ─────────────────────────────────
function getSoilModifier(soilType) {
    const mods = { clay: 0.8, sandy: 0.85, loamy: 1.0, 'black cotton': 1.05, alluvial: 1.1 };
    return mods[soilType?.toLowerCase()] || 1.0;
}

function getIrrigationModifier(irrigationType) {
    const mods = { rainfed: 0.7, canal: 0.85, borewell: 0.9, drip: 1.0, sprinkler: 0.95 };
    return mods[irrigationType?.toLowerCase()] || 0.7;
}
