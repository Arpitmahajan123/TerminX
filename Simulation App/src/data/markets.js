/**
 * markets.js - Market definitions with Hindi
 */

const MARKETS = [
    {
        id: 'localA',
        name: 'Local Mandi',
        nameHi: 'स्थानीय मंडी',
        emoji: '🏪',
        distance: 20,
        costPerKm: 2,
        volatility: 0.05,
        currency: 'INR',
        phaseOffset: 0,
    },
    {
        id: 'localB',
        name: 'District Market',
        nameHi: 'ज़िला बाज़ार',
        emoji: '🏬',
        distance: 50,
        costPerKm: 2,
        volatility: 0.08,
        currency: 'INR',
        phaseOffset: Math.PI / 3,
    },
    {
        id: 'export',
        name: 'Export Market',
        nameHi: 'निर्यात बाज़ार',
        emoji: '🌍',
        distance: 150,
        costPerKm: 3,
        volatility: 0.12,
        currency: 'USD',
        phaseOffset: Math.PI,
    },
];

export function getMarketById(id) {
    return MARKETS.find(m => m.id === id);
}

export default MARKETS;
