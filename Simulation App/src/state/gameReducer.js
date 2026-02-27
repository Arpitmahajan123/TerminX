/**
 * gameReducer.js - Central reducer for all game state changes
 * The ONLY place state changes occur. Components dispatch actions,
 * the reducer calls engine functions and returns new immutable state.
 */

import * as Actions from './actions';
import { createInitialState, createConfiguredState } from './initialState';
import { advanceDay } from '../engine/simulationEngine';
import { calculateYield, resetField, createEmptyField } from '../engine/cropEngine';
import { addToStorage, removeFromStorage, getEffectiveQuantity } from '../engine/storageEngine';
import { initiateTransport } from '../engine/transportEngine';
import { calculateOfferedPrice, calculateTransportCost } from '../engine/marketEngine';
import { takeLoan, repayLoan } from '../engine/economyEngine';
import { updateReputation } from '../engine/reputationEngine';
import { getCropByName } from '../data/crops';
import { getMarketById } from '../data/markets';
import {
    FIELD_STATES,
    FIELD_COST,
    STORAGE_UPGRADE_COST,
    STORAGE_UPGRADE_AMOUNT,
    MAX_FIELDS,
    MAX_STORAGE_CAPACITY,
    STARTING_FIELD_CAPACITY,
    SCREENS,
} from '../data/constants';

/**
 * Main game reducer function.
 * @param {object} state - Current WorldState
 * @param {{ type: string, payload?: object }} action - Dispatched action
 * @returns {object} New WorldState (immutable)
 */
