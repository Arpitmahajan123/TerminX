/**
 * Smart crop service — enriches static crop data with real-time weather
 * Updates harvest recommendations and spoilage risk based on live conditions
 */

import { Crop, HarvestRecommendation, SpoilageInfo, HarvestFactor } from '@/mocks/crops';
import { RealWeatherData } from '@/services/weatherService';

/**
 * Enriches crop data with real-time weather-aware recommendations
 */
export function getSmartCrops(crops: Crop[], weather: RealWeatherData): Crop[] {
  return crops.map((crop) => ({
    ...crop,
    harvestRecommendation: getSmartHarvestRec(crop, weather),
    spoilageInfo: getSmartSpoilage(crop, weather),
  }));
}

function getSmartHarvestRec(crop: Crop, weather: RealWeatherData): HarvestRecommendation {
  const base = crop.harvestRecommendation;
  const progress = crop.currentDay / crop.daysToHarvest;
  const daysLeft = crop.daysToHarvest - crop.currentDay;

  // Check upcoming rain
  const rainyDays = weather.forecast.filter(
    (d) => d.condition === 'rainy' || d.condition === 'stormy'
  );
  const hasStorm = weather.forecast.some((d) => d.condition === 'stormy');
  const rainIn2Days = weather.forecast.slice(0, 2).some(
    (d) => d.condition === 'rainy' || d.condition === 'stormy'
  );

  // Build dynamic factors
  const factors: HarvestFactor[] = [
    {
      name: 'Weather Forecast',
      nameHi: 'मौसम पूर्वानुमान',
      impact: rainyDays.length >= 2 ? 'negative' : rainyDays.length === 0 ? 'positive' : 'neutral',
      weight: 0.40,
      descEn: rainyDays.length >= 2
        ? `Rain on ${rainyDays.map((d) => d.day).join(', ')} — harvest before rain`
        : rainyDays.length === 0
          ? 'Clear weather ahead — good growing conditions'
          : `Light rain on ${rainyDays[0].day} — monitor closely`,
      descHi: rainyDays.length >= 2
        ? `${rainyDays.map((d) => d.day).join(', ')} को बारिश — बारिश से पहले काटें`
        : rainyDays.length === 0
          ? 'आगे साफ मौसम — अच्छी बढ़वार की स्थिति'
          : `${rainyDays[0].day} को हल्की बारिश — निगरानी रखें`,
    },
    {
      name: 'Crop Maturity',
      nameHi: 'फसल परिपक्वता',
      impact: progress >= 0.9 ? 'positive' : progress >= 0.7 ? 'neutral' : 'negative',
      weight: 0.30,
      descEn: `Maturity at ${Math.round(progress * 100)}% — ${progress >= 0.9 ? 'ready for harvest' : progress >= 0.7 ? 'almost ready' : 'needs more time'}`,
      descHi: `परिपक्वता ${Math.round(progress * 100)}% — ${progress >= 0.9 ? 'कटाई के लिए तैयार' : progress >= 0.7 ? 'लगभग तैयार' : 'और समय चाहिए'}`,
    },
    {
      name: 'Soil Moisture',
      nameHi: 'मिट्टी की नमी',
      impact: weather.soilMoisture > 70 ? 'negative' : weather.soilMoisture > 50 ? 'neutral' : 'positive',
      weight: 0.15,
      descEn: `Soil moisture at ${weather.soilMoisture}% — ${weather.soilMoisture > 70 ? 'too wet' : 'adequate'}`,
      descHi: `मिट्टी की नमी ${weather.soilMoisture}% — ${weather.soilMoisture > 70 ? 'बहुत गीली' : 'पर्याप्त'}`,
    },
    {
      name: 'Temperature',
      nameHi: 'तापमान',
      impact: weather.temperature > 40 ? 'negative' : weather.temperature > 20 ? 'positive' : 'neutral',
      weight: 0.15,
      descEn: `Current ${weather.temperature}°C — ${weather.temperature > 40 ? 'heat stress risk' : 'suitable for crops'}`,
      descHi: `वर्तमान ${weather.temperature}°C — ${weather.temperature > 40 ? 'गर्मी का तनाव' : 'फसलों के लिए उपयुक्त'}`,
    },
  ];

  // Determine action
  let action: 'harvest_now' | 'wait' | 'harvest_early' = base.action;
  let waitDays = daysLeft;
  let confidence = 85;

  if (progress >= 0.9 && (hasStorm || rainIn2Days)) {
    action = 'harvest_now';
    waitDays = 0;
    confidence = 94;
  } else if (progress >= 0.85 && rainyDays.length >= 3) {
    action = 'harvest_early';
    waitDays = 0;
    confidence = 88;
  } else if (progress >= 0.95) {
    action = 'harvest_now';
    waitDays = 0;
    confidence = 91;
  } else if (daysLeft <= 5 && rainyDays.length === 0) {
    action = 'wait';
    waitDays = daysLeft;
    confidence = 89;
  } else if (daysLeft > 5) {
    action = 'wait';
    waitDays = daysLeft;
    confidence = 82;
  }

  const reasonEn = action === 'harvest_now'
    ? `Harvest ${crop.name} now! ${rainyDays.length > 0 ? `Rain expected on ${rainyDays.map((d) => d.day).join(', ')}.` : ''} Maturity at ${Math.round(progress * 100)}%. Current temp ${weather.temperature}°C.`
    : action === 'harvest_early'
      ? `Consider early harvest of ${crop.name}. ${rainyDays.length} rainy days ahead. Maturity at ${Math.round(progress * 100)}%.`
      : `Wait ${waitDays} more days for ${crop.name}. ${rainyDays.length === 0 ? 'Clear weather ahead.' : `Watch for rain on ${rainyDays.map((d) => d.day).join(', ')}.`} Maturity at ${Math.round(progress * 100)}%.`;

  const reasonHi = action === 'harvest_now'
    ? `${crop.nameHi} अभी काटें! ${rainyDays.length > 0 ? `${rainyDays.map((d) => d.day).join(', ')} को बारिश की संभावना।` : ''} परिपक्वता ${Math.round(progress * 100)}%। वर्तमान तापमान ${weather.temperature}°C।`
    : action === 'harvest_early'
      ? `${crop.nameHi} की जल्दी कटाई पर विचार करें। आगे ${rainyDays.length} बारिश के दिन। परिपक्वता ${Math.round(progress * 100)}%।`
      : `${crop.nameHi} के लिए ${waitDays} और दिन रुकें। ${rainyDays.length === 0 ? 'आगे साफ मौसम।' : `${rainyDays.map((d) => d.day).join(', ')} को बारिश पर नज़र रखें।`} परिपक्वता ${Math.round(progress * 100)}%।`;

  return { action, waitDays, confidence, reasonEn, reasonHi, factors };
}

