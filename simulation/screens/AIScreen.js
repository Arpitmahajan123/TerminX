/**
 * AIScreen.js - AI Prediction Dashboard
 * Shows: Feature Analysis → ML Predictions → Recommendations
 * Full pipeline: Weather API → Features → ML → Advice
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useGame } from '../state/GameContext';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import ActionButton from '../components/ActionButton';
import { fetchWeatherTimeline } from '../services/visualCrossing';
import { computeFeatures, mapConditionToWeather } from '../ml/featureEngine';
import { predictAllCrops } from '../ml/mlPredictor';
import { generateRecommendations } from '../ml/recommendations';
import { isHindi, t } from '../i18n/lang';

export default function AIScreen() {
    const { state, dispatch } = useGame();
    const hi = isHindi();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const goBack = () => dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });

    useEffect(() => { loadPipeline(); }, []);

    const loadPipeline = async () => {
        setLoading(true);
        setError('');
        try {
            if (!state.location?.lat) { setError('No location'); setLoading(false); return; }

            // Step 1: Fetch weather
            const weather = await fetchWeatherTimeline(state.location.lat, state.location.lon);

            // Step 2: Feature engineering
            const features = computeFeatures(weather.days);

            // Step 3: ML prediction
            const predictions = predictAllCrops(features, {
                acres: state.fields?.length || 3,
                soilType: state.soilType || 'loamy',
                irrigationType: state.irrigationType || 'rainfed',
            });

            // Step 4: Recommendations
            const recommendations = generateRecommendations(features, predictions);

            // Update simulation weather
            if (weather.days[0]) {
                dispatch({
                    type: Actions.UPDATE_API_DATA,
                    payload: { weather: mapConditionToWeather(weather.days[0].icon) },
                });
            }

            setData({ weather, features, predictions, recommendations });
        } catch (e) {
            setError(e.message || 'Failed to load AI data');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                    <Text style={styles.title}>🧠 {hi ? 'AI विश्लेषण' : 'AI Analysis'}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#66BB6A" />
                    <Text style={styles.loadText}>🌐 {hi ? 'डेटा प्राप्त हो रहा है...' : 'Fetching weather data...'}</Text>
                    <Text style={styles.pipeText}>Weather API → Features → ML → Recommendations</Text>
                </View>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                    <Text style={styles.title}>🧠 AI</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.center}>
                    <Text style={styles.errText}>⚠️ {error}</Text>
                    <ActionButton title={t('retry')} onPress={loadPipeline} variant="primary" size="small" style={{ marginTop: 12 }} />
                </View>
            </View>
        );
    }

    const { features, predictions, recommendations, weather } = data;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.title}>🧠 {hi ? 'AI विश्लेषण' : 'AI Analysis'}</Text>
                <ActionButton title="🔄" onPress={loadPipeline} variant="dark" size="small" />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── PIPELINE STATUS ── */}
                <View style={styles.pipelineCard}>
                    <Text style={styles.pipeTitle}>⚡ {hi ? 'AI पाइपलाइन' : 'AI Pipeline'}</Text>
                    <View style={styles.pipeRow}>
                        <PipeStep icon="🌐" label={hi ? 'मौसम' : 'Weather'} status="✅" />
                        <Text style={styles.arrow}>→</Text>
                        <PipeStep icon="⚙️" label={hi ? 'फ़ीचर' : 'Features'} status="✅" />
                        <Text style={styles.arrow}>→</Text>
                        <PipeStep icon="🧠" label="ML" status="✅" />
                        <Text style={styles.arrow}>→</Text>
                        <PipeStep icon="💡" label={hi ? 'सलाह' : 'Advice'} status="✅" />
                    </View>
                    <Text style={styles.pipeSource}>Visual Crossing API • {state.location?.city || ''}</Text>
                </View>

                {/* ── WEATHER FEATURES ── */}
                <Text style={styles.section}>⚙️ {hi ? 'मौसम विशेषताएं' : 'Weather Features'}</Text>
                <View style={styles.featGrid}>
                    <FeatBadge label={hi ? 'औसत तापमान' : 'Avg Temp'} val={`${features.avg_temp_7d}°C`} color={features.heat_stress_score > 0.4 ? '#EF5350' : '#66BB6A'} />
                    <FeatBadge label={hi ? 'अधिकतम तापमान' : 'Max Temp'} val={`${features.max_temp_7d}°C`} color={features.max_temp_7d > 40 ? '#EF5350' : '#FFD740'} />
                    <FeatBadge label={hi ? 'नमी' : 'Humidity'} val={`${features.avg_humidity}%`} color={features.avg_humidity < 20 ? '#EF5350' : '#66BB6A'} />
                    <FeatBadge label={hi ? 'बारिश 7d' : 'Rain 7d'} val={`${features.total_rain_7d}mm`} color={features.flood_flag ? '#EF5350' : '#42A5F5'} />
                    <FeatBadge label={hi ? 'हवा' : 'Wind'} val={`${features.max_windgust}km/h`} color={features.high_wind_flag ? '#FF9800' : '#66BB6A'} />
                    <FeatBadge label="UV" val={`${features.avg_uvindex}`} color={features.high_uv_flag ? '#FF9800' : '#66BB6A'} />
                </View>

                {/* Flags */}
                <View style={styles.flagRow}>
                    {features.heatwave_flag ? <Flag text={hi ? '🔥 लू' : '🔥 Heatwave'} color="#EF5350" /> : null}
                    {features.drought_flag ? <Flag text={hi ? '🏜️ सूखा' : '🏜️ Drought'} color="#FF9800" /> : null}
                    {features.flood_flag ? <Flag text={hi ? '🌊 बाढ़' : '🌊 Flood'} color="#42A5F5" /> : null}
                    {features.high_wind_flag ? <Flag text={hi ? '💨 तेज़ हवा' : '💨 High Wind'} color="#FF9800" /> : null}
                    {features.high_uv_flag ? <Flag text={hi ? '☀️ तेज़ धूप' : '☀️ High UV'} color="#FFD740" /> : null}
                    {!features.heatwave_flag && !features.drought_flag && !features.flood_flag && !features.high_wind_flag && !features.high_uv_flag
                        ? <Flag text={hi ? '✅ सामान्य' : '✅ Normal'} color="#66BB6A" /> : null}
                </View>

                {/* Stress Meter */}
                <View style={styles.stressCard}>
                    <Text style={styles.stressTitle}>{hi ? 'समग्र तनाव' : 'Overall Stress'}</Text>
                    <View style={styles.stressMeter}>
                        <View style={[styles.stressFill, { width: `${features.overall_stress * 100}%`, backgroundColor: features.overall_stress > 0.6 ? '#EF5350' : features.overall_stress > 0.3 ? '#FF9800' : '#66BB6A' }]} />
                    </View>
                    <Text style={[styles.stressVal, { color: features.overall_stress > 0.6 ? '#EF5350' : features.overall_stress > 0.3 ? '#FF9800' : '#66BB6A' }]}>
                        {Math.round(features.overall_stress * 100)}%
                    </Text>
                </View>

                {/* ── ML PREDICTIONS ── */}
                <Text style={styles.section}>🧠 {hi ? 'AI फसल भविष्यवाणी' : 'AI Crop Predictions'}</Text>
                {predictions.map((p, i) => (
                    <View key={p.crop} style={[styles.predCard, i === 0 && styles.topPred]}>
                        {i === 0 && <Text style={styles.bestLabel}>⭐ {hi ? 'सर्वोत्तम फसल' : 'Best Crop'}</Text>}
                        <View style={styles.predRow}>
                            <Text style={styles.predEmoji}>{p.emoji}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.predName}>{hi ? p.cropHi : p.crop}</Text>
                                <Text style={styles.predSub}>{hi ? 'तनाव' : 'Stress'}: {p.stress_level}</Text>
                            </View>
                            <View style={styles.predStats}>
                                <Text style={styles.predYield}>📦 {p.predicted_yield} t/ha</Text>
                                <Text style={[styles.predProfit, { color: p.expected_profit > 0 ? '#66BB6A' : '#EF5350' }]}>
                                    💰 ₹{(p.expected_profit / 1000).toFixed(0)}K
                                </Text>
                            </View>
                        </View>

                        <View style={styles.predMetrics}>
                            <Metric label={hi ? 'जोखिम' : 'Risk'} val={`${Math.round(p.risk_score * 100)}%`} color={p.risk_score > 0.5 ? '#EF5350' : '#66BB6A'} />
                            <Metric label={hi ? 'स्वास्थ्य' : 'Health'} val={`${p.health_score}%`} color={p.health_score > 60 ? '#66BB6A' : '#FF9800'} />
                            <Metric label={hi ? 'उपज गुणक' : 'Yield Factor'} val={`${p.weatherYieldFactor}x`} color={p.weatherYieldFactor > 0.8 ? '#66BB6A' : '#EF5350'} />
                        </View>
                    </View>
                ))}

                {/* ── RECOMMENDATIONS ── */}
                <Text style={styles.section}>💡 {hi ? 'AI सुझाव' : 'AI Recommendations'}</Text>
                {recommendations.map((rec, i) => (
                    <View key={i} style={[styles.recCard, { borderLeftColor: rec.severity === 'danger' ? '#EF5350' : rec.severity === 'warning' ? '#FF9800' : '#66BB6A' }]}>
                        <Text style={styles.recIcon}>{rec.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.recTitle}>{hi ? rec.titleHi : rec.title}</Text>
                            <Text style={styles.recDesc}>{hi ? rec.descHi : rec.desc}</Text>
                        </View>
                    </View>
                ))}

                {/* ── RAW WEATHER DATA ── */}
                <Text style={styles.section}>📡 {hi ? 'कच्चा मौसम डेटा' : 'Raw Weather Data'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weatherScroll}>
                    {weather.days.map((d, i) => (
                        <View key={i} style={styles.dayCard}>
                            <Text style={styles.dayDate}>{d.date.slice(5)}</Text>
                            <Text style={styles.dayTemp}>{d.tempmax}°</Text>
                            <Text style={styles.dayTempMin}>{d.tempmin}°</Text>
                            <Text style={styles.dayHum}>💧{d.humidity}%</Text>
                            <Text style={styles.dayRain}>🌧️{d.precip}mm</Text>
                            <Text style={styles.dayWind}>💨{Math.round(d.windgust)}</Text>
                        </View>
                    ))}
                </ScrollView>

                <Text style={styles.footer}>
                    {hi ? 'डेटा स्रोत: Visual Crossing API • AI मॉडल: XGBoost सिम्युलेशन' : 'Data: Visual Crossing API • Model: XGBoost Simulation'}
                </Text>
            </ScrollView>
        </View>
    );
}

