/**
 * commonStyles.js - Shared StyleSheet definitions
 * Reusable styles used across multiple components.
 */

import { StyleSheet } from 'react-native';
import COLORS from './colors';
import FONTS from './typography';

const commonStyles = StyleSheet.create({
    // === Containers ===
    screenContainer: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 12,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },

    // === Text ===
    title: {
        fontSize: FONTS.sizeTitle,
        fontWeight: FONTS.weightBold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONTS.sizeXL,
        fontWeight: FONTS.weightSemiBold,
        color: COLORS.textPrimary,
    },
    bodyText: {
        fontSize: FONTS.sizeMD,
        color: COLORS.textSecondary,
    },
    label: {
        fontSize: FONTS.sizeSM,
        color: COLORS.textMuted,
        fontWeight: FONTS.weightMedium,
    },
    valueText: {
        fontSize: FONTS.sizeMD,
        fontWeight: FONTS.weightBold,
        color: COLORS.textPrimary,
    },
    sectionHeader: {
        fontSize: FONTS.sizeLG,
        fontWeight: FONTS.weightBold,
        color: COLORS.textPrimary,
        marginHorizontal: 16,
        marginVertical: 10,
    },

    // === Separator ===
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },

    // === Flex Helpers ===
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    // === Modal ===
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.bgOverlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.bgMedium,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    // === Empty State ===
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: FONTS.sizeLG,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 12,
    },
});

export default commonStyles;
