/**
 * grokService.ts — AI Chatbot engine (Google Gemini + on-device fallback)
 *
 * Uses Google Gemini 2.0 Flash (FREE tier, excellent Hindi support).
 * Gathers ALL app data (weather, market, crops, harvest, storage, AI predictions)
 * and sends to Gemini with a farming-expert system prompt.
 *
 * Falls back to a smart on-device knowledge engine when offline.
 */

import { fetchRealWeather } from './weatherService';
import { getRealtimeMandis, generateRealtimeAlerts, setWeatherContext } from './marketService';
import { getSmartCrops } from './cropService';
import { localGetAutoPrices, localGetCrops } from './farmwiseLocalEngine';
import { mockCrops } from '@/mocks/crops';

// ─── Config ────────────────────────────────────────────
// Google Gemini (free tier: 15 RPM / 1,500 RPD / 1M TPM)
// Get your free key at: https://aistudio.google.com/apikey
// Leave empty to use the smart on-device knowledge engine (works offline!)
const GEMINI_API_KEY = '';
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  : '';

// ─── System Prompt (bilingual farming expert) ──────────
function buildSystemPrompt(isHindi: boolean): string {
  const lang = isHindi ? 'Hindi (Devanagari script हिंदी)' : 'English';
  return `You are AgriChain AI — an expert farming assistant for Indian farmers.

CRITICAL LANGUAGE RULE: You MUST respond ONLY in ${lang}. ${isHindi ? 'तुम्हें हमेशा हिंदी (देवनागरी लिपि) में ही जवाब देना है। कभी भी अंग्रेजी में मत बोलो।' : 'Always respond in English only.'}

ROLE: You help farmers with:
- Crop advice: planting seasons, harvest timing, care tips
- Weather impact: how rain, heat, humidity affects crops
- Market prices: best mandi to sell, price trends, MSP rates
- Storage: spoilage prevention, shelf life, preservation methods
- Government schemes: PM-KISAN, KCC, PMFBY, Soil Health Card
- Loan & credit: KCC rates, bank financing
- AI predictions: explain harvest/price/risk predictions

RULES:
1. Keep answers SHORT & PRACTICAL (2-4 sentences, bullet points for complex topics)
2. Use ₹ for prices, quintal for quantities
3. Use the LIVE DATA provided — reference actual numbers from context
4. Be warm and encouraging
5. If you don't know, say so and suggest checking the relevant app tab
6. Sentences should be short and clear (optimized for voice reading)
7. Use Indian season names: Kharif (Jun-Oct), Rabi (Oct-Mar), Zaid (Mar-Jun)
${isHindi ? '\nज़रूरी: सरल हिंदी में बोलो जो किसान आसानी से समझ सके। तकनीकी शब्दों को आसान भाषा में समझाओ।' : ''}`;
}

// ─── Context Gathering ─────────────────────────────────

export interface AppContext {
  weather: string;
  market: string;
  crops: string;
  aiPredictions: string;
  location: string;
}

/**
 * Gather ALL live app data into a structured context string.
 */
