/**
 * CropSelector.js - Crop picker with real data and Hindi
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import CROPS from '../data/crops';
import { useGame } from '../state/GameContext';
import { predictProfit } from '../engine/predictionEngine';
import { t, isHindi } from '../i18n/lang';

export default function CropSelector({ fieldCapacity, onSelectCrop }) {
    const { state } = useGame();
    const hi = isHindi();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>🌱 {t('selectCrop')}</Text>
            <Text style={styles.sub}>{t('season')}: {state.season} | {t('capacity')}: {fieldCapacity}kg</Text>

            <View style={styles.grid}>
                {CROPS.map(crop => {
                    const pred = predictProfit(crop, fieldCapacity, state.marketPrices, state.season);
                    const cost = crop.seedCostPerKg * fieldCapacity;
                    const canAfford = state.money >= cost;

                    return (
                        <TouchableOpacity
                            key={crop.name}
                            style={[styles.card, !canAfford && styles.disabled]}
                            onPress={() => canAfford && onSelectCrop(crop.name)}
                            activeOpacity={canAfford ? 0.7 : 1}
                        >
                            <Text style={styles.emoji}>{crop.emoji}</Text>
                            <Text style={styles.cropName}>{hi ? crop.nameHi : crop.name}</Text>

                            <View style={styles.infoRow}>
                                <Text style={styles.detail}>⏱ {crop.maturityDays}d</Text>
                                <Text style={styles.detail}>📦 {pred.predictedYield}kg</Text>
                            </View>

                            <Text style={styles.cost}>💰 ₹{Math.round(cost / 1000)}K</Text>

                            <View style={[styles.profitBadge, {
                                backgroundColor: pred.netProfit >= 0 ? 'rgba(102,187,106,0.2)' : 'rgba(239,83,80,0.2)',
                            }]}>
                                <Text style={[styles.profitText, {
                                    color: pred.netProfit >= 0 ? '#66BB6A' : '#EF5350',
                                }]}>
                                    {pred.netProfit >= 0 ? '+' : ''}₹{Math.round(pred.netProfit / 1000)}K
                                </Text>
                                <Text style={styles.roi}>ROI: {pred.roi}%</Text>
                            </View>

                            {/* Real info */}
                            <Text style={styles.realInfo} numberOfLines={2}>
                                {hi ? crop.realInfoHi : crop.realInfo}
                            </Text>

                            {!pred.seasonMatch && <Text style={styles.warn}>⚠️ {t('offSeason')}</Text>}
                            {!canAfford && (
                                <View style={styles.lockOverlay}>
                                    <Text style={styles.lockText}>🔒 {t('locked')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 18, fontWeight: '800', color: '#B0BEC5', textAlign: 'center', marginBottom: 2 },
    sub: { fontSize: 10, color: '#607D8B', textAlign: 'center', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    card: {
        width: '46%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
        padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    disabled: { opacity: 0.4 },
    emoji: { fontSize: 32, marginBottom: 2 },
    cropName: { fontSize: 13, fontWeight: '800', color: '#CFD8DC', marginBottom: 2 },
    infoRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
    detail: { fontSize: 9, color: '#78909C' },
    cost: { fontSize: 10, fontWeight: '700', color: '#FFD740', marginBottom: 4 },
    profitBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
    profitText: { fontSize: 12, fontWeight: '800' },
    roi: { fontSize: 8, color: '#78909C' },
    realInfo: { fontSize: 8, color: '#546E7A', textAlign: 'center', marginTop: 4, lineHeight: 11 },
    warn: { fontSize: 8, color: '#FF9800', marginTop: 2 },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    },
    lockText: { fontSize: 11, color: '#EF5350', fontWeight: '700' },
});
