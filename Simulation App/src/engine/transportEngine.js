/**
 * transportEngine.js - Transport simulation
 * Pure logic — no React imports.
 * Handles initiating transports, advancing trucks each day,
 * and completing deliveries with transit spoilage.
 */

import { getCropByName } from '../data/crops';
import { getMarketById } from '../data/markets';
import { getWeatherEffects } from './weatherEngine';
import { SPEED_KM_PER_DAY, TRUCK_CAPACITY } from '../data/constants';
import { generateId } from '../utils/random';

/**
 * Initiates a new transport from farm to market.
 * baseTravelDays = ceil(distance / 100)
 * actualTravelDays = ceil(baseTravelDays × (1 + weatherTransportDelay))
 * @param {string} cropType - Type of crop being transported
 * @param {number} quantity - Quantity in kg (effective, after spoilage)
 * @param {number} quality - Quality percentage
 * @param {number} spoilageAtDeparture - Current spoilage %
 * @param {string} marketId - Target market ID
 * @param {number} offeredPrice - Price per kg at market
 * @param {number} transportCost - Total transport cost
 * @param {string} weather - Current weather for delay calculation
 * @returns {object} Transport object
 */
export function initiateTransport(cropType, quantity, quality, spoilageAtDeparture, marketId, offeredPrice, transportCost, weather) {
    const market = getMarketById(marketId);
    if (!market) return null;

    const effects = getWeatherEffects(weather);
    const baseTravelDays = Math.ceil(market.distance / SPEED_KM_PER_DAY);
    const actualTravelDays = Math.ceil(baseTravelDays * (1 + effects.transportDelay));

    return {
        id: generateId(),
        cropType,
        quantity,
        quality,
        spoilageAtDeparture,
        marketId,
        marketName: market.name,
        totalTravelDays: actualTravelDays,
        daysRemaining: actualTravelDays,
        offeredPrice,
        transportCost,
    };
}

/**
 * Advances all active transports by one day.
 * When a transport arrives (daysRemaining reaches 0), it is completed
 * and revenue is calculated with transit spoilage.
 * @param {Array<object>} transports - Active transport array
 * @param {string} weather - Today's weather type
 * @param {number} exchangeRate - Current INR/USD exchange rate
 * @returns {{ transports: Array<object>, completedRevenue: number, notifications: string[], reputationChanges: number }}
 */
export function advanceTransports(transports, weather, exchangeRate) {
    const effects = getWeatherEffects(weather);
    const notifications = [];
    let completedRevenue = 0;
    let reputationChanges = 0;

    const activeTransports = [];

    for (const transport of transports) {
        const newTransport = {
            ...transport,
            daysRemaining: transport.daysRemaining - 1,
        };

        if (newTransport.daysRemaining <= 0) {
            // Transport completed — calculate final revenue with transit spoilage
            const result = completeTransport(transport, weather, exchangeRate);
            completedRevenue += result.revenue;
            notifications.push(result.notification);
            reputationChanges += result.reputationChange;
        } else {
            activeTransports.push(newTransport);
        }
    }

    return {
        transports: activeTransports,
        completedRevenue,
        notifications,
        reputationChanges,
    };
}

/**
 * Completes a transport and calculates final revenue.
 * Transit spoilage is applied and revenue is calculated based on
 * the effective quantity after all spoilage.
 * @param {object} transport - Transport to complete
 * @param {string} weather - Current weather
 * @param {number} exchangeRate - INR/USD rate
 * @returns {{ revenue: number, notification: string, reputationChange: number }}
 */
function completeTransport(transport, weather, exchangeRate) {
    const crop = getCropByName(transport.cropType);
    const market = getMarketById(transport.marketId);
    const effects = getWeatherEffects(weather);

    if (!crop || !market) {
        return { revenue: 0, notification: '❌ Transport failed.', reputationChange: 0 };
    }

    // Calculate transit spoilage
    const dailySpoilageRate = crop.spoilageRate + (crop.spoilageRate * effects.spoilage);
    const transitSpoilage = transport.totalTravelDays * dailySpoilageRate;
    const totalSpoilage = Math.min(100, transport.spoilageAtDeparture + transitSpoilage);
    const effectiveQuantity = transport.quantity * (1 - totalSpoilage / 100);

    // Calculate revenue
    let revenue = transport.offeredPrice * effectiveQuantity * (transport.quality / 100);

    // Convert USD to INR for export market
    if (market.currency === 'USD') {
        revenue = revenue * exchangeRate;
    }

    // Subtract transport cost
    const finalProfit = revenue - transport.transportCost;

    // Reputation change for export sales
    let reputationChange = 0;
    if (market.currency === 'USD') {
        reputationChange += 5; // REP_EXPORT_SALE
    }
    if (transport.quality > 80) {
        reputationChange += 2; // REP_HIGH_QUALITY_SALE
    } else if (transport.quality < 50) {
        reputationChange -= 3; // REP_LOW_QUALITY_SALE
    }

    const profitText = finalProfit >= 0 ? `+₹${Math.round(finalProfit).toLocaleString()}`
        : `-₹${Math.round(Math.abs(finalProfit)).toLocaleString()}`;
    const notification = `🚚 ${transport.cropType} delivered to ${market.name}! Revenue: ${profitText}`;

    return {
        revenue: finalProfit,
        notification,
        reputationChange,
    };
}