export default function gameReducer(state, action) {
    switch (action.type) {

        // ==================== TIME ====================
        case Actions.NEXT_DAY: {
            if (state.gameStatus !== 'playing') return state;
            return advanceDay(state);
        }

        // ==================== PLANTING ====================
        case Actions.PLANT_CROP: {
            const { fieldId, cropType } = action.payload;
            const crop = getCropByName(cropType);
            if (!crop) return state;

            const field = state.fields[fieldId];
            if (!field || field.status !== FIELD_STATES.EMPTY) return state;

            // Calculate planting cost: seedCostPerKg × fieldCapacity
            const plantingCost = crop.seedCostPerKg * field.quantity;
            if (state.money < plantingCost) {
                return {
                    ...state,
                    notifications: [`❌ Not enough money! Need ₹${plantingCost.toLocaleString()} to plant ${crop.name}.`],
                };
            }

            // Update field to PLANTED state
            const newFields = state.fields.map((f, i) => {
                if (i !== fieldId) return f;
                return {
                    ...f,
                    cropType,
                    status: FIELD_STATES.PLANTED,
                    daysPlanted: 0,
                    growthPoints: 0,
                    sunnyDays: 0,
                    totalGrowthDays: 0,
                    quality: 0,
                    weatherDamage: 0,
                    daysAfterMature: 0,
                    daysOverripe: 0,
                };
            });

            return {
                ...state,
                money: Math.round((state.money - plantingCost) * 100) / 100,
                fields: newFields,
                notifications: [`🌱 Planted ${crop.name} on Field ${fieldId + 1}! Cost: ₹${plantingCost.toLocaleString()}`],
                currentScreen: SCREENS.GAME,
            };
        }

        // ==================== HARVEST ====================
        case Actions.HARVEST_FIELD: {
            const { fieldId } = action.payload;
            const field = state.fields[fieldId];

            if (!field || (field.status !== FIELD_STATES.MATURE && field.status !== FIELD_STATES.OVERRIPE)) {
                return {
                    ...state,
                    notifications: ['❌ This field is not ready to harvest.'],
                };
            }

            // Calculate yield
            const harvestResult = calculateYield(field, state.season);

            // Overripe penalty: reduce yield by 50%
            const yieldMultiplier = field.status === FIELD_STATES.OVERRIPE ? 0.5 : 1.0;
            const finalYield = Math.round(harvestResult.yield * yieldMultiplier);

            if (finalYield <= 0) {
                // Reset field, nothing to harvest
                const newFields = state.fields.map((f, i) => i === fieldId ? resetField(f) : f);
                return {
                    ...state,
                    fields: newFields,
                    notifications: ['❌ Crop yield is too low, nothing to harvest.'],
                };
            }

            // Add to storage
            const storageResult = addToStorage(
                state.storage,
                field.cropType,
                finalYield,
                harvestResult.quality,
                state.storageCapacity
            );

            // Reset field
            const newFields = state.fields.map((f, i) => i === fieldId ? resetField(f) : f);

            const notifications = [storageResult.notification];
            if (!storageResult.success) {
                notifications.unshift(`🌾 Harvested ${finalYield} kg of ${field.cropType} (Quality: ${harvestResult.quality}%)`);
            }

            return {
                ...state,
                fields: newFields,
                storage: storageResult.storage,
                notifications,
            };
        }

        // ==================== SELLING ====================
        case Actions.SELL_TO_MARKET: {
            const { storageItemId, marketId } = action.payload;
            const item = state.storage.find(s => s.id === storageItemId);
            const market = getMarketById(marketId);

            if (!item || !market) {
                return { ...state, notifications: ['❌ Invalid sale request.'] };
            }

            const effectiveQty = getEffectiveQuantity(item);
            if (effectiveQty <= 0) {
                return { ...state, notifications: ['❌ This item has fully spoiled.'] };
            }

            // Get offered price
            const priceResult = calculateOfferedPrice(
                state.marketPrices[market.id]?.[item.cropType] || 0,
                state.day,
                market.phaseOffset,
                state.reputation
            );

            // Calculate transport cost
            const transportResult = calculateTransportCost(market, effectiveQty);

            // Initiate transport
            const transport = initiateTransport(
                item.cropType,
                effectiveQty,
                item.quality,
                item.currentSpoilage,
                market.id,
                priceResult.offeredPrice,
                transportResult.transportCost,
                state.weather
            );

            if (!transport) {
                return { ...state, notifications: ['❌ Failed to initiate transport.'] };
            }

            // Remove item from storage
            const newStorage = removeFromStorage(state.storage, storageItemId);

            return {
                ...state,
                storage: newStorage,
                activeTransports: [...state.activeTransports, transport],
                notifications: [
                    `🚚 Shipping ${Math.round(effectiveQty)} kg of ${item.cropType} to ${market.name}! ETA: ${transport.totalTravelDays} day(s)`,
                ],
                currentScreen: SCREENS.GAME,
            };
        }

        // ==================== ECONOMY ====================
        case Actions.TAKE_LOAN: {
            const { amount } = action.payload;
            const result = takeLoan(state.loanBalance, amount, state.money);
            return {
                ...state,
                loanBalance: result.loanBalance,
                money: result.money,
                notifications: [`🏦 Loan of ₹${amount.toLocaleString()} approved! Balance: ₹${result.loanBalance.toLocaleString()}`],
            };
        }

        case Actions.REPAY_LOAN: {
            const { amount } = action.payload;
            const result = repayLoan(state.loanBalance, amount, state.money);
            return {
                ...state,
                loanBalance: result.loanBalance,
                money: result.money,
                notifications: [result.notification],
            };
        }

        case Actions.BUY_FIELD: {
            if (state.fields.length >= MAX_FIELDS) {
                return { ...state, notifications: [`❌ Maximum ${MAX_FIELDS} fields allowed.`] };
            }
            if (state.money < FIELD_COST) {
                return { ...state, notifications: [`❌ Need ₹${FIELD_COST.toLocaleString()} to buy a field.`] };
            }
            const newField = createEmptyField(state.fields.length, STARTING_FIELD_CAPACITY);
            return {
                ...state,
                money: state.money - FIELD_COST,
                fields: [...state.fields, newField],
                notifications: [`🏗️ New field purchased! (₹${FIELD_COST.toLocaleString()}) — Total: ${state.fields.length + 1} fields`],
            };
        }

        case Actions.UPGRADE_STORAGE: {
            if (state.storageCapacity >= MAX_STORAGE_CAPACITY) {
                return { ...state, notifications: [`❌ Storage already at maximum (${MAX_STORAGE_CAPACITY} kg).`] };
            }
            if (state.money < STORAGE_UPGRADE_COST) {
                return { ...state, notifications: [`❌ Need ₹${STORAGE_UPGRADE_COST.toLocaleString()} to upgrade storage.`] };
            }
            const newCapacity = Math.min(state.storageCapacity + STORAGE_UPGRADE_AMOUNT, MAX_STORAGE_CAPACITY);
            return {
                ...state,
                money: state.money - STORAGE_UPGRADE_COST,
                storageCapacity: newCapacity,
                notifications: [`📦 Storage upgraded! Capacity: ${newCapacity.toLocaleString()} kg`],
            };
        }

        // ==================== UI STATE ====================
        case Actions.SET_SCREEN: {
            return {
                ...state,
                currentScreen: action.payload.screen,
                notifications: [],
            };
        }

        case Actions.SELECT_FIELD: {
            return {
                ...state,
                selectedFieldId: action.payload.fieldId,
            };
        }

        case Actions.DISMISS_NOTIFICATION: {
            const newNotifs = state.notifications.filter((_, i) => i !== action.payload.index);
            return { ...state, notifications: newNotifs };
        }

        case Actions.CLEAR_NOTIFICATIONS: {
            return { ...state, notifications: [] };
        }

        // ==================== GAME MANAGEMENT ====================
        case Actions.NEW_GAME: {
            return createInitialState();
        }

        case Actions.START_CONFIGURED: {
            return createConfiguredState(action.payload);
        }

        case Actions.RESET_GAME: {
            return {
                ...createInitialState(),
                currentScreen: SCREENS.TITLE,
            };
        }

        case Actions.UPDATE_API_DATA: {
            const updates = {};
            if (action.payload.weather) updates.weather = action.payload.weather;
            if (action.payload.exchangeRate) updates.exchangeRate = action.payload.exchangeRate;
            if (action.payload.marketPrices) updates.marketPrices = action.payload.marketPrices;
            if (action.payload.location) updates.location = action.payload.location;
            if (action.payload.weatherFeatures) updates.weatherFeatures = action.payload.weatherFeatures;
            if (action.payload.soilType) updates.soilType = action.payload.soilType;
            if (action.payload.irrigationType) updates.irrigationType = action.payload.irrigationType;
            return { ...state, ...updates };
        }

        default:
            return state;
    }
}