function getSmartSpoilage(crop: Crop, weather: RealWeatherData): SpoilageInfo {
  const base = crop.spoilageInfo;

  // Adjust shelf life based on real weather
  let shelfDays = base.shelfLifeDays;
  let riskLevel = base.riskLevel;

  // High temperature reduces shelf life
  if (weather.temperature > 38) {
    shelfDays = Math.max(1, shelfDays - 3);
  } else if (weather.temperature > 35) {
    shelfDays = Math.max(1, shelfDays - 1);
  }

  // High humidity reduces shelf life
  if (weather.humidity > 80) {
    shelfDays = Math.max(1, shelfDays - 2);
  } else if (weather.humidity > 70) {
    shelfDays = Math.max(1, shelfDays - 1);
  }

  // Recalculate risk
  if (shelfDays <= 3) riskLevel = 'high';
  else if (shelfDays <= 10) riskLevel = 'medium';
  else riskLevel = 'low';

  const reasonEn = `Current conditions: ${weather.temperature}°C, ${weather.humidity}% humidity. ${riskLevel === 'high'
    ? `Rapid spoilage risk! Only ${shelfDays} days shelf life.`
    : riskLevel === 'medium'
      ? `Moderate spoilage risk. ${shelfDays} days shelf life with proper storage.`
      : `Low risk. ${shelfDays} days shelf life in good conditions.`}`;

  const reasonHi = `वर्तमान स्थिति: ${weather.temperature}°C, ${weather.humidity}% नमी। ${riskLevel === 'high'
    ? `तेज़ खराबी का खतरा! केवल ${shelfDays} दिन शेल्फ लाइफ।`
    : riskLevel === 'medium'
      ? `मध्यम खराबी का खतरा। सही भंडारण से ${shelfDays} दिन शेल्फ लाइफ।`
      : `कम खतरा। अच्छी स्थिति में ${shelfDays} दिन शेल्फ लाइफ।`}`;

  return {
    ...base,
    shelfLifeDays: shelfDays,
    riskLevel,
    reasonEn,
    reasonHi,
  };
}
