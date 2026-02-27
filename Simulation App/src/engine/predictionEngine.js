/**
 * predictionEngine.js - Profit forecasting for crop planting decisions
 * Pure logic — no React imports.
 * Shows predicted revenue, costs, and net profit before planting.
 */

import CROPS from '../data/crops';
import MARKETS from '../data/markets';

/**
 * Predicts the profit for planting a specific crop on a field.
 * Uses conservative estimates (85% of base yield, 90% quality).
 *
 * Predicted Revenue:
 *   avgMarketPrice = average of all 3 markets' current prices
 *   predictedYield = crop.baseYield × 0.85
 *   predictedRevenue = avgMarketPrice × predictedYield × 0.90
 *
 * Predicted Cost:
 *   seedCost = crop.seedCostPerKg × fieldCapacity
 *   avgTransportCost = avgDistance × 2 × ceil(predictedYield / 500)
 *   totalCost = seedCost + avgTransportCost
 *
 * @param {object} crop - Crop definition object
 * @param {number} fieldCapacity - Field capacity in kg
 * @param {object} marketPrices - Current market prices { marketId: { cropName: price } }
 * @param {string} currentSeason - Current season for compatibility check
 * @returns {{
 *   cropName: string,
 *   seedCost: number,
 *   predictedYield: number,
 *   avgMarketPrice: number,
 *   predictedRevenue: number,
 *   avgTransportCost: number,
 *   totalCost: number,
 *   netProfit: number,
 *   roi: number,
 *   seasonMatch: boolean,
 *   profitColor: string
 * }}
 */
export function predictProfit(crop, fieldCapacity, marketPrices, currentSeason) {
    // Average market price across all 3 markets
    let totalPrice = 0;
    let count = 0;
    MARKETS.forEach(market => {
        const price = marketPrices[market.id]?.[crop.name] ?? crop.basePrice;
        totalPrice += price;
        count++;
    });
    const avgMarketPrice = count > 0 ? totalPrice / count : crop.basePrice;

    // Season check
    const seasonMatch = crop.season === 'Both' || crop.season === currentSeason;
    const seasonMultiplier = seasonMatch ? 1.0 : 0.6;

    // Conservative estimates
    const predictedYield = Math.round(crop.baseYield * 0.85 * seasonMultiplier);
    const predictedRevenue = Math.round(avgMarketPrice * predictedYield * 0.90);

    // Costs
    const seedCost = crop.seedCostPerKg * fieldCapacity;
    const avgDistance = MARKETS.reduce((sum, m) => sum + m.distance, 0) / MARKETS.length;
    const truckCount = Math.ceil(predictedYield / 500);
    const avgTransportCost = Math.round(avgDistance * 2 * truckCount);
    const totalCost = seedCost + avgTransportCost;

    // Profit
    const netProfit = predictedRevenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    // Color coding
    let profitColor = '#4CAF50'; // Green
    if (netProfit < 0) {
        profitColor = '#F44336'; // Red
    } else if (roi < 10) {
        profitColor = '#FFC107'; // Yellow (marginal)
    }

    return {
        cropName: crop.name,
        emoji: crop.emoji,
        seedCost,
        predictedYield,
        avgMarketPrice: Math.round(avgMarketPrice * 100) / 100,
        predictedRevenue,
        avgTransportCost,
        totalCost,
        netProfit,
        roi: Math.round(roi),
        seasonMatch,
        profitColor,
        maturityDays: crop.maturityDays,
        spoilageRate: crop.spoilageRate,
    };
}

/**
 * Generates profit predictions for all crops.
 * @param {number} fieldCapacity - Field capacity in kg
 * @param {object} marketPrices - Current market prices
 * @param {string} currentSeason - Current season
 * @returns {Array<object>} Array of profit predictions, sorted by net profit descending
 */
export function predictAllCrops(fieldCapacity, marketPrices, currentSeason) {
    return CROPS
        .map(crop => predictProfit(crop, fieldCapacity, marketPrices, currentSeason))
        .sort((a, b) => b.netProfit - a.netProfit);
}
