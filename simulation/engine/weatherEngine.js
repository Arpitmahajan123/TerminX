/**
 * weatherEngine.js - Weather generation and effects
 * Pure logic — no React imports. Generates daily weather based on season
 * with weighted probabilities and returns weather effect modifiers.
 */

import { WEATHER_WEIGHTS, WEATHER_EFFECTS } from '../data/constants';
import { weightedRandom } from '../utils/random';

/**
 * Generates a random weather type based on the current season.
 * Weather probabilities shift between Kharif (monsoon) and Rabi (winter).
 * @param {string} season - Current season: 'Kharif' or 'Rabi'
 * @returns {string} Weather type: 'Sunny', 'Rain', 'Heatwave', or 'Storm'
 */
export function generateWeather(season) {
    const weights = WEATHER_WEIGHTS[season] || WEATHER_WEIGHTS.Kharif;
    return weightedRandom(weights);
}

/**
 * Returns the effect modifiers for a given weather type.
 * @param {string} weather - Weather type ('Sunny', 'Rain', 'Heatwave', 'Storm')
 * @returns {{ growth: number, spoilage: number, transportDelay: number, cropDamageChance: number }}
 */
export function getWeatherEffects(weather) {
    return WEATHER_EFFECTS[weather] || WEATHER_EFFECTS.Sunny;
}

/**
 * Returns the weather emoji for display.
 * @param {string} weather - Weather type
 * @returns {string} Emoji string
 */
export function getWeatherEmoji(weather) {
    const emojis = {
        Sunny: '☀️',
        Rain: '🌧️',
        Heatwave: '🔥',
        Storm: '⛈️',
    };
    return emojis[weather] || '☀️';
}

/**
 * Returns a description of the weather effects for display.
 * @param {string} weather - Weather type
 * @returns {string} Human-readable description
 */
export function getWeatherDescription(weather) {
    const descriptions = {
        Sunny: 'Clear skies — normal growth and spoilage.',
        Rain: 'Rainy day — faster growth, slightly more spoilage.',
        Heatwave: 'Scorching heat — slower growth, faster spoilage, transport delays.',
        Storm: 'Severe storm — very slow growth, high spoilage, transport delays, possible crop damage.',
    };
    return descriptions[weather] || 'Normal conditions.';
}
