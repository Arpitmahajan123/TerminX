/**
 * WeatherScreen.js - Professional weather intelligence with Hindi
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useGame } from '../state/GameContext';
import WeatherForecast from '../components/WeatherForecast';
import ActionButton from '../components/ActionButton';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { fetchFullWeatherData } from '../services/weatherAPI';
import { t } from '../i18n/lang';

export default function WeatherScreen() {
    const { state, dispatch } = useGame();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const goBack = () => dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });

    useEffect(() => { loadWeatherData(); }, []);

    const loadWeatherData = async () => {
        setLoading(true);
        setError('');
        try {
            if (!state.location?.lat) { setError('No location set.'); setLoading(false); return; }
            const data = await fetchFullWeatherData(state.location.lat, state.location.lon);
            setWeatherData(data);
            if (data.current?.weather) {
                dispatch({ type: Actions.UPDATE_API_DATA, payload: { weather: data.current.weather } });
            }
        } catch (e) { setError('Failed to fetch weather data.'); }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.title}>🌤️ {t('weather')} {state.location ? `• ${state.location.city}` : ''}</Text>
                <ActionButton title="🔄" onPress={loadWeatherData} variant="dark" size="small" />
            </View>
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadCenter}>
                        <ActivityIndicator size="large" color="#66BB6A" />
                        <Text style={styles.loadText}>📡 {t('fetchingWeather')}</Text>
                    </View>
                ) : error ? (
                    <View style={styles.loadCenter}>
                        <Text style={styles.errText}>⚠️ {error}</Text>
                        <ActionButton title={t('retry')} onPress={loadWeatherData} variant="primary" size="small" style={{ marginTop: 12 }} />
                    </View>
                ) : (
                    <WeatherForecast data={weatherData} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderBottomWidth: 1, borderBottomColor: '#1B3A4B' },
    title: { fontSize: 14, fontWeight: '800', color: '#B0BEC5' },
    content: { flex: 1, padding: 12 },
    loadCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadText: { fontSize: 13, color: '#66BB6A', marginTop: 12 },
    errText: { fontSize: 13, color: '#FF9800' },
});