export async function gatherAppContext(
  lat: number,
  lon: number,
  locationName: string,
): Promise<AppContext> {
  const results: AppContext = {
    weather: '',
    market: '',
    crops: '',
    aiPredictions: '',
    location: `📍 Location: ${locationName} (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
  };

  // 1. Weather
  try {
    const w = await fetchRealWeather(lat, lon, locationName);
    results.weather = `🌤 LIVE WEATHER for ${w.region}:
- Temperature: ${w.temperature}°C
- Humidity: ${w.humidity}%
- Rainfall: ${w.rainfall}mm
- Wind: ${w.windSpeed} km/h
- Condition: ${w.condition}
- Soil Moisture: ${w.soilMoisture}%
- 7-Day Forecast: ${w.forecast.map(d => `${d.day}: ${d.condition} ${d.tempHigh}/${d.tempLow}°C Rain:${d.rainChance}%`).join(' | ')}`;

    // 2. Market (needs weather)
    try {
      setWeatherContext(w);
      const mandis = await getRealtimeMandis(w);
      const topMandis = mandis.slice(0, 4);
      results.market = `🏪 LIVE MANDI PRICES (top 4 markets):\n${topMandis.map(m => {
        const topCrops = m.prices.slice(0, 3).map(p =>
          `${p.cropId}: ₹${p.pricePerQuintal}/q (${p.trend})`
        ).join(', ');
        return `- ${m.name}: ${topCrops} | Distance: ${m.distance}km | Transport: ₹${m.transportCost}`;
      }).join('\n')}`;

      // Alerts
      const alerts = await generateRealtimeAlerts(w, mandis);
      if (alerts.length > 0) {
        results.market += `\n⚠️ ALERTS: ${alerts.slice(0, 3).map(a => `${a.titleEn}: ${a.descEn}`).join(' | ')}`;
      }
    } catch {
      results.market = '🏪 Market data temporarily unavailable';
    }

    // 3. Crops with weather enrichment
    try {
      const smartCrops = getSmartCrops(mockCrops, w);
      results.crops = `🌱 FARMER'S CROPS:\n${smartCrops.map(c => {
        const progress = Math.round((c.currentDay / c.daysToHarvest) * 100);
        return `- ${c.name} (${c.nameHi}): ${progress}% mature, ${c.daysToHarvest - c.currentDay} days left, Status: ${c.status}, ` +
          `Harvest: ${c.harvestRecommendation.action} (${c.harvestRecommendation.confidence}% confidence), ` +
          `Spoilage Risk: ${c.spoilageInfo.riskLevel}, Shelf Life: ${c.spoilageInfo.shelfLifeDays} days`;
      }).join('\n')}`;
    } catch {
      results.crops = '🌱 Crop data loading...';
    }
  } catch {
    results.weather = '🌤 Weather data temporarily unavailable';
  }

  // 4. AI predictions summary
  try {
    const aiCrops = localGetCrops();
    const cropNames = Object.keys(aiCrops);
    const predictions: string[] = [];
    for (const crop of cropNames.slice(0, 3)) {
      try {
        const prices = localGetAutoPrices(crop);
        predictions.push(`${crop}: Current ₹${prices.current_price}/q, Predicted 7d ₹${prices.predicted_7d}/q`);
      } catch { /* skip */ }
    }
    if (predictions.length > 0) {
      results.aiPredictions = `🧠 AI PRICE PREDICTIONS:\n${predictions.map(p => `- ${p}`).join('\n')}`;
    }
  } catch {
    results.aiPredictions = '';
  }

  return results;
}

/**
 * Format context into a single string for the AI message.
 */
function formatContext(ctx: AppContext): string {
  return [ctx.location, ctx.weather, ctx.crops, ctx.market, ctx.aiPredictions]
    .filter(Boolean)
    .join('\n\n');
}

// ─── On-device Fallback Knowledge Base ─────────────────

interface KnowledgeEntry {
  keywords: string[];
  en: string;
  hi: string;
}

const KNOWLEDGE: KnowledgeEntry[] = [
  { keywords: ['hello', 'hi', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार'],
    en: '🙏 Namaste! I\'m your AgriChain farming assistant. Ask me about crops, weather, market prices, government schemes, or anything farming-related!',
    hi: '🙏 नमस्ते! मैं आपका एग्रीचेन कृषि सहायक हूं। मुझसे फसलों, मौसम, मंडी भाव, सरकारी योजनाओं, या खेती से जुड़ी कोई भी बात पूछें!' },
  { keywords: ['help', 'madad', 'मदद', 'kya kar', 'क्या कर'],
    en: '🤖 I can help with:\n• 🌱 Crop info (planting, harvest, care)\n• 🌤️ Weather impact\n• 🏪 Market prices & best mandi\n• 📦 Storage & spoilage\n• 💰 Schemes (PM-KISAN, KCC, PMFBY)\n• 🏦 Loans\n\nJust ask!',
    hi: '🤖 मैं इनमें मदद कर सकता हूं:\n• 🌱 फसल जानकारी\n• 🌤️ मौसम प्रभाव\n• 🏪 मंडी भाव\n• 📦 भंडारण\n• 💰 योजनाएं (PM-KISAN, KCC)\n• 🏦 ऋण\n\nबस पूछें!' },
  { keywords: ['weather', 'mausam', 'मौसम', 'barish', 'rain', 'बारिश', 'temp', 'garmi', 'गर्मी'],
    en: '', hi: '' }, // Dynamic — filled from context
  { keywords: ['market', 'mandi', 'मंडी', 'price', 'bhav', 'भाव', 'sell', 'bech', 'बेच'],
    en: '', hi: '' }, // Dynamic
  { keywords: ['tomato', 'tamatar', 'टमाटर'],
    en: '🍅 Tomato: Rabi crop (Oct-Feb). 60-90 days to harvest. ₹1500-3500/quintal. Store cool & dry. Shelf life: 7-14 days.',
    hi: '🍅 टमाटर: रबी फसल (अक्टूबर-फरवरी)। 60-90 दिन में तैयार। ₹1500-3500/क्विंटल। ठंडी-सूखी जगह रखें। शेल्फ लाइफ: 7-14 दिन।' },
  { keywords: ['wheat', 'gehun', 'गेहूं'],
    en: '🌾 Wheat: Rabi, sow Nov-Dec, harvest Mar-Apr. 120-150 days. MSP ₹2,275/q. Store in hermetic bags. Shelf life: 6-12 months.',
    hi: '🌾 गेहूं: रबी, नवंबर-दिसंबर बोएं, मार्च-अप्रैल काटें। 120-150 दिन। MSP ₹2,275/क्विं। हरमेटिक बैग में रखें। शेल्फ लाइफ: 6-12 महीने।' },
  { keywords: ['rice', 'chawal', 'dhan', 'चावल', 'धान'],
    en: '🌾 Rice: Kharif, plant Jun-Jul, harvest Oct-Nov. 90-120 days. MSP ₹2,300/q. Dry to 14% moisture before storage.',
    hi: '🌾 धान: खरीफ, जून-जुलाई बोएं, अक्टूबर-नवंबर काटें। 90-120 दिन। MSP ₹2,300/क्विं। भंडारण पहले 14% नमी तक सुखाएं।' },
  { keywords: ['onion', 'pyaz', 'प्याज'],
    en: '🧅 Onion: Plant Nov-Dec, harvest Apr-May. 130-150 days. ₹800-5000/q. Store in ventilated place.',
    hi: '🧅 प्याज: नवंबर-दिसंबर बोएं, अप्रैल-मई काटें। 130-150 दिन। ₹800-5000/क्विं। हवादार जगह रखें।' },
  { keywords: ['cotton', 'kapas', 'कपास'],
    en: '🏵 Cotton: Kharif, sow Jun-Jul, pick Oct-Jan. 150-180 days. MSP ₹7,121/q. Use IPM for bollworm.',
    hi: '🏵 कपास: खरीफ, जून-जुलाई बोएं, अक्टूबर-जनवरी चुनें। 150-180 दिन। MSP ₹7,121/क्विं। बॉलवर्म से IPM से बचाव।' },
  { keywords: ['soybean', 'soya', 'सोयाबीन'],
    en: '🫘 Soybean: Kharif, Jun-Jul to Oct-Nov. 90-100 days. MSP ₹4,892/q. Good nitrogen fixer.',
    hi: '🫘 सोयाबीन: खरीफ, जून-जुलाई से अक्टूबर-नवंबर। 90-100 दिन। MSP ₹4,892/क्विं। अच्छा नाइट्रोजन फिक्सर।' },
  { keywords: ['msp', 'minimum support', 'न्यूनतम समर्थन'],
    en: '📊 MSP 2024-25:\n• Wheat: ₹2,275/q\n• Rice: ₹2,300/q\n• Soybean: ₹4,892/q\n• Cotton: ₹7,121/q\n• Mustard: ₹5,650/q',
    hi: '📊 MSP 2024-25:\n• गेहूं: ₹2,275/क्विं\n• धान: ₹2,300/क्विं\n• सोयाबीन: ₹4,892/क्विं\n• कपास: ₹7,121/क्विं\n• सरसों: ₹5,650/क्विं' },
  { keywords: ['pm kisan', 'pmkisan', 'पीएम किसान', 'pm-kisan'],
    en: '💰 PM-KISAN: ₹6,000/year in 3 installments of ₹2,000. For all land-holding farmers. Register at pmkisan.gov.in. Need: Aadhaar + bank a/c + land records.',
    hi: '💰 पीएम-किसान: ₹6,000/साल, 3 किस्तों में ₹2,000। सभी भूमिधारक किसानों के लिए। pmkisan.gov.in पर रजिस्टर करें। जरूरी: आधार + बैंक खाता + भूमि रिकॉर्ड।' },
  { keywords: ['kcc', 'kisan credit', 'किसान क्रेडिट', 'loan', 'rin', 'ऋण'],
    en: '🏦 KCC: Crop loans at 4% interest. ₹3 lakh interest-free with timely repayment. Apply at any bank with land records + Aadhaar.',
    hi: '🏦 KCC: 4% ब्याज पर फसल ऋण। समय पर भुगतान से ₹3 लाख ब्याज-मुक्त। किसी भी बैंक में आवेदन — भूमि रिकॉर्ड + आधार लाएं।' },
  { keywords: ['insurance', 'bima', 'फसल बीमा', 'pmfby'],
    en: '🛡️ PMFBY: Crop insurance — 2% premium for Kharif, 1.5% for Rabi. Covers calamities, pests, diseases. Apply via bank/CSC.',
    hi: '🛡️ PMFBY: फसल बीमा — खरीफ 2%, रबी 1.5% प्रीमियम। आपदा, कीट, रोग से सुरक्षा। बैंक/CSC से आवेदन।' },
  { keywords: ['storage', 'store', 'भंडारण', 'godown', 'गोदाम', 'spoil', 'kharab', 'खराब'],
    en: '📦 Storage tips:\n• Grains: <14% moisture, hermetic bags\n• Vegetables: cold storage\n• Solar drying: free, +15 days shelf life\n• Check daily in monsoon',
    hi: '📦 भंडारण सुझाव:\n• अनाज: 14% से कम नमी, हरमेटिक बैग\n• सब्जियां: कोल्ड स्टोरेज\n• सोलर ड्राईंग: मुफ्त, +15 दिन शेल्फ लाइफ\n• बारिश में रोज जांचें' },
  { keywords: ['harvest', 'katai', 'कटाई', 'kab kate'],
    en: '🌾 Check the Harvest tab for AI timing! Tips: harvest in dry weather, morning is best, don\'t wait too long.',
    hi: '🌾 AI समय के लिए कटाई टैब देखें! सुझाव: सूखे मौसम में काटें, सुबह सबसे अच्छा, ज्यादा इंतजार न करें।' },
  { keywords: ['water', 'pani', 'पानी', 'irrigation', 'sinchai', 'सिंचाई'],
    en: '💧 Drip saves 30-50% water. Morning watering best. Mulching reduces needs 25%.',
    hi: '💧 ड्रिप से 30-50% पानी बचता है। सुबह पानी दें। मल्चिंग से 25% कम पानी लगता है।' },
  { keywords: ['fertilizer', 'khad', 'खाद', 'urea', 'यूरिया', 'dap'],
    en: '🧪 Get Soil Health Card first. DAP at sowing, split urea doses. Neem-coated urea saves 10% nitrogen.',
    hi: '🧪 पहले मृदा स्वास्थ्य कार्ड बनवाएं। बुवाई पर DAP, यूरिया बांटकर डालें। नीम कोटेड यूरिया 10% नाइट्रोजन बचाता है।' },
  { keywords: ['pest', 'keeda', 'कीड़ा', 'disease', 'rog', 'रोग', 'bimari'],
    en: '🐛 Use IPM. Neem oil spray is effective. Crop rotation prevents soil diseases. Report to local KVK for free advice.',
    hi: '🐛 IPM अपनाएं। नीम तेल स्प्रे प्रभावी है। फसल चक्र से मिट्टी के रोग रुकते हैं। स्थानीय KVK से मुफ्त सलाह।' },
  { keywords: ['thanks', 'thank', 'dhanyavaad', 'धन्यवाद', 'shukriya', 'शुक्रिया'],
    en: '🙏 You\'re welcome! Happy farming!',
    hi: '🙏 आपका स्वागत है! खुशहाल खेती!' },
  { keywords: ['soil', 'mitti', 'मिट्टी', 'soil health', 'मृदा'],
    en: '🌱 Soil Health Card: Free testing — NPK, pH, organic carbon. Get from local agriculture office or soilhealth.dac.gov.in.',
    hi: '🌱 मृदा स्वास्थ्य कार्ड: मुफ्त परीक्षण — NPK, pH, जैविक कार्बन। स्थानीय कृषि कार्यालय या soilhealth.dac.gov.in से पाएं।' },
  { keywords: ['potato', 'aloo', 'आलू'],
    en: '🥔 Potato: Rabi, Oct-Nov to Feb-Mar. 75-120 days. ₹1000-2000/q. Cold storage for long-term.',
    hi: '🥔 आलू: रबी, अक्टूबर-नवंबर से फरवरी-मार्च। 75-120 दिन। ₹1000-2000/क्विं। लंबे भंडारण के लिए कोल्ड स्टोरेज।' },
  { keywords: ['kharif', 'खरीफ'],
    en: '🌧️ Kharif (Jun-Oct): Rice, Soybean, Cotton, Maize, Jowar. Plant with monsoon. Higher disease risk.',
    hi: '🌧️ खरीफ (जून-अक्टूबर): धान, सोयाबीन, कपास, मक्का, ज्वार। मानसून से बोएं। बीमारी का ज्यादा खतरा।' },
  { keywords: ['rabi', 'रबी'],
    en: '❄️ Rabi (Oct-Mar): Wheat, Onion, Potato, Tomato, Mustard. Needs irrigation.',
    hi: '❄️ रबी (अक्टूबर-मार्च): गेहूं, प्याज, आलू, टमाटर, सरसों। सिंचाई जरूरी।' },
];

/**
 * On-device fallback: Generate dynamic responses using live app data.
 * This is a smart pattern-matching + data-aware engine.
 */
function getLocalResponse(query: string, ctx: AppContext, isHindi: boolean): string {
  const q = query.toLowerCase().trim();
  // Remove Hindi vowel marks for simpler matching
  const qNorm = q.replace(/[ा-ौ]/g, '');

  // ── Dynamic weather response ──
  if (matchAny(q, ['weather', 'mausam', 'मौसम', 'barish', 'rain', 'बारिश', 'temp', 'garmi', 'गर्मी', 'thand', 'ठंड', 'hawa', 'हवा', 'wind', 'humidity', 'nami', 'नमी', 'aaj kaisa', 'आज कैसा', 'kaisa hai', 'कैसा है'])) {
    if (ctx.weather) {
      // Parse live weather for a natural response
      const tempMatch = ctx.weather.match(/Temperature:\s*([\d.]+)/);
      const humMatch = ctx.weather.match(/Humidity:\s*([\d.]+)/);
      const rainMatch = ctx.weather.match(/Rainfall:\s*([\d.]+)/);
      const condMatch = ctx.weather.match(/Condition:\s*(\w+)/);
      const temp = tempMatch ? tempMatch[1] : '?';
      const hum = humMatch ? humMatch[1] : '?';
      const rain = rainMatch ? rainMatch[1] : '0';
      const cond = condMatch ? condMatch[1] : '';

      if (isHindi) {
        let advice = '';
        if (Number(rain) > 10) advice = '\n💧 भारी बारिश हो रही है — फसल में पानी जमा न होने दें। कटाई टाल दें।';
        else if (Number(temp) > 38) advice = '\n🔥 तापमान बहुत ज्यादा है। शाम को सिंचाई करें, दोपहर में छिड़काव न करें।';
        else if (Number(hum) > 80) advice = '\n💧 नमी ज्यादा है — फफूंद रोग का खतरा। फसल पर नज़र रखें।';
        else advice = '\n✅ मौसम खेती के लिए अच्छा है!';
        return `🌤️ आज का मौसम:\n• तापमान: ${temp}°C\n• नमी: ${hum}%\n• बारिश: ${rain}mm\n• हालत: ${cond}${advice}`;
      } else {
        let advice = '';
        if (Number(rain) > 10) advice = '\n💧 Heavy rain expected — avoid harvesting, ensure proper drainage.';
        else if (Number(temp) > 38) advice = '\n🔥 Very hot. Irrigate in evening, avoid spraying at noon.';
        else if (Number(hum) > 80) advice = '\n💧 High humidity — watch for fungal disease risk.';
        else advice = '\n✅ Weather looks good for farming!';
        return `🌤️ Today's weather:\n• Temperature: ${temp}°C\n• Humidity: ${hum}%\n• Rainfall: ${rain}mm\n• Condition: ${cond}${advice}`;
      }
    }
  }

  // ── Dynamic market response ──
  if (matchAny(q, ['market', 'mandi', 'मंडी', 'price', 'bhav', 'भाव', 'sell', 'bech', 'बेच', 'kahan beche', 'कहां बेचें', 'rate', 'daam', 'दाम', 'kitne', 'कितने'])) {
    if (ctx.market) {
      if (isHindi) {
        return `🏪 आज की मंडी जानकारी:\n${ctx.market}\n\n💡 सुझाव: सबसे नज़दीकी मंडी में कम ट्रांसपोर्ट खर्च होगा। मार्केट टैब में पूरी जानकारी देखें।`;
      } else {
        return `🏪 Today's market info:\n${ctx.market}\n\n💡 Tip: Nearest mandi saves transport cost. Check Market tab for full details.`;
      }
    }
  }

  // ── Dynamic crop status response ──
  if (matchAny(q, ['crop', 'fasal', 'फसल', 'status', 'halat', 'हालत', 'meri fasal', 'मेरी फसल', 'kaise hai', 'कैसे हैं', 'kitna hua', 'कितना हुआ'])) {
    if (ctx.crops) {
      return isHindi
        ? `🌱 आपकी फसलों की स्थिति:\n${ctx.crops}\n\n📊 विस्तृत जानकारी के लिए हार्वेस्ट टैब देखें।`
        : `🌱 Your crop status:\n${ctx.crops}\n\n📊 Check Harvest tab for detailed info.`;
    }
  }

  // ── AI prediction response ──
  if (matchAny(q, ['predict', 'forecast', 'bhavishya', 'भविष्य', 'aage', 'आगे', 'kya hoga', 'क्या होगा', 'trend', 'anuman', 'अनुमान'])) {
    if (ctx.aiPredictions) {
      return isHindi
        ? `🧠 AI भविष्यवाणी:\n${ctx.aiPredictions}\n\n📈 ये अनुमान AI मॉडल पर आधारित हैं। मार्केट और हार्वेस्ट टैब में और जानें।`
        : `🧠 AI Predictions:\n${ctx.aiPredictions}\n\n📈 Based on AI models. See Market and Harvest tabs for more.`;
    }
  }

  // ── When to sell (most common farmer question) ──
  if (matchAny(q, ['kab beche', 'कब बेचें', 'when to sell', 'best time', 'sahi samay', 'सही समय'])) {
    const hasPredictions = ctx.aiPredictions && ctx.aiPredictions.length > 20;
    if (isHindi) {
      return `📊 बेचने का सबसे अच्छा समय:\n${hasPredictions ? ctx.aiPredictions + '\n\n' : ''}💡 सुझाव:\n• अगर भाव बढ़ रहे हैं → 2-3 दिन और रुकें\n• अगर भाव गिर रहे हैं → जल्दी बेचें\n• MSP से ऊपर मिल रहा है → अच्छा समय है\n• बारिश आ रही है → पहले बेच दें (सब्जियां खराब होती हैं)`;
    }
    return `📊 Best time to sell:\n${hasPredictions ? ctx.aiPredictions + '\n\n' : ''}💡 Tips:\n• Prices rising → wait 2-3 more days\n• Prices falling → sell soon\n• Above MSP → good time\n• Rain coming → sell perishables first`;
  }

  // ── Static knowledge base lookup ──
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length; // Longer keyword match = better
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    const resp = isHindi ? bestMatch.hi : bestMatch.en;
    if (resp) return resp;
  }

  // ── General farming Q&A fallback ──
  if (matchAny(q, ['how', 'kaise', 'कैसे', 'what', 'kya', 'क्या', 'when', 'kab', 'कब', 'why', 'kyu', 'क्यों'])) {
    return isHindi
      ? '🌾 यह एक अच्छा सवाल है! मैं इन विषयों पर मदद कर सकता हूं:\n• 🌱 फसल (टमाटर, गेहूं, धान, प्याज, सोयाबीन, कपास)\n• 🌤️ मौसम और सिंचाई\n• 🏪 मंडी भाव\n• 📦 भंडारण\n• 💰 PM-KISAN, KCC, PMFBY योजनाएं\n\nकृपया इनमें से कुछ पूछें!'
      : '🌾 Great question! I can help with:\n• 🌱 Crops (tomato, wheat, rice, onion, soybean, cotton)\n• 🌤️ Weather & irrigation\n• 🏪 Market prices\n• 📦 Storage\n• 💰 PM-KISAN, KCC, PMFBY schemes\n\nPlease ask about any of these!';
  }

  return isHindi
    ? '🤔 कृपया खेती से जुड़ा सवाल पूछें — मौसम, फसल, मंडी भाव, सरकारी योजनाएं। मैं आपकी मदद करने के लिए तैयार हूं! 🙏'
    : '🤔 Please ask a farming question — weather, crops, market prices, government schemes. I\'m here to help! 🙏';
}

