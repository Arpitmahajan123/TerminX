/**
 * HUD.js - Compact responsive status bar
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useGame } from '../state/GameContext';
import { getWeatherEmoji } from '../engine/weatherEngine';
import { t } from '../i18n/lang';

const { width } = Dimensions.get('window');
const isSmall = width < 360;

export default function HUD() {
    const { state } = useGame();
    const moneyStr = state.money >= 100000
        ? `₹${(state.money / 100000).toFixed(1)}L`
        : `₹${Math.round(state.money).toLocaleString()}`;
    const moneyColor = state.money < 10000 ? '#EF5350' : '#66BB6A';

    return (
        <View style={styles.bar}>
            <Badge icon="📅" val={`${state.day}`} />
            <Badge icon="🌿" val={state.season} />
            <Badge icon="💰" val={moneyStr} color={moneyColor} />
            <Badge icon={getWeatherEmoji(state.weather)} val={state.weather} />
            {state.location && <Badge icon="📍" val={state.location.city} />}
            <Badge icon="💱" val={`₹${state.exchangeRate}`} />
        </View>
    );
}

function Badge({ icon, val, color }) {
    return (
        <View style={styles.badge}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[styles.val, color && { color }]} numberOfLines={1}>{val}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row', backgroundColor: '#0A1628',
        paddingVertical: 4, paddingHorizontal: 2,
        justifyContent: 'space-evenly', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: '#1B3A4B',
    },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 2 },
    icon: { fontSize: isSmall ? 8 : 10 },
    val: { fontSize: isSmall ? 8 : 9, fontWeight: '700', color: '#B0BEC5', maxWidth: 55 },
});
