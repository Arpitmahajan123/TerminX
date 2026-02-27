/**
 * PriceTrendPanel.js - Shows profitability analysis per crop over 30 days
 * Tells farmer: WHEN to sell for maximum profit
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { getAllCropPeaks } from '../services/priceTrend';
import { isHindi } from '../i18n/lang';

export default function PriceTrendPanel() {
    const { state } = useGame();
    const hi = isHindi();

    const peaks = useMemo(() => getAllCropPeaks(state.day), [state.day]);

    const marketLabel = (id) => {
        const labels = { localA: hi ? 'स्थानीय मंडी' : 'Local Mandi', localB: hi ? 'ज़िला बाज़ार' : 'District', export: hi ? 'निर्यात' : 'Export' };
        return labels[id] || id;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>📊 {hi ? '30-दिन मूल्य पूर्वानुमान' : '30-Day Price Forecast'}</Text>
            <Text style={styles.subtitle}>{hi ? 'कब बेचें अधिकतम लाभ के लिए' : 'When to sell for maximum profit'}</Text>

            {peaks.map((p, i) => {
                const arrow = p.priceChange > 0 ? '📈' : p.priceChange < 0 ? '📉' : '➡️';
                const changeColor = p.priceChange > 0 ? '#66BB6A' : p.priceChange < 0 ? '#EF5350' : '#FFD740';

                return (
                    <View key={p.crop} style={[styles.card, i === 0 && styles.topCard]}>
                        {i === 0 && <Text style={styles.topLabel}>⭐ {hi ? 'सबसे अधिक लाभदायक' : 'Most Profitable'}</Text>}

                        <View style={styles.cropRow}>
                            <Text style={styles.emoji}>{p.emoji}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cropName}>{hi ? p.cropHi : p.crop}</Text>
                                <Text style={styles.currentPrice}>{hi ? 'आज' : 'Today'}: ₹{p.currentPrice}/kg</Text>
                            </View>
                            <View style={styles.peakBox}>
                                <Text style={styles.peakLabel}>{hi ? 'शिखर मूल्य' : 'Peak Price'}</Text>
                                <Text style={styles.peakPrice}>₹{p.peakPrice}/kg</Text>
                            </View>
                        </View>

                        <View style={styles.analysisRow}>
                            <View style={styles.analysisBadge}>
                                <Text style={styles.analysisLabel}>{hi ? 'सबसे अच्छा दिन' : 'Best Day'}</Text>
                                <Text style={styles.analysisVal}>+{p.peakDayOffset} {hi ? 'दिन' : 'days'}</Text>
                            </View>
                            <View style={styles.analysisBadge}>
                                <Text style={styles.analysisLabel}>{hi ? 'सबसे अच्छा बाज़ार' : 'Best Market'}</Text>
                                <Text style={styles.analysisVal}>{marketLabel(p.peakMarket)}</Text>
                            </View>
                            <View style={styles.analysisBadge}>
                                <Text style={styles.analysisLabel}>{hi ? 'मूल्य बदलाव' : 'Price Change'}</Text>
                                <Text style={[styles.analysisVal, { color: changeColor }]}>
                                    {arrow} {p.priceChange > 0 ? '+' : ''}₹{p.priceChange.toFixed(1)}
                                </Text>
                            </View>
                        </View>

                        {/* Simple price trend bar */}
                        <View style={styles.trendBar}>
                            <Text style={styles.trendLabel}>{hi ? 'आज' : 'Now'}</Text>
                            <View style={styles.trendTrack}>
                                <View style={[styles.trendFill, { width: `${Math.min(100, (p.currentPrice / p.peakPrice) * 100)}%` }]} />
                                <View style={[styles.trendMarker, { left: `${(p.peakDayOffset / 30) * 100}%` }]} />
                            </View>
                            <Text style={styles.trendLabel}>{hi ? '30 दिन' : '30d'}</Text>
                        </View>
                    </View>
                );
            })}

            <Text style={styles.note}>
                {hi ? '💡 मूल्य वास्तविक मंडी डेटा पर आधारित अनुमान हैं' : '💡 Prices are estimates based on real mandi data trends'}
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 16, fontWeight: '900', color: '#B0BEC5', textAlign: 'center', marginBottom: 2 },
    subtitle: { fontSize: 10, color: '#607D8B', textAlign: 'center', marginBottom: 10 },

    card: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10,
        marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    topCard: { borderColor: 'rgba(102,187,106,0.3)', backgroundColor: 'rgba(46,125,50,0.08)' },
    topLabel: { fontSize: 10, fontWeight: '800', color: '#66BB6A', textAlign: 'center', marginBottom: 4 },

    cropRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    emoji: { fontSize: 24, marginRight: 8 },
    cropName: { fontSize: 14, fontWeight: '800', color: '#CFD8DC' },
    currentPrice: { fontSize: 10, color: '#78909C' },
    peakBox: { alignItems: 'flex-end' },
    peakLabel: { fontSize: 8, color: '#78909C' },
    peakPrice: { fontSize: 16, fontWeight: '900', color: '#FFD740' },

    analysisRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
    analysisBadge: { alignItems: 'center' },
    analysisLabel: { fontSize: 8, color: '#607D8B' },
    analysisVal: { fontSize: 11, fontWeight: '700', color: '#B0BEC5' },

    trendBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trendLabel: { fontSize: 7, color: '#546E7A' },
    trendTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, position: 'relative', overflow: 'hidden' },
    trendFill: { height: 4, backgroundColor: '#66BB6A', borderRadius: 2 },
    trendMarker: { position: 'absolute', top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD740' },

    note: { fontSize: 9, color: '#546E7A', textAlign: 'center', marginTop: 6, marginBottom: 20 },
});
