/**
 * GameScreen.js - Responsive simulation dashboard
 */
import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useGame } from '../state/GameContext';
import HUD from '../components/HUD';
import FarmView from '../components/FarmView';
import TransportStatus from '../components/TransportStatus';
import NotificationBar from '../components/NotificationBar';
import ActionButton from '../components/ActionButton';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { fetchGameWeather } from '../services/weatherAPI';
import { fetchExchangeRate } from '../services/exchangeAPI';
import { generateRealPrices } from '../services/priceAPI';
import { t } from '../i18n/lang';

const { width } = Dimensions.get('window');
const btnSize = width < 360 ? 34 : 38;

export default function GameScreen() {
    const { state, dispatch } = useGame();
    const nav = (s) => dispatch({ type: Actions.SET_SCREEN, payload: { screen: s } });
    const dismissNotif = (i) => dispatch({ type: Actions.DISMISS_NOTIFICATION, payload: { index: i } });

    // Advance 1 day + refresh API data
    const advanceOneDay = useCallback(async () => {
        dispatch({ type: Actions.NEXT_DAY });
        try {
            const newDay = state.day + 1;
            let weather;
            if (state.location?.lat && state.location?.lon) {
                weather = await fetchGameWeather(state.location.lat, state.location.lon);
            }
            let exchangeRate;
            if (newDay % 5 === 0) {
                exchangeRate = await fetchExchangeRate();
            }
            const marketPrices = generateRealPrices(newDay);
            dispatch({
                type: Actions.UPDATE_API_DATA,
                payload: { ...(weather ? { weather } : {}), ...(exchangeRate ? { exchangeRate } : {}), marketPrices },
            });
        } catch (e) { /* fallback */ }
    }, [state.day, state.location, dispatch]);

    // Skip N days at once
    const skipDays = useCallback(async (n) => {
        for (let i = 0; i < n; i++) {
            dispatch({ type: Actions.NEXT_DAY });
        }
        // Refresh API data at the end only
        try {
            const newDay = state.day + n;
            let weather;
            if (state.location?.lat && state.location?.lon) {
                weather = await fetchGameWeather(state.location.lat, state.location.lon);
            }
            const exchangeRate = await fetchExchangeRate();
            const marketPrices = generateRealPrices(newDay);
            dispatch({
                type: Actions.UPDATE_API_DATA,
                payload: { weather, exchangeRate, marketPrices },
            });
        } catch (e) { /* fallback */ }
    }, [state.day, state.location, dispatch]);

    const handleReset = () => dispatch({ type: Actions.RESET_GAME });

    return (
        <View style={styles.container}>
            <HUD />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <FarmView />
                <TransportStatus />
            </ScrollView>
            <NotificationBar notifications={state.notifications} onDismiss={dismissNotif} />

            {/* Row 1: Navigation */}
            <View style={styles.navRow}>
                <ActionButton title="🧠" onPress={() => nav(SCREENS.AI)} variant="dark" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
                <ActionButton title="🌤️" onPress={() => nav(SCREENS.WEATHER)} variant="dark" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
                <ActionButton title="🌱" onPress={() => nav(SCREENS.PLANTING)} variant="dark" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
                <ActionButton title="📦" onPress={() => nav(SCREENS.STORAGE)} variant="dark" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
                <ActionButton title="🏪" onPress={() => nav(SCREENS.MARKET)} variant="dark" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
                <ActionButton title="🏦" onPress={() => nav(SCREENS.BANK)} variant="dark" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
            </View>

            {/* Row 2: Day Controls */}
            <View style={styles.dayRow}>
                <ActionButton title="🔄" onPress={handleReset} variant="danger" size="small" style={[styles.navBtn, { width: btnSize, height: btnSize }]} />
                <ActionButton title="+1" onPress={advanceOneDay} variant="primary" size="small" style={styles.dayBtn} />
                <ActionButton title="+7" onPress={() => skipDays(7)} variant="accent" size="small" style={styles.dayBtn} />
                <ActionButton title="+30" onPress={() => skipDays(30)} variant="gold" size="small" style={styles.dayBtn} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F2027' },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 6 },
    navRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
        paddingVertical: 3, paddingHorizontal: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderTopWidth: 1, borderTopColor: '#1B3A4B',
    },
    dayRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 4, paddingHorizontal: 6, gap: 6,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderTopWidth: 1, borderTopColor: '#1B3A4B',
    },
    navBtn: { paddingHorizontal: 0, paddingVertical: 0 },
    dayBtn: { flex: 1, height: btnSize },
});
