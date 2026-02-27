/**
 * simulationEngine.js - Master simulation tick function
 * Pure logic — no React imports.
 * Orchestrates all subsystems in the correct order for each day advance.
 *
 * Tick order:
 *   1. Weather generation
 *   2. Field growth updates
 *   3. Storage spoilage calculation
 *   4. Market price fluctuation
 *   5. Exchange rate fluctuation
 *   6. Transport progress (if active)
 *   7. Reputation update (accumulated from sub-systems)
 *   8. Season check
 *   9. Loan interest accrual
 */

import { generateWeather } from './weatherEngine';
import { updateFields } from './cropEngine';
import { applySpoilage } from './storageEngine';
import { updateMarketPrices } from './marketEngine';
import { updateExchangeRate, processLoan } from './economyEngine';
import { advanceTransports } from './transportEngine';
import { updateReputation } from './reputationEngine';
import { checkGameOver, checkWinCondition, checkSeasonChange, getSeason } from './gameRules';

/**
 * Advances the entire game world by one day.
 * This is the master tick function that orchestrates all simulation subsystems.
 * @param {object} state - Current WorldState
 * @returns {object} New WorldState after one day
 */
export function advanceDay(state) {
    const newDay = state.day + 1;
    const allNotifications = [];
    let totalRepChanges = 0;

    // 1. Season check — determine season for the new day
    const seasonCheck = checkSeasonChange(newDay);
    const season = seasonCheck.newSeason;
    if (seasonCheck.notification) {
        allNotifications.push(seasonCheck.notification);
    }

    // 2. Weather generation
    const weather = generateWeather(season);

    // 3. Field growth updates
    const fieldResult = updateFields(state.fields, weather, season);
    allNotifications.push(...fieldResult.notifications);
    totalRepChanges += fieldResult.reputationChanges;

    // 4. Storage spoilage calculation
    const storageResult = applySpoilage(state.storage, weather);
    allNotifications.push(...storageResult.notifications);
    totalRepChanges += storageResult.reputationChanges;

    // 5. Market price fluctuation
    const newMarketPrices = updateMarketPrices(state.marketPrices);

    // 6. Exchange rate fluctuation
    const newExchangeRate = updateExchangeRate(state.exchangeRate);

    // 7. Transport progress
    const transportResult = advanceTransports(state.activeTransports, weather, newExchangeRate);
    allNotifications.push(...transportResult.notifications);
    totalRepChanges += transportResult.reputationChanges;

    // 8. Reputation update (accumulated from all sub-systems)
    const newReputation = updateReputation(state.reputation, totalRepChanges);

    // 9. Loan interest accrual
    const loanResult = processLoan(state.loanBalance, newReputation);

    // Calculate new money (transport revenue applied)
    const newMoney = state.money + transportResult.completedRevenue;

    // Update weather history (keep last 30 days)
    const weatherHistory = [...state.weatherHistory, weather].slice(-30);

    // Build new state
    let newState = {
        ...state,
        day: newDay,
        season,
        weather,
        weatherHistory,
        exchangeRate: newExchangeRate,
        money: Math.round(newMoney * 100) / 100,
        reputation: newReputation,
        loanBalance: loanResult.loanBalance,
        fields: fieldResult.fields,
        storage: storageResult.storage,
        marketPrices: newMarketPrices,
        activeTransports: transportResult.transports,
        notifications: allNotifications,
    };

    // Check game over / win conditions
    const gameOver = checkGameOver(newState);
    if (gameOver.isGameOver) {
        newState.gameStatus = 'lost';
        newState.gameOverReason = gameOver.reason;
        newState.notifications = [...allNotifications, gameOver.message];
    } else {
        const win = checkWinCondition(newState);
        if (win.hasWon) {
            newState.gameStatus = 'won';
            newState.notifications = [...allNotifications, win.message];
        }
    }

    return newState;
}
