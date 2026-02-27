/**
 * priceTrend.js - Price trend analysis and profitability prediction
 * Predicts crop prices for next 30 days to help farmer decide WHEN to sell.
 */
import CROPS from '../data/crops';
import MARKETS from '../data/markets';
import { getRealisticPrice } from './priceAPI';

/**
 * Generate a 30-day price trend forecast for a specific crop across all markets.
 * This shows the farmer the best time to sell.
 * @param {string} cropName
 * @param {number} currentDay
 * @returns {{ crop: string, trends: Array<{ day: number, prices: { [marketId]: number }, bestMarket: string, bestPrice: number }>, peakDay: number, peakPrice: number, peakMarket: string }}
 */
export function generate30DayTrend(cropName, currentDay) {
    const trends = [];
    let peakPrice = 0;
    let peakDay = currentDay;
    let peakMarket = '';

    const marketVariation = {
        localA: 1.0,
        localB: 1.05,
        export: 1.15,
    };

    for (let d = 0; d < 30; d++) {
        const day = currentDay + d;
        const base = getRealisticPrice(cropName, day);
        const prices = {};
        let best = 0;
        let bestMkt = '';

        Object.keys(marketVariation).forEach(mktId => {
            const p = Math.round(base.price * marketVariation[mktId] * 100) / 100;
            prices[mktId] = p;
            if (p > best) {
                best = p;
                bestMkt = mktId;
            }
        });

        if (best > peakPrice) {
            peakPrice = best;
            peakDay = day;
            peakMarket = bestMkt;
        }

        trends.push({ day, dayOffset: d, prices, bestMarket: bestMkt, bestPrice: best, trend: base.trend });
    }

    return { crop: cropName, trends, peakDay, peakPrice, peakMarket, peakDayOffset: peakDay - currentDay };
}

/**
 * Get profitability analysis for all crops.
 * Shows farmer which crop at which time gives maximum profit.
 * @param {number} currentDay
 * @returns {Array<{ crop: string, peakDay: number, peakPrice: number, peakMarket: string }>}
 */
export function getAllCropPeaks(currentDay) {
    return CROPS.map(crop => {
        const trend = generate30DayTrend(crop.name, currentDay);
        return {
            crop: crop.name,
            cropHi: crop.nameHi,
            emoji: crop.emoji,
            peakDay: trend.peakDay,
            peakDayOffset: trend.peakDayOffset,
            peakPrice: trend.peakPrice,
            peakMarket: trend.peakMarket,
            currentPrice: trend.trends[0]?.bestPrice || 0,
            priceChange: trend.peakPrice - (trend.trends[0]?.bestPrice || 0),
        };
    }).sort((a, b) => b.priceChange - a.priceChange);
}

/**
 * Generate bids from markets for a given crop and quantity.
 * Each market offers a bid based on current price + random negotiation.
 * Farmer sets asking price, and bids >= asking price are accepted.
 * @param {string} cropName
 * @param {number} quantity
 * @param {number} quality
 * @param {number} currentDay
 * @param {number} exchangeRate
 * @returns {Array<{ marketId: string, marketName: string, emoji: string, bidPrice: number, bidTotal: number, transportCost: number, netProfit: number, currency: string }>}
 */
export function generateMarketBids(cropName, quantity, quality, currentDay, exchangeRate) {
    return MARKETS.map(market => {
        const base = getRealisticPrice(cropName, currentDay);

        // Each market has its own price variation
        const marketMultiplier = { localA: 1.0, localB: 1.05, export: 1.15 }[market.id] || 1.0;

        // Random negotiation factor (±5%)
        const negotiation = 1 + (Math.random() - 0.5) * 0.10;

        // Demand cycle affects price
        const demandFactor = 1 + 0.1 * Math.sin(2 * Math.PI * currentDay / 30 + market.phaseOffset);

        let bidPrice = base.price * marketMultiplier * negotiation * demandFactor;
        bidPrice = Math.round(bidPrice * 100) / 100;

        // Quality affects the bid
        const qualityMultiplier = quality / 100;
        const effectiveQty = quantity * qualityMultiplier;

        let bidTotal = bidPrice * effectiveQty;
        const transportCost = market.distance * market.costPerKm;

        // Convert for export market
        if (market.currency === 'USD') {
            bidPrice = Math.round(bidPrice / exchangeRate * 100) / 100;
            bidTotal = bidPrice * effectiveQty * exchangeRate;
        }

        const netProfit = bidTotal - transportCost;

        return {
            marketId: market.id,
            marketName: market.name,
            marketNameHi: market.nameHi,
            emoji: market.emoji,
            distance: market.distance,
            bidPrice,
            bidTotal: Math.round(bidTotal),
            transportCost,
            netProfit: Math.round(netProfit),
            currency: market.currency,
            effectiveQty: Math.round(effectiveQty),
        };
    }).sort((a, b) => b.netProfit - a.netProfit);
}