/** Helper: check if query matches any keyword */
function matchAny(query: string, keywords: string[]): boolean {
  return keywords.some(k => query.includes(k.toLowerCase()));
}

// ─── Chat with AI ──────────────────────────────────────

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Send a message to Gemini with full farming context.
 * Falls back to on-device knowledge when API fails or key not set.
 */
export async function chatWithGrok(
  userMessage: string,
  conversationHistory: GrokMessage[],
  appContext: AppContext,
  isHindi: boolean,
): Promise<string> {
  // Try Gemini API only if key is configured
  if (GEMINI_API_KEY && GEMINI_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await callGemini(userMessage, conversationHistory, appContext, isHindi, controller.signal);
      clearTimeout(timeout);
      if (response) return response;
    } catch (error) {
      console.warn('Gemini API failed, using local engine:', error);
    }
  }

  // Primary: on-device smart knowledge engine (always works!)
  return getLocalResponse(userMessage, appContext, isHindi);
}

/**
 * Call Google Gemini 2.0 Flash API.
 */
async function callGemini(
  userMessage: string,
  history: GrokMessage[],
  ctx: AppContext,
  isHindi: boolean,
  signal?: AbortSignal,
): Promise<string | null> {
  const systemPrompt = buildSystemPrompt(isHindi);
  const contextStr = formatContext(ctx);

  // Build Gemini conversation format
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // System instruction + context as first user turn
  contents.push({
    role: 'user',
    parts: [{ text: `${systemPrompt}\n\n---\n\n[LIVE APP DATA]\n${contextStr}\n\n---\n\nUse this live data to answer my farming questions. Remember: respond ONLY in ${isHindi ? 'Hindi (हिंदी)' : 'English'}.` }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: isHindi ? 'जी, मैं समझ गया। मैं लाइव डेटा का उपयोग करके हिंदी में जवाब दूंगा। पूछिए!' : 'Understood. I\'ll use the live data to answer your questions. Go ahead!' }],
  });

  // Add conversation history (last 8 messages)
  const recentHistory = history.slice(-8);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  // Current question
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Gemini API error:', res.status, errText);
    return null;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || null;
}
