/**
 * cropEngine.js - Field growth, harvest yield, and quality calculations
 * Pure logic — no React imports.
 * Manages the field state machine: EMPTY → PLANTED → GROWING → MATURE → OVERRIPE → DEAD
 */

import { FIELD_STATES, SEASON_MISMATCH_PENALTY } from '../data/constants';
import { getCropByName } from '../data/crops';
import { getWeatherEffects } from './weatherEngine';
import { chance } from '../utils/random';

/**
 * Updates all fields for one day tick. Advances growth, checks maturity,
 * handles overripe/dead transitions, and applies weather damage.
 * @param {Array<object>} fields - Array of Field objects
 * @param {string} weather - Today's weather type
 * @param {string} season - Current season
 * @returns {{ fields: Array<object>, notifications: string[], reputationChanges: number }}
 */
export function updateFields(fields, weather, season) {
    const effects = getWeatherEffects(weather);
    const notifications = [];
    let reputationChanges = 0;

    const updatedFields = fields.map(field => {
        if (field.status === FIELD_STATES.EMPTY || field.status === FIELD_STATES.DEAD) {
            return field;
        }

        const crop = getCropByName(field.cropType);
        if (!crop) return field;

        let newField = { ...field };

        switch (field.status) {
            case FIELD_STATES.PLANTED: {
                // PLANTED → GROWING after 1 day
                newField.status = FIELD_STATES.GROWING;
                newField.daysPlanted = 1;
                newField.totalGrowthDays = 1;
                newField.growthPoints = 1 + effects.growth;
                newField.sunnyDays = weather === 'Sunny' ? 1 : 0;
                break;
            }

            case FIELD_STATES.GROWING: {
                // Accumulate daily growth points adjusted by weather
                newField.daysPlanted = field.daysPlanted + 1;
                newField.totalGrowthDays = field.totalGrowthDays + 1;
                newField.growthPoints = field.growthPoints + 1 + effects.growth;
                newField.sunnyDays = field.sunnyDays + (weather === 'Sunny' ? 1 : 0);

                // Apply storm crop damage
                if (effects.cropDamageChance > 0 && chance(effects.cropDamageChance)) {
                    newField.weatherDamage = Math.min(1, (field.weatherDamage || 0) + 0.20);
                    notifications.push(`⛈️ Storm damaged ${crop.name} on Field ${field.id + 1}! (20% yield lost)`);
                }

                // Check maturity: growthPoints >= crop.maturityDays
                if (newField.growthPoints >= crop.maturityDays) {
                    newField.status = FIELD_STATES.MATURE;
                    newField.quality = calculateQuality(newField.sunnyDays, newField.totalGrowthDays);
                    newField.daysAfterMature = 0;
                    notifications.push(`🌾 ${crop.name} on Field ${field.id + 1} is MATURE! Harvest now!`);
                }
                break;
            }

            case FIELD_STATES.MATURE: {
                // Track days after maturity
                newField.daysAfterMature = (field.daysAfterMature || 0) + 1;

                if (newField.daysAfterMature > crop.overripeDays) {
                    newField.status = FIELD_STATES.OVERRIPE;
                    newField.daysOverripe = 0;
                    notifications.push(`⚠️ ${crop.name} on Field ${field.id + 1} is OVERRIPE! Harvest soon or lose yield!`);
                }
                break;
            }

            case FIELD_STATES.OVERRIPE: {
                newField.daysOverripe = (field.daysOverripe || 0) + 1;

                if (newField.daysOverripe >= crop.deadDays) {
                    newField.status = FIELD_STATES.DEAD;
                    reputationChanges -= 5; // REP_CROP_DIED
                    notifications.push(`💀 ${crop.name} on Field ${field.id + 1} DIED! (Reputation -5)`);
                }
                break;
            }

            default:
                break;
        }

        return newField;
    });

    return { fields: updatedFields, notifications, reputationChanges };
}

/**
 * Calculates crop quality based on sunny days during growth.
 * qualityPercent = min(100, 60 + (sunnyDays / totalGrowthDays) * 40)
 * @param {number} sunnyDays - Number of sunny days during growth
 * @param {number} totalGrowthDays - Total days of growth
 * @returns {number} Quality percentage 0-100
 */
export function calculateQuality(sunnyDays, totalGrowthDays) {
    if (totalGrowthDays === 0) return 60;
    return Math.min(100, 60 + (sunnyDays / totalGrowthDays) * 40);
}

/**
 * Calculates actual harvest yield from a mature field.
 * actualYield = baseYield × (quality/100) × seasonMultiplier × (1 - weatherDamage)
 * @param {object} field - The field to harvest
 * @param {string} season - Current season
 * @returns {{ yield: number, quality: number }} Harvest results
 */
export function calculateYield(field, season) {
    const crop = getCropByName(field.cropType);
    if (!crop) return { yield: 0, quality: 0 };

    const quality = field.quality || calculateQuality(field.sunnyDays, field.totalGrowthDays);
    const qualityMultiplier = quality / 100;

    // Season mismatch: 40% yield reduction
    const seasonMultiplier = (crop.season === 'Both' || crop.season === season) ? 1.0 : SEASON_MISMATCH_PENALTY;

    // Weather damage accumulated during growth
    const weatherDamageMultiplier = 1 - (field.weatherDamage || 0);

    const actualYield = crop.baseYield * qualityMultiplier * seasonMultiplier * weatherDamageMultiplier;

    return {
        yield: Math.round(actualYield),
        quality: Math.round(quality),
    };
}

/**
 * Creates an empty field object.
 * @param {number} id - Field index
 * @param {number} capacity - Field capacity in kg
 * @returns {object} Empty field state
 */
export function createEmptyField(id, capacity) {
    return {
        id,
        cropType: null,
        status: FIELD_STATES.EMPTY,
        daysPlanted: 0,
        growthPoints: 0,
        sunnyDays: 0,
        totalGrowthDays: 0,
        quality: 0,
        quantity: capacity,
        weatherDamage: 0,
        daysAfterMature: 0,
        daysOverripe: 0,
    };
}

/**
 * Resets a field to EMPTY state after harvest.
 * @param {object} field - The field to reset
 * @returns {object} Reset field
 */
export function resetField(field) {
    return {
        ...field,
        cropType: null,
        status: FIELD_STATES.EMPTY,
        daysPlanted: 0,
        growthPoints: 0,
        sunnyDays: 0,
        totalGrowthDays: 0,
        quality: 0,
        weatherDamage: 0,
        daysAfterMature: 0,
        daysOverripe: 0,
    };
}

/**
 * Gets the growth progress of a field as a percentage (0-100).
 * @param {object} field - The field to check
 * @returns {number} Growth percentage
 */
export function getGrowthProgress(field) {
    if (!field.cropType) return 0;
    const crop = getCropByName(field.cropType);
    if (!crop) return 0;

    if (field.status === FIELD_STATES.MATURE || field.status === FIELD_STATES.OVERRIPE) return 100;
    if (field.status === FIELD_STATES.DEAD) return 0;

    return Math.min(100, (field.growthPoints / crop.maturityDays) * 100);
}