function PipeStep({ icon, label, status }) {
    return (
        <View style={styles.pipeStep}>
            <Text style={styles.pipeIcon}>{icon}{status}</Text>
            <Text style={styles.pipeLabel}>{label}</Text>
        </View>
    );
}

function FeatBadge({ label, val, color }) {
    return (
        <View style={styles.featBadge}>
            <Text style={styles.featLabel}>{label}</Text>
            <Text style={[styles.featVal, { color }]}>{val}</Text>
        </View>
    );
}

function Flag({ text, color }) {
    return (
        <View style={[styles.flag, { backgroundColor: color + '20', borderColor: color + '40' }]}>
            <Text style={[styles.flagText, { color }]}>{text}</Text>
        </View>
    );
}

function Metric({ label, val, color }) {
    return (
        <View style={styles.metric}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={[styles.metricVal, { color }]}>{val}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.4)',
        borderBottomWidth: 1, borderBottomColor: '#1B3A4B',
    },
    title: { fontSize: 15, fontWeight: '800', color: '#B0BEC5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadText: { fontSize: 13, color: '#66BB6A', marginTop: 12 },
    pipeText: { fontSize: 9, color: '#546E7A', marginTop: 4 },
    errText: { fontSize: 13, color: '#FF9800' },
    scroll: { padding: 10, paddingBottom: 30 },

    // Pipeline
    pipelineCard: { backgroundColor: 'rgba(46,125,50,0.08)', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(46,125,50,0.2)' },
    pipeTitle: { fontSize: 12, fontWeight: '800', color: '#66BB6A', textAlign: 'center', marginBottom: 6 },
    pipeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    pipeStep: { alignItems: 'center' },
    pipeIcon: { fontSize: 11 },
    pipeLabel: { fontSize: 8, color: '#78909C' },
    arrow: { fontSize: 10, color: '#546E7A', marginHorizontal: 4 },
    pipeSource: { fontSize: 8, color: '#546E7A', textAlign: 'center', marginTop: 4 },

    section: { fontSize: 13, fontWeight: '800', color: '#90A4AE', marginTop: 10, marginBottom: 6 },

    // Features
    featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    featBadge: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 6, width: '31%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    featLabel: { fontSize: 8, color: '#607D8B' },
    featVal: { fontSize: 13, fontWeight: '800' },

    flagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    flag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    flagText: { fontSize: 10, fontWeight: '700' },

    // Stress
    stressCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    stressTitle: { fontSize: 10, fontWeight: '700', color: '#78909C', width: 80 },
    stressMeter: { flex: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' },
    stressFill: { height: 8, borderRadius: 4 },
    stressVal: { fontSize: 14, fontWeight: '900', width: 40, textAlign: 'right' },

    // Predictions
    predCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 8, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    topPred: { borderColor: 'rgba(102,187,106,0.3)', backgroundColor: 'rgba(46,125,50,0.08)' },
    bestLabel: { fontSize: 9, fontWeight: '800', color: '#66BB6A', textAlign: 'center', marginBottom: 2 },
    predRow: { flexDirection: 'row', alignItems: 'center' },
    predEmoji: { fontSize: 24, marginRight: 8 },
    predName: { fontSize: 13, fontWeight: '800', color: '#CFD8DC' },
    predSub: { fontSize: 9, color: '#78909C' },
    predStats: { alignItems: 'flex-end' },
    predYield: { fontSize: 10, color: '#90A4AE', fontWeight: '600' },
    predProfit: { fontSize: 14, fontWeight: '900' },
    predMetrics: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 4 },
    metric: { alignItems: 'center' },
    metricLabel: { fontSize: 8, color: '#607D8B' },
    metricVal: { fontSize: 12, fontWeight: '800' },

    // Recommendations
    recCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8, marginBottom: 4, borderLeftWidth: 3, alignItems: 'flex-start' },
    recIcon: { fontSize: 18, marginRight: 8 },
    recTitle: { fontSize: 12, fontWeight: '800', color: '#CFD8DC' },
    recDesc: { fontSize: 9, color: '#78909C', lineHeight: 13, marginTop: 2 },

    // Weather scroll
    weatherScroll: { marginBottom: 6 },
    dayCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 6, marginRight: 6, alignItems: 'center', width: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    dayDate: { fontSize: 9, fontWeight: '700', color: '#90A4AE' },
    dayTemp: { fontSize: 14, fontWeight: '900', color: '#EF5350' },
    dayTempMin: { fontSize: 10, color: '#42A5F5' },
    dayHum: { fontSize: 8, color: '#78909C' },
    dayRain: { fontSize: 8, color: '#42A5F5' },
    dayWind: { fontSize: 8, color: '#78909C' },

    footer: { fontSize: 8, color: '#37474F', textAlign: 'center', marginTop: 10 },
});
