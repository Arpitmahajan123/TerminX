/**
 * formatters.js - Display formatting utilities
 * Currency (₹, $) and percentage formatting helpers for the game UI.
 */

/**
 * Formats a number as Indian Rupees with the ₹ symbol.
 * Uses Indian numbering system (lakhs, crores).
 * @param {number} amount - The amount in INR
 * @param {boolean} [showDecimals=false] - Whether to show decimal places
 * @returns {string} Formatted currency string, e.g., "₹1,00,000"
 */
export function formatINR(amount, showDecimals = false) {
    if (amount === undefined || amount === null) return '₹0';
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);

    if (showDecimals) {
        return sign + '₹' + absAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    return sign + '₹' + Math.round(absAmount).toLocaleString('en-IN');
}

/**
 * Formats a number as US Dollars with the $ symbol.
 * @param {number} amount - The amount in USD
 * @returns {string} Formatted currency string, e.g., "$1,234.56"
 */
export function formatUSD(amount) {
    if (amount === undefined || amount === null) return '$0';
    return '$' + Math.round(amount).toLocaleString('en-US');
}

/**
 * Formats a number as a percentage string.
 * @param {number} value - The percentage value (0-100)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage, e.g., "85.5%"
 */
export function formatPercent(value, decimals = 1) {
    if (value === undefined || value === null) return '0%';
    return value.toFixed(decimals) + '%';
}

/**
 * Formats weight in kilograms.
 * @param {number} kg - Weight in kilograms
 * @returns {string} Formatted weight, e.g., "1,200 kg"
 */
export function formatKg(kg) {
    if (kg === undefined || kg === null) return '0 kg';
    return Math.round(kg).toLocaleString('en-IN') + ' kg';
}

/**
 * Formats the exchange rate.
 * @param {number} rate - INR per USD rate
 * @returns {string} Formatted rate, e.g., "₹83.50/$"
 */
export function formatExchangeRate(rate) {
    if (rate === undefined || rate === null) return '₹0/$';
    return '₹' + rate.toFixed(2) + '/$';
}

/**
 * Returns a compact number format for large values.
 * @param {number} value - The number to format
 * @returns {string} Compact string like "1.5L" or "2.3Cr"
 */
export function formatCompact(value) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 10000000) return sign + (abs / 10000000).toFixed(1) + 'Cr';
    if (abs >= 100000) return sign + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + 'K';
    return sign + Math.round(abs).toString();
}
