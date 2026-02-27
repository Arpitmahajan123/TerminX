/**
 * initialState.js - Default WorldState
 * Starting game state with all initial values as specified.
 */

import {
    STARTING_MONEY,
    STARTING_FIELDS,
    STARTING_FIELD_CAPACITY,
    STARTING_STORAGE_CAPACITY,
    STARTING_REPUTATION,
    STARTING_LOAN_BALANCE,
    STARTING_EXCHANGE_RATE,
    SCREENS,
} from '../data/constants';
import { createEmptyField } from '../engine/cropEngine';
import { initializeMarketPrices } from '../engine/marketEngine';

/**
 * Creates the initial world state for a new game.
 * @returns {object} Initial WorldState
 */
export function createInitialState() {
    // Create starting fields
    const fields = [];
    for (let i = 0; i < STARTING_FIELDS; i++) {
        fields.push(createEmptyField(i, STARTING_FIELD_CAPACITY));
    }

    return makeState(STARTING_MONEY, fields, STARTING_STORAGE_CAPACITY, SCREENS.TITLE);
}

/**
 * Creates a configured world state with user-provided parameters.
 * @param {{ money: number, fields: number, fieldCapacity: number, storageCapacity: number }} config
 * @returns {object} Configured WorldState
 */
export function createConfiguredState(config) {
    const fields = [];
    for (let i = 0; i < config.fields; i++) {
        fields.push(createEmptyField(i, config.fieldCapacity));
    }
    return makeState(config.money, fields, config.storageCapacity, SCREENS.GAME);
}

/**
 * Internal helper to build state object.
 */
function makeState(money, fields, storageCapacity, startScreen) {
    return {
        day: 1,
        startDate: new Date().toISOString(),
        season: 'Kharif',
        weather: 'Sunny',
        weatherHistory: ['Sunny'],
        money,
        reputation: STARTING_REPUTATION,
        loanBalance: STARTING_LOAN_BALANCE,
        exchangeRate: STARTING_EXCHANGE_RATE,
        fields,
        storage: [],
        storageCapacity,
        marketPrices: initializeMarketPrices(),
        activeTransports: [],
        gameStatus: 'playing',
        gameOverReason: null,
        currentScreen: startScreen,
        selectedFieldId: null,
        notifications: startScreen === SCREENS.TITLE ? [] : ['🌾 Welcome! Tap an empty field to plant your first crop.'],
    };
}

const initialState = createInitialState();
export default initialState;
