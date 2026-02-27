/**
 * gameRules.js - Win/lose conditions and game status checks
 * Pure logic — no React imports.
 */

import {
    WIN_MONEY_THRESHOLD,
    MAX_LOAN_BALANCE,
    FIELD_STATES,
    SEASON_LENGTH,
    SEASONS,
} from '../data/constants';

/**
 * Checks if the game is over (loss conditions).
 * - Money < 0 AND no crops planted AND storage empty → BANKRUPT
 * - Loan balance > ₹5,00,000 → DEBT SEIZURE
 * @param {object} state - Current world state
 * @returns {{ isGameOver: boolean, reason: string }}
 */
export function checkGameOver(state) {
    // Debt seizure
    if (state.loanBalance > MAX_LOAN_BALANCE) {
        return {
            isGameOver: true,
            reason: 'DEBT_SEIZURE',
            message: '🏦 Your loan exceeded ₹5,00,000! The bank has seized your farm.',
        };
    }

    // Bankruptcy check
    if (state.money < 0) {
        const hasPlantedCrops = state.fields.some(f =>
            f.status !== FIELD_STATES.EMPTY && f.status !== FIELD_STATES.DEAD
        );
        const hasStoredItems = state.storage.length > 0;
        const hasActiveTransports = state.activeTransports.length > 0;

        if (!hasPlantedCrops && !hasStoredItems && !hasActiveTransports) {
            return {
                isGameOver: true,
                reason: 'BANKRUPT',
                message: '💸 You are bankrupt! No money, no crops, no stock.',
            };
        }
    }

    return { isGameOver: false, reason: null, message: null };
}

/**
 * Checks if the player has won the game.
 * Win condition: money >= ₹10,00,000 with 0 loan balance.
 * @param {object} state - Current world state
 * @returns {{ hasWon: boolean, message: string }}
 */
export function checkWinCondition(state) {
    if (state.money >= WIN_MONEY_THRESHOLD && state.loanBalance <= 0) {
        return {
            hasWon: true,
            message: '🏆 Congratulations! You reached ₹10,00,000 with no debt! You WIN!',
        };
    }
    return { hasWon: false, message: null };
}

/**
 * Gets the current season based on the day number.
 * Day 1-60: Kharif, Day 61-120: Rabi, Day 121-180: Kharif, etc.
 * @param {number} day - Current day number
 * @returns {string} Current season: 'Kharif' or 'Rabi'
 */
export function getSeason(day) {
    const seasonIndex = Math.floor(((day - 1) % (SEASON_LENGTH * 2)) / SEASON_LENGTH);
    return SEASONS[seasonIndex];
}

/**
 * Checks if a season change occurred on this day.
 * @param {number} day - Current day
 * @returns {{ changed: boolean, newSeason: string, notification: string }}
 */
export function checkSeasonChange(day) {
    if (day <= 1) return { changed: false, newSeason: getSeason(day), notification: null };

    const todaySeason = getSeason(day);
    const yesterdaySeason = getSeason(day - 1);

    if (todaySeason !== yesterdaySeason) {
        return {
            changed: true,
            newSeason: todaySeason,
            notification: `🌿 Season changed to ${todaySeason}! Weather patterns will shift.`,
        };
    }

    return { changed: false, newSeason: todaySeason, notification: null };
}

/**
 * Gets the number of days remaining in the current season.
 * @param {number} day - Current day
 * @returns {number} Days remaining in season
 */
export function getDaysRemainingInSeason(day) {
    const dayInCycle = ((day - 1) % (SEASON_LENGTH * 2)) + 1;
    const dayInSeason = ((day - 1) % SEASON_LENGTH) + 1;
    return SEASON_LENGTH - dayInSeason;
}
