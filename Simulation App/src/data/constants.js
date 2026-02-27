/**
 * constants.js - Game balance constants
 * All magic numbers live here. No hardcoded numbers in engine or component files.
 */

// === Player Starting State ===
export const STARTING_MONEY = 100000;        // ₹1,00,000
export const STARTING_FIELDS = 3;            // Number of fields
export const STARTING_FIELD_CAPACITY = 1000; // kg per field
export const STARTING_STORAGE_CAPACITY = 5000; // kg
export const STARTING_REPUTATION = 50;       // 0-100 scale
export const STARTING_LOAN_BALANCE = 0;
export const STARTING_EXCHANGE_RATE = 83.50; // ₹ per $1 USD

// === Field & Storage Limits ===
export const MAX_FIELDS = 8;
export const MAX_STORAGE_CAPACITY = 15000;   // kg
export const FIELD_COST = 30000;             // ₹30,000 per new field
export const STORAGE_UPGRADE_COST = 20000;   // ₹20,000 per upgrade
export const STORAGE_UPGRADE_AMOUNT = 2000;  // +2000 kg per upgrade

// === Seasons ===
export const SEASON_LENGTH = 60;             // Days per season
export const SEASONS = ['Kharif', 'Rabi'];

// === Loan System ===
export const LOAN_AMOUNTS = [25000, 50000, 100000];
export const BASE_DAILY_INTEREST_RATE = 0.0005;  // 0.05% base
export const REPUTATION_INTEREST_MODIFIER = 0.00002; // per reputation point deficit
export const MAX_LOAN_BALANCE = 500000;      // Game over threshold: ₹5,00,000

// === Exchange Rate ===
export const EXCHANGE_RATE_VOLATILITY = 0.02; // ±2%
export const EXCHANGE_RATE_MIN = 78.0;
export const EXCHANGE_RATE_MAX = 90.0;

// === Transport ===
export const TRUCK_CAPACITY = 500;           // kg per truck
export const SPEED_KM_PER_DAY = 100;         // Base travel speed

// === Game Over / Win ===
export const WIN_MONEY_THRESHOLD = 1000000;  // ₹10,00,000
export const SEASON_MISMATCH_PENALTY = 0.6;  // 40% yield reduction

// === Crop Field States ===
export const FIELD_STATES = {
    EMPTY: 'EMPTY',
    PLANTED: 'PLANTED',
    GROWING: 'GROWING',
    MATURE: 'MATURE',
    OVERRIPE: 'OVERRIPE',
    DEAD: 'DEAD',
};

// === Weather Types ===
export const WEATHER_TYPES = {
    SUNNY: 'Sunny',
    RAIN: 'Rain',
    HEATWAVE: 'Heatwave',
    STORM: 'Storm',
};

// === Weather Weights by Season ===
export const WEATHER_WEIGHTS = {
    Kharif: { Sunny: 30, Rain: 35, Heatwave: 15, Storm: 20 },
    Rabi: { Sunny: 45, Rain: 25, Heatwave: 20, Storm: 10 },
};

// === Weather Effects ===
export const WEATHER_EFFECTS = {
    Sunny: { growth: 0.00, spoilage: 0.00, transportDelay: 0.00, cropDamageChance: 0.00 },
    Rain: { growth: 0.20, spoilage: 0.10, transportDelay: 0.00, cropDamageChance: 0.00 },
    Heatwave: { growth: -0.15, spoilage: 0.25, transportDelay: 0.30, cropDamageChance: 0.00 },
    Storm: { growth: -0.30, spoilage: 0.40, transportDelay: 0.50, cropDamageChance: 0.10 },
};

// === Reputation Changes ===
export const REP_HIGH_QUALITY_SALE = 2;      // quality > 80%
export const REP_LOW_QUALITY_SALE = -3;      // quality < 50%
export const REP_EXPORT_SALE = 5;
export const REP_CROP_DIED = -5;
export const REP_ITEM_SPOILED = -3;
export const REP_MIN = 0;
export const REP_MAX = 100;

// === Market Demand Cycle ===
export const DEMAND_CYCLE_PERIOD = 30;       // days
export const DEMAND_AMPLITUDE = 0.3;         // ±30% swing

// === Game Screens ===
export const SCREENS = {
    TITLE: 'title',
    SETUP: 'setup',
    GAME: 'game',
    PLANTING: 'planting',
    STORAGE: 'storage',
    MARKET: 'market',
    BANK: 'bank',
    WEATHER: 'weather',
    AI: 'ai',
    GAME_OVER: 'gameover',
};
