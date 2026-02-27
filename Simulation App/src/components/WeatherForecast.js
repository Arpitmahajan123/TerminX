/**
 * WeatherForecast.js - Visual weather forecast display
 * Shows: Past 7 days | TODAY | Next 7 days + AI Prediction
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function WeatherForecast({ data }) {
    if (!data) {
        return (
            <View style={styles.loading}>
                <Text style={styles.loadingText}>📡 Fetching weather data...</Text>
            </View>
        );
    }

    const { history, current, forecast, prediction } = data;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Current Weather */}
            <View style={styles.currentCard}>
                <Text style={styles.currentEmoji}>
                    {{ Sunny: '☀️', Rain: '🌧️', Heatwave: '🔥', Storm: '⛈️' }[current.weather] || '☀️'}
                </Text>
                <View style={styles.currentInfo}>
                    <Text style={styles.currentWeather}>{current.weather}</Text>
                    <Text style={styles.currentTemp}>{current.temperature}°C</Text>
                </View>
                <View style={styles.currentDetails}>
                    <Text style={styles.detailText}>💧 {current.humidity}%</Text>
                    <Text style={styles.detailText}>💨 {current.windSpeed} km/h</Text>
                </View>
            </View>

            {/* Past 7 Days */}
            <Text style={styles.sectionTitle}>📅 Past 7 Days</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                {history.map((day, i) => (
                    <View key={`h-${i}`} style={styles.dayCard}>
                        <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                        <Text style={styles.dayEmoji}>{day.emoji}</Text>
                        <Text style={styles.dayType}>{day.weather}</Text>
                        <Text style={styles.dayTemp}>{day.tempMax}°/{day.tempMin}°</Text>
                        {day.rain > 0 && <Text style={styles.dayRain}>💧{day.rain}mm</Text>}
                    </View>
                ))}
            </ScrollView>

            {/* Next 7 Days Forecast */}
            <Text style={styles.sectionTitle}>🔮 7-Day Forecast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                {forecast.map((day, i) => (
                    <View key={`f-${i}`} style={[styles.dayCard, styles.forecastCard]}>
                        <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                        <Text style={styles.dayEmoji}>{day.emoji}</Text>
                        <Text style={styles.dayType}>{day.weather}</Text>
                        <Text style={styles.dayTemp}>{day.tempMax}°/{day.tempMin}°</Text>
                        {day.rain > 0 && <Text style={styles.dayRain}>💧{day.rain}mm</Text>}
                    </View>
                ))}
            </ScrollView>

            {/* AI Prediction */}
            {prediction && (
                <View style={styles.predictionCard}>
                    <Text style={styles.predTitle}>🧠 Weather Intelligence</Text>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>Next Week</Text>
                        <Text style={styles.predVal}>{prediction.nextWeekOutlook}</Text>
                    </View>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>Storm Risk</Text>
                        <Text style={styles.predVal}>{prediction.stormRisk}</Text>
                    </View>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>Heatwave Risk</Text>
                        <Text style={styles.predVal}>{prediction.heatwaveRisk}</Text>
                    </View>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>Growth Impact</Text>
                        <Text style={styles.predVal}>{prediction.growthImpact}</Text>
                    </View>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>Spoilage Risk</Text>
                        <Text style={styles.predVal}>{prediction.spoilageRisk}</Text>
                    </View>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>Transport Risk</Text>
                        <Text style={styles.predVal}>{prediction.transportRisk}</Text>
                    </View>

                    <View style={styles.predDivider} />

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>🌱 Planting</Text>
                        <Text style={styles.predVal}>{prediction.bestPlantingWindow}</Text>
                    </View>

                    <View style={styles.predRow}>
                        <Text style={styles.predLabel}>🌾 Harvest</Text>
                        <Text style={styles.predVal}>{prediction.bestHarvestWindow}</Text>
                    </View>

                    <View style={styles.recommendBox}>
                        <Text style={styles.recommendTitle}>💡 Recommendation</Text>
                        <Text style={styles.recommendText}>{prediction.recommendation}</Text>
                    </View>
                </View>
            )}

            <Text style={styles.apiNote}>🌐 Data from Open-Meteo API (real-time)</Text>
        </ScrollView>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}\n${d.getDate()} ${months[d.getMonth()]}`;
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { fontSize: 16, color: '#81C784' },

    // Current weather
    currentCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)',
    },
    currentEmoji: { fontSize: 48, marginRight: 12 },
    currentInfo: { flex: 1 },
    currentWeather: { fontSize: 20, fontWeight: '900', color: '#E8F5E9' },
    currentTemp: { fontSize: 28, fontWeight: '900', color: '#FFD740' },
    currentDetails: { alignItems: 'flex-end' },
    detailText: { fontSize: 12, color: '#90A4AE', marginBottom: 2 },

    // Section titles
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#81C784', marginBottom: 6, marginTop: 4 },

    // Day cards (horizontal scroll)
    dayScroll: { marginBottom: 12 },
    dayCard: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 8,
        marginRight: 8, alignItems: 'center', minWidth: 72,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    forecastCard: { borderColor: 'rgba(76,175,80,0.2)', backgroundColor: 'rgba(46,125,50,0.15)' },
    dayDate: { fontSize: 9, color: '#78909C', textAlign: 'center', marginBottom: 4 },
    dayEmoji: { fontSize: 24, marginBottom: 2 },
    dayType: { fontSize: 10, fontWeight: '700', color: '#E0E0E0' },
    dayTemp: { fontSize: 10, color: '#FFD740', fontWeight: '600' },
    dayRain: { fontSize: 9, color: '#64B5F6', marginTop: 2 },

    // Prediction card
    predictionCard: {
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', marginBottom: 12,
    },
    predTitle: { fontSize: 17, fontWeight: '900', color: '#FFD740', textAlign: 'center', marginBottom: 10 },
    predRow: { marginBottom: 6 },
    predLabel: { fontSize: 11, color: '#78909C', fontWeight: '600' },
    predVal: { fontSize: 12, color: '#E8F5E9', fontWeight: '700', marginTop: 1 },
    predDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },

    // Recommendation
    recommendBox: {
        backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: 10, padding: 10,
        marginTop: 8, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)',
    },
    recommendTitle: { fontSize: 13, fontWeight: '900', color: '#69F0AE', marginBottom: 4 },
    recommendText: { fontSize: 12, color: '#E8F5E9', lineHeight: 18 },

    apiNote: { fontSize: 10, color: '#546E7A', textAlign: 'center', marginVertical: 8 },
});
