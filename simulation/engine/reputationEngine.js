/**
 * reputationEngine.js - Reputation tracking system
 * Pure logic — no React imports.
 * Reputation affects negotiation floors and loan interest rates.
 */

import {
    REP_HIGH_QUALITY_SALE,
    REP_LOW_QUALITY_SALE,
    REP_EXPORT_SALE,
    REP_CROP_DIED,
    REP_ITEM_SPOILED,
    REP_MIN,
    REP_MAX,
} from '../data/constants';
import { clamp } from '../utils/random';

/**
 * Applies a reputation change and clamps to valid range.
 * @param {number} currentReputation - Current reputation (0-100)
 * @param {number} change - Amount to add (positive) or subtract (negative)
 * @returns {number} Updated reputation, clamped to [0, 100]
 */
export function updateReputation(currentReputation, change) {
    return clamp(currentReputation + change, REP_MIN, REP_MAX);
}

/**
 * Gets the reputation tier label for display.
 * @param {number} reputation - Current reputation (0-100)
 * @returns {string} Tier label
 */
export function getReputationTier(reputation) {
    if (reputation >= 80) return 'Excellent';
    if (reputation >= 60) return 'Good';
    if (reputation >= 40) return 'Average';
    if (reputation >= 20) return 'Poor';
    return 'Terrible';
}

/**
 * Gets the reputation change amount for a sale based on quality.
 * @param {number} quality - Quality percentage (0-100)
 * @param {boolean} isExport - Whether this is an export market sale
 * @returns {number} Reputation change amount
 */
export function getSaleReputationChange(quality, isExport) {
    let change = 0;

    if (quality > 80) {
        change += REP_HIGH_QUALITY_SALE;
    } else if (quality < 50) {
        change += REP_LOW_QUALITY_SALE;
    }

    if (isExport) {
        change += REP_EXPORT_SALE;
    }

    return change;
}

/**
 * Returns the color code for the reputation value.
 * @param {number} reputation - Current reputation
 * @returns {string} Hex color string
 */
export function getReputationColor(reputation) {
    if (reputation >= 70) return '#FFD700'; // Gold
    if (reputation >= 40) return '#FFA726'; // Orange
    return '#EF5350'; // Red
}
