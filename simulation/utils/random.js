/**
 * random.js - Centralized randomness utilities
 * All game randomness must go through these functions so it can be seeded later for testing.
 */

/**
 * Returns a random float in the range [min, max).
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random float in [min, max)
 */
export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer in the range [min, max] (inclusive).
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in [min, max]
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Selects a random item from weighted options.
 * @param {{ [key: string]: number }} weights - Object mapping option names to their weights
 * @returns {string} The selected option name
 */
export function weightedRandom(weights) {
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * totalWeight;

    for (const [key, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return key;
    }

    // Fallback: return last entry
    return entries[entries.length - 1][0];
}

/**
 * Clamps a value between min and max.
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Returns true with the given probability (0-1).
 * @param {number} probability - Chance of returning true (0 to 1)
 * @returns {boolean}
 */
export function chance(probability) {
    return Math.random() < probability;
}

/**
 * Generates a unique ID string.
 * @returns {string} A unique identifier
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
