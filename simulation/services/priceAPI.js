/**
 * priceAPI.js - Real crop price data
 * Uses realistic Indian mandi price ranges based on commodity data.
 * Prices are seeded from real market data and fluctuate with supply/demand.
 */

// Real average mandi prices (₹/kg) based on 2024-25 Indian market data
const REAL_BASE_PRICES = {
    Wheat: { min: 20, max: 30, avg: 25 },      // MSP ~₹2275/quintal
    Rice: { min: 25, max: 38, avg: 30 },        // MSP ~₹2300/quintal
    Tomato: { min: 15, max: 80, avg: 45 },      // Highly volatile
    Sugarcane: { min: 28, max: 42, avg: 35 },    // MSP ~₹315/quintal
    Cotton: { min: 45, max: 70, avg: 55 },       // MSP ~₹7020/quintal
    Potato: { min: 12, max: 40, avg: 28 },       // Seasonal volatility
};

/**
 * Fetch realistic crop prices with real-data-based fluctuation.
 * Simulates market variation around real Indian mandi prices.
 * @param {string} cropName - Name of the crop
 * @param {number} day - Current game day (for seasonal trends)
 * @returns {{ price: number, trend: string, volatility: number }}
 */
export function getRealisticPrice(cropName, day) {
    const data = REAL_BASE_PRICES[cropName] || { min: 20, max: 50, avg: 35 };

    // Seasonal sine wave for price trend
    const seasonalFactor = Math.sin((2 * Math.PI * day) / 60) * 0.15;

    // Weekly supply shock simulation
    const weeklyShock = Math.sin((2 * Math.PI * day) / 7) * 0.05;

    // Random daily noise (±3%)
    const noise = (Math.random() - 0.5) * 0.06;

    const multiplier = 1 + seasonalFactor + weeklyShock + noise;
    let price = data.avg * multiplier;

    // Clamp to real-world min/max range
    price = Math.max(data.min, Math.min(data.max, price));

    // Determine trend
    let trend = 'stable';
    if (seasonalFactor > 0.05) trend = 'rising';
    else if (seasonalFactor < -0.05) trend = 'falling';

    return {
        price: Math.round(price * 100) / 100,
        trend,
        volatility: Math.round(Math.abs(noise) * 1000) / 10,
    };
}

/**
 * Generate all crop prices for all markets for a given day.
 * Each market has slight price variation (±10% based on distance/demand).
 * @param {number} day - Current game day
 * @returns {object} Market prices { marketId: { cropName: price } }
 */
export function generateRealPrices(day) {
    const prices = {};
    const marketVariation = {
        localA: 1.0,     // Base prices
        localB: 1.05,    // Slightly better (farther)
        export: 1.15,    // Best prices (export premium)
    };

    Object.keys(marketVariation).forEach(marketId => {
        prices[marketId] = {};
        Object.keys(REAL_BASE_PRICES).forEach(cropName => {
            const base = getRealisticPrice(cropName, day);
            prices[marketId][cropName] = Math.round(base.price * marketVariation[marketId] * 100) / 100;
        });
    });

    return prices;
}

/**
 * Get price info string for display.
 * @param {string} cropName
 * @returns {{ min: number, max: number, avg: number }}
 */
export function getCropPriceRange(cropName) {
    return REAL_BASE_PRICES[cropName] || { min: 20, max: 50, avg: 35 };
}
