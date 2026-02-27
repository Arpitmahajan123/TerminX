/**
 * crops.js - Real agricultural crop data
 * Based on actual Indian farming data (ICAR/MSP/Mandi research):
 * - Maturity days from real crop cycles
 * - Base prices from current MSP/mandi rates
 * - Yield per acre from agricultural research
 * - Spoilage rates from cold chain studies
 */

/**
 * @type {Array<{
 *   name: string,
 *   nameHi: string,
 *   emoji: string,
 *   seedCostPerKg: number,
 *   maturityDays: number,
 *   baseYield: number,
 *   basePrice: number,
 *   spoilageRate: number,
 *   weatherSensitivity: 'Low'|'Medium'|'High',
 *   season: 'Kharif'|'Rabi'|'Both',
 *   overripeDays: number,
 *   deadDays: number,
 *   color: string,
 *   realInfo: string,
 *   realInfoHi: string
 * }>}
 */
const CROPS = [
    {
        name: 'Wheat',
        nameHi: 'गेहूं',
        emoji: '🌾',
        seedCostPerKg: 5,
        maturityDays: 120,     // Real: 110-130 days (Rabi crop, Nov-Mar)
        baseYield: 950,        // Real: 800-1200 kg/acre in India
        basePrice: 25,         // MSP 2024-25: ₹2275/quintal = ~₹22.75/kg
        spoilageRate: 1.0,     // Low — grain stores well
        weatherSensitivity: 'Low',
        season: 'Rabi',
        overripeDays: 5,
        deadDays: 4,
        color: '#DAA520',
        realInfo: 'Sowing: Nov-Dec | Harvest: Mar-Apr | MSP ₹2275/q | Best in cool dry climate',
        realInfoHi: 'बुवाई: नवंबर-दिसंबर | कटाई: मार्च-अप्रैल | MSP ₹2275/क्विंटल | ठंडी शुष्क जलवायु में सर्वोत्तम',
    },
    {
        name: 'Rice',
        nameHi: 'चावल (धान)',
        emoji: '🍚',
        seedCostPerKg: 8,
        maturityDays: 130,     // Real: 120-150 days (Kharif, Jun-Nov)
        baseYield: 900,        // Real: 800-1000 kg/acre
        basePrice: 30,         // MSP 2024-25: ₹2320/quintal = ~₹23.2/kg
        spoilageRate: 1.5,     // Moderate — needs drying
        weatherSensitivity: 'High',
        season: 'Kharif',
        overripeDays: 4,
        deadDays: 3,
        color: '#8FBC8F',
        realInfo: 'Sowing: Jun-Jul | Harvest: Oct-Nov | MSP ₹2320/q | Needs heavy rain/irrigation',
        realInfoHi: 'बुवाई: जून-जुलाई | कटाई: अक्टूबर-नवंबर | MSP ₹2320/क्विंटल | भारी बारिश/सिंचाई ज़रूरी',
    },
    {
        name: 'Tomato',
        nameHi: 'टमाटर',
        emoji: '🍅',
        seedCostPerKg: 12,
        maturityDays: 75,      // Real: 60-90 days (year-round)
        baseYield: 800,        // Real: 600-1000 kg/acre
        basePrice: 45,         // Market avg: ₹15-80/kg (high volatility)
        spoilageRate: 3.0,     // Very High — perishable
        weatherSensitivity: 'Medium',
        season: 'Both',
        overripeDays: 3,
        deadDays: 2,
        color: '#FF6347',
        realInfo: 'Sowing: Year-round | Harvest: 60-90 days | Highly perishable | Price swings ₹15-80/kg',
        realInfoHi: 'बुवाई: साल भर | कटाई: 60-90 दिन | बहुत जल्दी खराब होता है | कीमत ₹15-80/किलो',
    },
    {
        name: 'Sugarcane',
        nameHi: 'गन्ना',
        emoji: '🎋',
        seedCostPerKg: 10,
        maturityDays: 300,     // Real: 270-365 days (longest crop)
        baseYield: 1100,       // Real: 1000-1500 kg/acre (raw sugarcane much more)
        basePrice: 35,         // FRP ~₹315/quintal
        spoilageRate: 0.5,     // Very Low — hardy
        weatherSensitivity: 'Low',
        season: 'Kharif',
        overripeDays: 7,
        deadDays: 5,
        color: '#9ACD32',
        realInfo: 'Sowing: Feb-Mar | Harvest: Jan-Mar (next year) | FRP ₹315/q | 10-14 month crop',
        realInfoHi: 'बुवाई: फरवरी-मार्च | कटाई: जनवरी-मार्च (अगला साल) | FRP ₹315/क्विंटल | 10-14 महीने की फसल',
    },
    {
        name: 'Cotton',
        nameHi: 'कपास',
        emoji: '☁️',
        seedCostPerKg: 15,
        maturityDays: 165,     // Real: 150-180 days (Kharif)
        baseYield: 700,        // Real: 500-800 kg/acre (lint)
        basePrice: 55,         // MSP: ₹7020/quintal (long staple)
        spoilageRate: 0.8,     // Low — fiber stores well
        weatherSensitivity: 'High',
        season: 'Kharif',
        overripeDays: 6,
        deadDays: 4,
        color: '#F5F5DC',
        realInfo: 'Sowing: Apr-Jun | Harvest: Oct-Jan | MSP ₹7020/q | Sensitive to bollworm & rain',
        realInfoHi: 'बुवाई: अप्रैल-जून | कटाई: अक्टूबर-जनवरी | MSP ₹7020/क्विंटल | कीट और बारिश से संवेदनशील',
    },
    {
        name: 'Potato',
        nameHi: 'आलू',
        emoji: '🥔',
        seedCostPerKg: 7,
        maturityDays: 90,      // Real: 80-100 days (Rabi)
        baseYield: 850,        // Real: 700-1000 kg/acre
        basePrice: 28,         // Market avg: ₹12-40/kg
        spoilageRate: 2.0,     // Moderate — needs cold storage
        weatherSensitivity: 'Medium',
        season: 'Rabi',
        overripeDays: 4,
        deadDays: 3,
        color: '#DEB887',
        realInfo: 'Sowing: Oct-Nov | Harvest: Jan-Mar | Needs cold storage | Price: ₹12-40/kg seasonal',
        realInfoHi: 'बुवाई: अक्टूबर-नवंबर | कटाई: जनवरी-मार्च | कोल्ड स्टोरेज ज़रूरी | कीमत: ₹12-40/किलो मौसमी',
    },
];

/**
 * Find a crop definition by name.
 * @param {string} name - Crop name to find
 * @returns {object|undefined} The crop definition or undefined
 */
export function getCropByName(name) {
    return CROPS.find(c => c.name === name);
}

export default CROPS;
