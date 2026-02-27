/**
 * storageEngine.js - Storage management and spoilage
 * Pure logic — no React imports.
 * Handles adding/removing items from storage and daily spoilage calculations.
 */

import { getCropByName } from '../data/crops';
import { getWeatherEffects } from './weatherEngine';
import { generateId } from '../utils/random';
import { REP_ITEM_SPOILED } from '../data/constants';

/**
 * Applies daily spoilage to all items in storage.
 * dailySpoilage = baseSpoilageRate + (baseSpoilageRate × weatherSpoilageModifier)
 * currentSpoilage = min(100, currentSpoilage + dailySpoilage)
 * Items with 100% spoilage are removed.
 * @param {Array<object>} storage - Array of StorageItem objects
 * @param {string} weather - Today's weather type
 * @returns {{ storage: Array<object>, notifications: string[], reputationChanges: number }}
 */
export function applySpoilage(storage, weather) {
    const effects = getWeatherEffects(weather);
    const notifications = [];
    let reputationChanges = 0;

    const updatedStorage = [];

    for (const item of storage) {
        const crop = getCropByName(item.cropType);
        if (!crop) continue;

        // Calculate daily spoilage: base + weather modifier
        const dailySpoilage = crop.spoilageRate + (crop.spoilageRate * effects.spoilage);
        const newSpoilage = Math.min(100, item.currentSpoilage + dailySpoilage);

        if (newSpoilage >= 100) {
            // Item fully spoiled — remove from storage
            notifications.push(`🗑️ ${crop.name} in storage fully spoiled and was discarded! (Rep -3)`);
            reputationChanges += REP_ITEM_SPOILED;
            continue; // Don't add to updated storage
        }

        updatedStorage.push({
            ...item,
            currentSpoilage: Math.round(newSpoilage * 100) / 100,
            daysInStorage: item.daysInStorage + 1,
        });
    }

    return { storage: updatedStorage, notifications, reputationChanges };
}

/**
 * Adds a harvested crop to storage.
 * @param {Array<object>} storage - Current storage array
 * @param {string} cropType - Type of crop to store
 * @param {number} quantity - Amount in kg
 * @param {number} quality - Quality percentage (0-100)
 * @param {number} storageCapacity - Maximum storage capacity in kg
 * @returns {{ success: boolean, storage: Array<object>, notification: string }}
 */
export function addToStorage(storage, cropType, quantity, quality, storageCapacity) {
    const currentTotal = getTotalStorageUsed(storage);

    if (currentTotal + quantity > storageCapacity) {
        return {
            success: false,
            storage,
            notification: `❌ Not enough storage! (${Math.round(currentTotal)}/${storageCapacity} kg used)`,
        };
    }

    const newItem = {
        id: generateId(),
        cropType,
        originalQuantity: quantity,
        currentSpoilage: 0,
        quality: Math.round(quality),
        daysInStorage: 0,
    };

    return {
        success: true,
        storage: [...storage, newItem],
        notification: `📦 Stored ${Math.round(quantity)} kg of ${cropType} (Quality: ${Math.round(quality)}%)`,
    };
}

/**
 * Removes an item from storage by ID.
 * @param {Array<object>} storage - Current storage array
 * @param {string} itemId - ID of item to remove
 * @returns {Array<object>} Updated storage array
 */
export function removeFromStorage(storage, itemId) {
    return storage.filter(item => item.id !== itemId);
}

/**
 * Calculates the effective (non-spoiled) quantity of a storage item.
 * effectiveQuantity = originalQuantity × (1 - currentSpoilage / 100)
 * @param {object} item - StorageItem
 * @returns {number} Effective quantity in kg
 */
export function getEffectiveQuantity(item) {
    return item.originalQuantity * (1 - item.currentSpoilage / 100);
}

/**
 * Gets total storage currently used in kg (based on original quantities).
 * @param {Array<object>} storage - Storage array
 * @returns {number} Total kg used
 */
export function getTotalStorageUsed(storage) {
    return storage.reduce((sum, item) => sum + item.originalQuantity, 0);
}
