/**
 * colors.js - Game color palette constants
 * Centralized color definitions for consistent theming across all components.
 */

export const COLORS = {
    // === Primary Theme ===
    primary: '#2E7D32',        // Rich green - main brand color
    primaryDark: '#1B5E20',    // Dark green
    primaryLight: '#4CAF50',   // Light green
    accent: '#FF9800',         // Orange accent
    accentDark: '#F57C00',     // Dark orange

    // === Background ===
    bgDark: '#1a1a2e',         // Deep navy - main background
    bgMedium: '#16213e',       // Slightly lighter navy
    bgLight: '#0f3460',        // Card backgrounds
    bgCard: '#1e2a4a',         // UI card background
    bgOverlay: 'rgba(0,0,0,0.7)', // Modal overlay

    // === Text ===
    textPrimary: '#FFFFFF',    // White text
    textSecondary: '#B0BEC5',  // Gray text
    textMuted: '#607D8B',      // Muted text
    textDark: '#1a1a2e',       // Dark text (for light backgrounds)

    // === Money / Economy ===
    moneyGreen: '#4CAF50',     // Positive money
    moneyRed: '#F44336',       // Negative money / loss
    moneyYellow: '#FFC107',    // Warning / marginal

    // === Field Status Colors ===
    fieldEmpty: '#8B7355',     // Brown dirt
    fieldPlanted: '#6B8E23',   // Olive with seed
    fieldGrowing: '#228B22',   // Forest green
    fieldMature: '#FFD700',    // Gold — ready to harvest
    fieldOverripe: '#FF8C00',  // Dark orange — getting bad
    fieldDead: '#4A4A4A',      // Gray — dead crop

    // === Weather Overlays ===
    weatherSunny: 'rgba(255,250,205,0.12)',    // Pale yellow tint
    weatherRain: 'rgba(65,105,225,0.25)',      // Blue tint
    weatherHeatwave: 'rgba(255,99,71,0.15)',   // Red shimmer
    weatherStorm: 'rgba(0,0,0,0.37)',          // Dark overlay

    // === UI Elements ===
    border: '#2a3a5c',         // Subtle borders
    borderLight: '#3a4a6c',    // Lighter borders
    success: '#4CAF50',        // Green success
    warning: '#FFC107',        // Yellow warning
    danger: '#F44336',         // Red danger
    info: '#2196F3',           // Blue info

    // === Market Colors ===
    marketLocal: '#26A69A',    // Teal for local market
    marketExport: '#AB47BC',   // Purple for export market

    // === Progress Bar ===
    progressBg: '#37474F',     // Progress bar background
    progressFill: '#4CAF50',   // Progress bar fill
    progressSpoilage: '#FF5722', // Spoilage progress fill

    // === Reputation ===
    repHigh: '#FFD700',        // Gold star (high rep)
    repMid: '#FFA726',         // Orange (mid rep)
    repLow: '#EF5350',         // Red (low rep)
};

export default COLORS;
