/**
 * exchangeAPI.js - Fetch real USD/INR exchange rate
 * Uses ExchangeRate-API (free, no key required)
 */

const API_URL = 'https://open.er-api.com/v6/latest/USD';

/**
 * Fetches the current USD to INR exchange rate.
 * @returns {Promise<number>} Exchange rate (₹ per $1 USD)
 */
export async function fetchExchangeRate() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.result === 'success' && data.rates?.INR) {
            return Math.round(data.rates.INR * 100) / 100;
        }
        return 83.50; // Fallback
    } catch (e) {
        console.warn('Exchange rate fetch failed:', e.message);
        return 83.50; // Fallback
    }
}

/**
 * Fetches multiple currency rates for display.
 * @returns {Promise<{ INR: number, EUR: number, GBP: number }>}
 */
export async function fetchAllRates() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.result === 'success') {
            return {
                INR: data.rates.INR || 83.50,
                EUR: data.rates.EUR || 0.92,
                GBP: data.rates.GBP || 0.79,
            };
        }
        return { INR: 83.50, EUR: 0.92, GBP: 0.79 };
    } catch (e) {
        return { INR: 83.50, EUR: 0.92, GBP: 0.79 };
    }
}
