/**
 * economyEngine.js - Exchange rate, loans, and profit calculations
 * Pure logic — no React imports.
 */

import {
    EXCHANGE_RATE_VOLATILITY,
    EXCHANGE_RATE_MIN,
    EXCHANGE_RATE_MAX,
    BASE_DAILY_INTEREST_RATE,
    REPUTATION_INTEREST_MODIFIER,
} from '../data/constants';
import { randomInRange, clamp } from '../utils/random';

/**
 * Updates the INR/USD exchange rate for one day.
 * newRate = prevRate × (1 + randomInRange(-0.02, +0.02))
 * newRate = clamp(newRate, 78.0, 90.0)
 * @param {number} currentRate - Current exchange rate (₹ per $1)
 * @returns {number} Updated exchange rate
 */
export function updateExchangeRate(currentRate) {
    const change = randomInRange(-EXCHANGE_RATE_VOLATILITY, EXCHANGE_RATE_VOLATILITY);
    const newRate = currentRate * (1 + change);
    return Math.round(clamp(newRate, EXCHANGE_RATE_MIN, EXCHANGE_RATE_MAX) * 100) / 100;
}

/**
 * Processes daily loan interest accrual.
 * dailyRate = 0.0005 + max(0, 50 - reputation) × 0.00002
 * loanBalance = loanBalance × (1 + dailyRate)
 * @param {number} loanBalance - Current loan balance
 * @param {number} reputation - Player reputation (0-100)
 * @returns {{ loanBalance: number, interestCharged: number, dailyRate: number }}
 */
export function processLoan(loanBalance, reputation) {
    if (loanBalance <= 0) {
        return { loanBalance: 0, interestCharged: 0, dailyRate: 0 };
    }

    const dailyRate = BASE_DAILY_INTEREST_RATE + Math.max(0, 50 - reputation) * REPUTATION_INTEREST_MODIFIER;
    const interestCharged = loanBalance * dailyRate;
    const newBalance = Math.round((loanBalance * (1 + dailyRate)) * 100) / 100;

    return {
        loanBalance: newBalance,
        interestCharged: Math.round(interestCharged * 100) / 100,
        dailyRate,
    };
}

/**
 * Takes a new loan.
 * @param {number} currentBalance - Current loan balance
 * @param {number} amount - Loan amount to take
 * @param {number} currentMoney - Player's current money
 * @returns {{ loanBalance: number, money: number }}
 */
export function takeLoan(currentBalance, amount, currentMoney) {
    return {
        loanBalance: currentBalance + amount,
        money: currentMoney + amount,
    };
}

/**
 * Repays part or all of the loan.
 * @param {number} currentBalance - Current loan balance
 * @param {number} amount - Amount to repay
 * @param {number} currentMoney - Player's current money
 * @returns {{ loanBalance: number, money: number, success: boolean, notification: string }}
 */
export function repayLoan(currentBalance, amount, currentMoney) {
    if (amount > currentMoney) {
        return {
            loanBalance: currentBalance,
            money: currentMoney,
            success: false,
            notification: '❌ Not enough money to repay that amount.',
        };
    }

    const actualRepayment = Math.min(amount, currentBalance);
    return {
        loanBalance: Math.round((currentBalance - actualRepayment) * 100) / 100,
        money: Math.round((currentMoney - actualRepayment) * 100) / 100,
        success: true,
        notification: `🏦 Repaid ₹${actualRepayment.toLocaleString()}. Remaining: ₹${Math.round(currentBalance - actualRepayment).toLocaleString()}`,
    };
}

/**
 * Calculates profit breakdown for a sale.
 * @param {number} offeredPrice - Price per kg
 * @param {number} effectiveQuantity - Quantity after spoilage in kg
 * @param {number} quality - Quality percentage
 * @param {number} transportCost - Total transport cost
 * @param {string} currency - 'INR' or 'USD'
 * @param {number} exchangeRate - Current ₹/$ rate
 * @returns {{ revenue: number, transportCost: number, netProfit: number, revenueINR: number }}
 */
export function calculateProfit(offeredPrice, effectiveQuantity, quality, transportCost, currency, exchangeRate) {
    let revenue = offeredPrice * effectiveQuantity * (quality / 100);

    let revenueINR = revenue;
    if (currency === 'USD') {
        revenueINR = revenue * exchangeRate;
    }

    const netProfit = revenueINR - transportCost;

    return {
        revenue: Math.round(revenue * 100) / 100,
        transportCost,
        netProfit: Math.round(netProfit * 100) / 100,
        revenueINR: Math.round(revenueINR * 100) / 100,
    };
}
