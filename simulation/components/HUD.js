/**
 * HUD.js - Compact responsive status bar
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useGame } from '../state/GameContext';
import { getWeatherEmoji } from '../engine/weatherEngine';
import { t, isHindi as checkHindi } from '../i18n/lang';

const { width } = Dimensions.get('window');
const isSmall = width < 360;

/**
 * Compute real calendar date from game's startDate + day offset.
 */
function getGameDate(startDateISO, day) {
    const start = startDateISO ? new Date(startDateISO) : new Date();
    const d = new Date(start);
    d.setDate(d.getDate() + (day - 1));
    return d;
}

const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT_HI = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];

function formatShortDate(date, hindi) {
    const d = date.getDate();
    const m = date.getMonth();
    if (hindi) return `${d} ${MONTH_SHORT_HI[m]}`;
    return `${d} ${MONTH_SHORT_EN[m]}`;
}

export default function HUD() {
    const { state } = useGame();
    const moneyStr = state.money >= 100000
        ? `₹${(state.money / 100000).toFixed(1)}L`
        : `₹${Math.round(state.money).toLocaleString()}`;
    const moneyColor = state.money < 10000 ? '#EF5350' : '#66BB6A';

    const gameDate = getGameDate(state.startDate, state.day);
    const hindi = checkHindi();
    const dateStr = formatShortDate(gameDate, hindi);

    return (
        <View style={styles.bar}>
            <Badge icon="📅" val={dateStr} />
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
