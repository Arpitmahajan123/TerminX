/**
 * ProfitForecast.js - Simplified profit predictions
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { predictAllCrops } from '../engine/predictionEngine';

export default function ProfitForecast({ fieldCapacity }) {
    const { state } = useGame();
    const preds = predictAllCrops(fieldCapacity, state.marketPrices, state.season);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>📊 Profit Forecast</Text>
            {preds.map(p => (
                <View key={p.cropName} style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.emoji}>{p.emoji}</Text>
                        <Text style={styles.name}>{p.cropName}</Text>
                        <Text style={[styles.profit, { color: p.profitColor }]}>
                            {p.netProfit >= 0 ? '+' : ''}₹{Math.round(p.netProfit / 1000)}K
                        </Text>
                    </View>
                    <View style={styles.details}>
                        <Text style={styles.detail}>Yield: {p.predictedYield}kg</Text>
                        <Text style={styles.detail}>Revenue: ₹{Math.round(p.predictedRevenue / 1000)}K</Text>
                        <Text style={styles.detail}>Cost: ₹{Math.round(p.totalCost / 1000)}K</Text>
                        <Text style={styles.detail}>ROI: {p.roi}%</Text>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 18, fontWeight: '900', color: '#E8F5E9', textAlign: 'center', marginBottom: 10 },
    card: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 10, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    emoji: { fontSize: 20, marginRight: 8 },
    name: { fontSize: 14, fontWeight: '800', color: '#FFF', flex: 1 },
    profit: { fontSize: 16, fontWeight: '900' },
    details: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    detail: { fontSize: 10, color: '#90A4AE' },
});
