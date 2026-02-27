/**
 * recommendations.js - Smart Recommendation Engine
 * Generates farmer-actionable advice based on ML features and predictions.
 */

/**
 * Generate recommendations based on weather features and crop predictions.
 * @param {object} features - from featureEngine
 * @param {Array} predictions - from mlPredictor.predictAllCrops
 * @returns {Array<{ icon: string, title: string, titleHi: string, desc: string, descHi: string, severity: 'info'|'warning'|'danger' }>}
 */
export function generateRecommendations(features, predictions) {
    const recs = [];

    // ─── HEATWAVE ─────────────────────────
    if (features.heatwave_flag) {
        recs.push({
            icon: '🔥', severity: 'danger',
            title: 'Heatwave Alert!',
            titleHi: 'लू की चेतावनी!',
            desc: `Temperature exceeding 40°C for 3+ days. Use drip irrigation, apply mulch, irrigate early morning/late evening. Avoid field work 11am-3pm.`,
            descHi: `तापमान 3+ दिनों से 40°C से ऊपर। ड्रिप सिंचाई करें, मल्चिंग लगाएं, सुबह/शाम सिंचाई करें। दोपहर 11-3 बजे खेत में काम न करें।`,
        });
    }

    // ─── DROUGHT ──────────────────────────
    if (features.drought_flag) {
        recs.push({
            icon: '🏜️', severity: 'danger',
            title: 'Drought Conditions',
            titleHi: 'सूखे की स्थिति',
            desc: `Very low humidity (${features.avg_humidity}%) for extended period. Emergency watering needed. Consider drought-resistant varieties for next crop.`,
            descHi: `बहुत कम नमी (${features.avg_humidity}%) लंबे समय तक। आपातकालीन सिंचाई ज़रूरी। अगली फसल के लिए सूखा-प्रतिरोधी किस्में चुनें।`,
        });
    }

    // ─── HIGH HEAT ────────────────────────
    if (features.heat_stress_score > 0.4 && !features.heatwave_flag) {
        recs.push({
            icon: '🌡️', severity: 'warning',
            title: 'Heat Stress Warning',
            titleHi: 'गर्मी का तनाव',
            desc: `Average temperature ${features.avg_temp_7d}°C is high. Increase irrigation frequency. Use shade nets for sensitive crops.`,
            descHi: `औसत तापमान ${features.avg_temp_7d}°C अधिक है। सिंचाई बढ़ाएं। संवेदनशील फसलों पर शेड नेट लगाएं।`,
        });
    }

    // ─── FLOOD RISK ───────────────────────
    if (features.flood_flag) {
        recs.push({
            icon: '🌊', severity: 'danger',
            title: 'Flood Risk',
            titleHi: 'बाढ़ का खतरा',
            desc: `Heavy rainfall (${features.total_rain_7d}mm in 7 days). Ensure drainage. Move stored crops to higher ground. Delay harvesting.`,
            descHi: `भारी बारिश (7 दिनों में ${features.total_rain_7d}mm)। जल निकासी सुनिश्चित करें। भंडारित फसल ऊंचाई पर रखें।`,
        });
    }

    // ─── HIGH WIND ────────────────────────
    if (features.high_wind_flag) {
        recs.push({
            icon: '💨', severity: 'warning',
            title: 'Wind Damage Risk',
            titleHi: 'तेज़ हवा का खतरा',
            desc: `Wind gusts up to ${features.max_windgust} km/h. Stake tall crops. Use windbreakers. Delay transport and spraying.`,
            descHi: `हवा ${features.max_windgust} km/h तक। लंबी फसलों को सहारा दें। विंडब्रेकर लगाएं। ढुलाई और छिड़काव रोकें।`,
        });
    }

    // ─── HIGH UV ──────────────────────────
    if (features.high_uv_flag) {
        recs.push({
            icon: '☀️', severity: 'warning',
            title: 'High UV Radiation',
            titleHi: 'तेज़ पराबैंगनी किरणें',
            desc: `UV Index ${features.max_uvindex} — extreme. Crops may sunburn. Use shade nets. Workers should use protection.`,
            descHi: `UV सूचकांक ${features.max_uvindex} — अत्यधिक। फसलें जल सकती हैं। शेड नेट लगाएं। कामगार सुरक्षा उपाय अपनाएं।`,
        });
    }

    // ─── GOOD RAIN ────────────────────────
    if (features.total_rain_7d > 5 && features.total_rain_7d < 30 && !features.flood_flag) {
        recs.push({
            icon: '🌧️', severity: 'info',
            title: 'Good Rainfall',
            titleHi: 'अच्छी बारिश',
            desc: `Moderate rain (${features.total_rain_7d}mm) is good for crops. Reduce manual irrigation. Consider planting now.`,
            descHi: `मध्यम बारिश (${features.total_rain_7d}mm) फसलों के लिए अच्छी। मैन्युअल सिंचाई कम करें। बुवाई का अच्छा समय।`,
        });
    }

    // ─── OPTIMAL CONDITIONS ───────────────
    if (features.overall_stress < 0.2) {
        recs.push({
            icon: '✅', severity: 'info',
            title: 'Optimal Growing Conditions',
            titleHi: 'उत्तम बढ़वार की स्थिति',
            desc: `Weather conditions are excellent. All crops will grow well. Best time to plant and expand operations.`,
            descHi: `मौसम की स्थिति उत्कृष्ट है। सभी फसलें अच्छी बढ़ेंगी। बुवाई और विस्तार का सर्वोत्तम समय।`,
        });
    }

    // ─── CROP-SPECIFIC ────────────────────
    if (predictions && predictions.length > 0) {
        const best = predictions[0];
        const worst = predictions[predictions.length - 1];

        recs.push({
            icon: '🏆', severity: 'info',
            title: `Best Crop: ${best.crop}`,
            titleHi: `सर्वोत्तम फसल: ${best.cropHi}`,
            desc: `${best.crop} has highest expected profit ₹${best.expected_profit.toLocaleString()} with ${best.health_score}% health score.`,
            descHi: `${best.cropHi} का अपेक्षित लाभ ₹${best.expected_profit.toLocaleString()} सबसे अधिक है, स्वास्थ्य ${best.health_score}%।`,
        });

        if (worst.risk_score > 0.5) {
            recs.push({
                icon: '⚠️', severity: 'warning',
                title: `Avoid: ${worst.crop}`,
                titleHi: `बचें: ${worst.cropHi}`,
                desc: `${worst.crop} has ${Math.round(worst.risk_score * 100)}% risk in current weather. Consider alternatives.`,
                descHi: `${worst.cropHi} में ${Math.round(worst.risk_score * 100)}% जोखिम है। विकल्प पर विचार करें।`,
            });
        }
    }

    return recs;
}
