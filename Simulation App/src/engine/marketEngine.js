/**
 * marketEngine.js - Market price fluctuation and demand cycles
 * Pure logic — no React imports.
 * Handles daily price updates, demand multipliers, and negotiation pricing.
 */

import CROPS from '../data/crops';
import MARKETS from '../data/markets';
import { DEMAND_CYCLE_PERIOD, DEMAND_AMPLITUDE } from '../data/constants';
import { randomInRange, clamp } from '../utils/random';

/**
 * Initializes market prices for all crops at all markets.
 * Prices start at each crop's base price.
 * @returns {{ localA: object, localB: object, export: object }}
 */
export function initializeMarketPrices() {
    const prices = {};
    MARKETS.forEach(market => {
        prices[market.id] = {};
        CROPS.forEach(crop => {
            prices[market.id][crop.name] = crop.basePrice;
        });
    });
    return prices;
}

/**
 * Updates all market prices for one day tick.
 * newPrice = previousPrice × (1 + randomInRange(-volatility, +volatility))
 * newPrice = clamp(newPrice, baseCropPrice × 0.5, baseCropPrice × 2.0)
 * @param {object} currentPrices - Current market prices { marketId: { cropName: price } }
 * @returns {object} Updated market prices
 */
export function updateMarketPrices(currentPrices) {
    const updated = {};

    MARKETS.forEach(market => {
        updated[market.id] = {};
        CROPS.forEach(crop => {
            const prevPrice = currentPrices[market.id]?.[crop.name] ?? crop.basePrice;
            const change = randomInRange(-market.volatility, market.volatility);
            let newPrice = prevPrice * (1 + change);
            newPrice = clamp(newPrice, crop.basePrice * 0.5, crop.basePrice * 2.0);
            updated[market.id][crop.name] = Math.round(newPrice * 100) / 100;
        });
    });

    return updated;
}

/**
 * Calculates the demand multiplier for a market on a given day.
 * demandMultiplier = 1.0 + 0.3 × sin(2π × day / 30 + marketPhaseOffset)
 * @param {number} day - Current day number
 * @param {number} phaseOffset - Market's phase offset for the demand sine wave
 * @returns {number} Demand multiplier (0.7 to 1.3)
 */
export function getDemandMultiplier(day, phaseOffset) {
    return 1.0 + DEMAND_AMPLITUDE * Math.sin((2 * Math.PI * day) / DEMAND_CYCLE_PERIOD + phaseOffset);
}

/**
 * Calculates the final offered price for selling a crop at a market.
 * Factors in base price, demand cycle, and negotiation (reputation-based).
 * @param {number} baseMarketPrice - Current market price for the crop
 * @param {number} day - Current game day
 * @param {number} phaseOffset - Market's phase offset
 * @param {number} reputation - Player's reputation (0-100)
 * @returns {{ offeredPrice: number, demandLevel: string, demandMultiplier: number }}
 */
export function calculateOfferedPrice(baseMarketPrice, day, phaseOffset, reputation) {
    const demandMult = getDemandMultiplier(day, phaseOffset);
    const priceWithDemand = baseMarketPrice * demandMult;

    // Negotiation floor improves with reputation: ranges 0.90 to 0.98
    const negotiationFloor = 0.90 + (reputation / 100) * 0.08;
    const offeredPrice = priceWithDemand * randomInRange(negotiationFloor, 1.05);

    // Determine demand level for display
    let demandLevel = 'Medium';
    if (demandMult > 1.15) demandLevel = 'High';
    else if (demandMult < 0.85) demandLevel = 'Low';

    return {
        offeredPrice: Math.round(offeredPrice * 100) / 100,
        demandLevel,
        demandMultiplier: Math.round(demandMult * 100) / 100,
    };
}

/**
 * Calculates the transport cost for selling to a market.
 * transportCost = distance × costPerKm × ceil(quantity / 500)
 * @param {object} market - Market definition
 * @param {number} quantity - Quantity to transport in kg
 * @returns {{ transportCost: number, truckCount: number }}
 */
export function calculateTransportCost(market, quantity) {
    const truckCount = Math.ceil(quantity / 500);
    const transportCost = market.distance * market.costPerKm * truckCount;
    return { transportCost, truckCount };
}

/**
 * Gets the demand level string for display.
 * @param {number} day - Current day
 * @param {number} phaseOffset - Market phase offset
 * @returns {string} 'High', 'Medium', or 'Low'
 */
export function getDemandLevel(day, phaseOffset) {
    const mult = getDemandMultiplier(day, phaseOffset);
    if (mult > 1.15) return 'High';
    if (mult < 0.85) return 'Low';
    return 'Medium';
}
