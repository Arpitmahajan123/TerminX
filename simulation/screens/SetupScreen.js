/**
 * SetupScreen.js - Professional farm setup with Visual Crossing + ML inputs
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { useGame } from '../state/GameContext';
import ActionButton from '../components/ActionButton';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { geocodeCityVC, fetchWeatherTimeline } from '../services/visualCrossing';
import { computeFeatures, mapConditionToWeather } from '../ml/featureEngine';
import { fetchExchangeRate } from '../services/exchangeAPI';
import { generateRealPrices } from '../services/priceAPI';
import { t, setLanguage, getLanguage, isHindi } from '../i18n/lang';

const PRESETS = [
    { money: 50000, acres: 2, storage: 3000 },
    { money: 100000, acres: 3, storage: 5000 },
    { money: 200000, acres: 5, storage: 8000 },
];

const SOIL_TYPES = ['Loamy', 'Clay', 'Sandy', 'Black Cotton', 'Alluvial'];
const IRRIG_TYPES = ['Rainfed', 'Canal', 'Borewell', 'Drip', 'Sprinkler'];

export default function SetupScreen() {
    const { dispatch } = useGame();
    const [money, setMoney] = useState('100000');
    const [acres, setAcres] = useState('3');
    const [storage, setStorage] = useState('5000');
    const [city, setCity] = useState('');
    const [gpsCoords, setGpsCoords] = useState(null);
    const [soilType, setSoilType] = useState('Loamy');
    const [irrigationType, setIrrigationType] = useState('Rainfed');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lang, setLang] = useState(getLanguage());

    // Auto-fill city from GPS
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { setCity('Nagpur'); return; }
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
                    { headers: { 'User-Agent': 'AgriChainApp/1.0' } }
                );
                const data = await res.json();
                const addr = data.address || {};
                const name = addr.city || addr.town || addr.village || addr.county || 'Nagpur';
                setCity(name);
            } catch {
                setCity('Nagpur');
            }
        })();
    }, []);

    const moneyVal = parseInt(money) || 0;
    const acresVal = parseFloat(acres) || 0;
    const storageVal = parseInt(storage) || 0;
    const fieldCount = Math.max(1, Math.floor(acresVal));
    const capacityPerField = Math.round((acresVal / fieldCount) * 1000);
    const isValid = moneyVal >= 10000 && acresVal >= 0.5 && storageVal >= 500 && city.trim().length > 0;
    const hi = isHindi();

    const toggleLang = () => {
        const next = lang === 'en' ? 'hi' : 'en';
        setLanguage(next);
        setLang(next);
    };

    const applyPreset = (p) => {
        setMoney(String(p.money));
        setAcres(String(p.acres));
        setStorage(String(p.storage));
    };

    const handleStart = async () => {
        setLoading(true);
        setError('');
        try {
            // Geocode using Visual Crossing
            const geo = await geocodeCityVC(city.trim());
            if (!geo) { setError(t('cityNotFound')); setLoading(false); return; }

            // Fetch weather from Visual Crossing
            const weatherData = await fetchWeatherTimeline(geo.lat, geo.lon);
            const features = computeFeatures(weatherData.days);
            const currentWeather = weatherData.days[0] ? mapConditionToWeather(weatherData.days[0].icon) : 'Sunny';

            const exchangeRate = await fetchExchangeRate();
            const marketPrices = generateRealPrices(1);

            dispatch({
                type: Actions.START_CONFIGURED,
                payload: { money: moneyVal, fields: fieldCount, fieldCapacity: capacityPerField, storageCapacity: storageVal },
            });
            dispatch({
                type: Actions.UPDATE_API_DATA,
                payload: {
                    weather: currentWeather,
                    exchangeRate,
                    marketPrices,
                    location: { city: geo.name, lat: geo.lat, lon: geo.lon },
                    weatherFeatures: features,
                    soilType: soilType.toLowerCase(),
                    irrigationType: irrigationType.toLowerCase(),
                },
            });
            dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });
        } catch (e) { setError(t('networkError')); }
        setLoading(false);
    };

    const goBack = () => dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.TITLE } });

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.headerTitle}>⚙️ {t('setupTitle')}</Text>
                <TouchableOpacity onPress={toggleLang} style={styles.langBtn}><Text style={styles.langText}>{t('langSwitch')}</Text></TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.section}>{t('quickPresets')}</Text>
                <View style={styles.presetRow}>
                    {PRESETS.map((p, i) => (
                        <ActionButton key={i} title={[t('smallFarm'), t('mediumFarm'), t('largeFarm')][i]}
                            onPress={() => applyPreset(p)} variant="dark" size="small" style={{ flex: 1 }} />
                    ))}
                </View>

                <Text style={styles.section}>📍 {t('yourLocation')}</Text>
                <InputRow emoji="🌍" label={t('cityName')} hint={t('cityHint')} value={city} onChange={setCity} />

                <Text style={styles.section}>💰 {t('yourParams')}</Text>
                <InputRow emoji="💰" label={t('startingMoney')} hint={t('howMuchMoney')} value={money} onChange={setMoney} numeric />
                <InputRow emoji="🌾" label={t('farmSize')} hint={t('oneAcre')} value={acres} onChange={setAcres} numeric />
                <InputRow emoji="📦" label={t('storageCapacity')} hint={t('warehouseSize')} value={storage} onChange={setStorage} numeric />

                {/* ML Model Inputs */}
                <Text style={styles.section}>🧪 {hi ? 'AI मॉडल इनपुट' : 'AI Model Inputs'}</Text>
                <Text style={styles.selectLabel}>🌱 {hi ? 'मिट्टी का प्रकार' : 'Soil Type'}</Text>
                <View style={styles.chipRow}>
                    {SOIL_TYPES.map(s => (
                        <TouchableOpacity key={s} style={[styles.chip, soilType === s && styles.chipActive]} onPress={() => setSoilType(s)}>
                            <Text style={[styles.chipText, soilType === s && styles.chipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.selectLabel}>💧 {hi ? 'सिंचाई प्रकार' : 'Irrigation Type'}</Text>
                <View style={styles.chipRow}>
                    {IRRIG_TYPES.map(s => (
                        <TouchableOpacity key={s} style={[styles.chip, irrigationType === s && styles.chipActive]} onPress={() => setIrrigationType(s)}>
                            <Text style={[styles.chipText, irrigationType === s && styles.chipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>📋 {t('farmSummary')}</Text>
                    <Row label={t('startingCapital')} val={`₹${moneyVal.toLocaleString()}`} />
                    <Row label={t('location')} val={city || '—'} />
                    <Row label={t('fields')} val={`${fieldCount}`} />
                    <Row label={t('capacityPerField')} val={`${capacityPerField} kg`} />
                    <Row label={t('totalGrowCapacity')} val={`${fieldCount * capacityPerField} kg`} />
                    <Row label={t('storage')} val={`${storageVal.toLocaleString()} kg`} />
                    <Row label={hi ? 'मिट्टी' : 'Soil'} val={soilType} />
                    <Row label={hi ? 'सिंचाई' : 'Irrigation'} val={irrigationType} />
                    <Text style={styles.apiNote}>🌐 Visual Crossing API • AI Weather Intelligence</Text>
                </View>

                {error ? <Text style={styles.err}>⚠️ {error}</Text> : null}
                {!isValid && <Text style={styles.err}>⚠️ {t('minRequired')}</Text>}

                <ActionButton title={loading ? t('loadingData') : t('startSimulation')} onPress={handleStart}
                    variant="primary" size="large" disabled={!isValid || loading} style={{ width: '100%', marginTop: 8 }} />

                {loading && <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 12 }} />}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function InputRow({ emoji, label, hint, value, onChange, numeric }) {
    return (
        <View style={styles.inputCard}>
            <Text style={styles.inputEmoji}>{emoji}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{label}</Text>
                <Text style={styles.inputHint}>{hint}</Text>
            </View>
            <TextInput style={styles.input} value={value} onChangeText={onChange}
                keyboardType={numeric ? 'numeric' : 'default'} placeholderTextColor="#546E7A" />
        </View>
    );
}

function Row({ label, val }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowVal}>{val}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.4)', borderBottomWidth: 1, borderBottomColor: '#1B3A4B',
    },
    headerTitle: { fontSize: 14, fontWeight: '800', color: '#B0BEC5' },
    langBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
    langText: { fontSize: 12, fontWeight: '700', color: '#66BB6A' },
    scroll: { flex: 1 },
    scrollContent: { padding: 14, paddingBottom: 40 },
    section: { fontSize: 12, fontWeight: '700', color: '#66BB6A', marginBottom: 4, marginTop: 8 },
    presetRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    selectLabel: { fontSize: 11, fontWeight: '600', color: '#90A4AE', marginTop: 4, marginBottom: 4 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
    chip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: { backgroundColor: 'rgba(46,125,50,0.2)', borderColor: '#66BB6A' },
    chipText: { fontSize: 10, color: '#78909C', fontWeight: '600' },
    chipTextActive: { color: '#66BB6A' },
    inputCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 8,
        marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    inputEmoji: { fontSize: 18, marginRight: 8 },
    inputLabel: { fontSize: 11, fontWeight: '700', color: '#CFD8DC' },
    inputHint: { fontSize: 8, color: '#546E7A' },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
        fontSize: 13, fontWeight: '700', color: '#66BB6A', textAlign: 'center',
        borderWidth: 1, borderColor: 'rgba(102,187,106,0.2)', minWidth: 80,
    },
    summary: {
        backgroundColor: 'rgba(46,125,50,0.08)', borderRadius: 10, padding: 10,
        marginVertical: 6, borderWidth: 1, borderColor: 'rgba(46,125,50,0.2)',
    },
    summaryTitle: { fontSize: 12, fontWeight: '800', color: '#66BB6A', marginBottom: 4, textAlign: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    rowLabel: { fontSize: 10, color: '#78909C' },
    rowVal: { fontSize: 11, fontWeight: '700', color: '#CFD8DC' },
    apiNote: { fontSize: 8, color: '#2E7D32', textAlign: 'center', marginTop: 4 },
    err: { fontSize: 10, color: '#FF9800', textAlign: 'center', marginVertical: 3 },
});
