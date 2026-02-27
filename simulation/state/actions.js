/**
 * actions.js - Action type constants for the game reducer
 * All action types dispatched by components to update game state.
 */

// === Time ===
export const NEXT_DAY = 'NEXT_DAY';

// === Planting ===
export const PLANT_CROP = 'PLANT_CROP';       // { fieldId, cropType }
export const HARVEST_FIELD = 'HARVEST_FIELD';  // { fieldId }

// === Market ===
export const SELL_TO_MARKET = 'SELL_TO_MARKET'; // { storageItemId, marketId }

// === Transport ===
export const COMPLETE_TRANSPORT = 'COMPLETE_TRANSPORT'; // { transportId }

// === Economy ===
export const TAKE_LOAN = 'TAKE_LOAN';           // { amount }
export const REPAY_LOAN = 'REPAY_LOAN';         // { amount }
export const BUY_FIELD = 'BUY_FIELD';
export const UPGRADE_STORAGE = 'UPGRADE_STORAGE';

// === UI State ===
export const SET_SCREEN = 'SET_SCREEN';           // { screen }
export const DISMISS_NOTIFICATION = 'DISMISS_NOTIFICATION'; // { index }
export const SELECT_FIELD = 'SELECT_FIELD';       // { fieldId }

// === Game Management ===
export const NEW_GAME = 'NEW_GAME';
export const START_CONFIGURED = 'START_CONFIGURED'; // { money, fields, fieldCapacity, storageCapacity }
export const RESET_GAME = 'RESET_GAME'; // Go back to title/setup
export const UPDATE_API_DATA = 'UPDATE_API_DATA'; // { weather?, exchangeRate?, marketPrices? }
export const CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS';
