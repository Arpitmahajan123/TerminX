/**
 * MarketPanel.js - Bidding-style market with asking price
 * Farmer sets asking price → markets bid → accept bids >= asking price
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { generateMarketBids } from '../services/priceTrend';
import { getEffectiveQuantity } from '../engine/storageEngine';
import { getCropByName } from '../data/crops';
import ActionButton from './ActionButton';
import { t, isHindi } from '../i18n/lang';

export default function MarketPanel({ storageItem, onSell }) {
    const { state } = useGame();
    const [askingPrice, setAskingPrice] = useState('');
    const hi = isHindi();

    if (!storageItem) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🏪</Text>
                <Text style={styles.emptyText}>{t('chooseItem')}</Text>
            </View>
        );
    }

    const crop = getCropByName(storageItem.cropType);
    const effQty = getEffectiveQuantity(storageItem);
    const askVal = parseFloat(askingPrice) || 0;

    // Generate bids from all markets
    const bids = useMemo(() => {
        return generateMarketBids(
            storageItem.cropType, effQty, storageItem.quality,
            state.day, state.exchangeRate
        );
    }, [storageItem, state.day, state.exchangeRate]);

    // Filter: show which bids meet the farmer's asking price
    const meetsAsk = (bid) => askVal <= 0 || bid.bidPrice >= askVal;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Item info */}
            <View style={styles.itemCard}>
                <Text style={styles.itemEmoji}>{crop?.emoji || '📦'}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{hi ? crop?.nameHi : storageItem.cropType}</Text>
                    <Text style={styles.itemDetail}>{Math.round(effQty)} kg • {t('quality')}: {storageItem.quality}%</Text>
                </View>
            </View>

            {/* Asking Price Input */}
            <View style={styles.askCard}>
                <Text style={styles.askTitle}>💰 {hi ? 'आपकी अपेक्षित कीमत (₹/kg)' : 'Your Asking Price (₹/kg)'}</Text>
                <Text style={styles.askHint}>{hi ? 'बोली से कम या बराबर हो तो सौदा होगा' : 'If bid ≥ your price, deal is accepted'}</Text>
                <TextInput
                    style={styles.askInput}
                    value={askingPrice}
                    onChangeText={setAskingPrice}
                    keyboardType="numeric"
                    placeholder={hi ? "कीमत डालें..." : "Enter price..."}
                    placeholderTextColor="#546E7A"
                />
                {askVal > 0 && (
                    <Text style={styles.askTotal}>
                        {hi ? 'अपेक्षित कुल' : 'Expected Total'}: ₹{Math.round(askVal * effQty).toLocaleString()}
                    </Text>
                )}
            </View>

            {/* Market Bids */}
            <Text style={styles.sectionTitle}>📢 {hi ? 'बाज़ार से बोलियां' : 'Bids from Markets'}</Text>

            {bids.map((bid, i) => {
                const accepted = meetsAsk(bid);
                const isTopBid = i === 0;

                return (
                    <View key={bid.marketId}
                        style={[styles.bidCard,
                        isTopBid && styles.topBid,
                        !accepted && askVal > 0 && styles.rejectedBid
                        ]}>
                        {isTopBid && <Text style={styles.topLabel}>⭐ {hi ? 'सर्वोत्तम बोली' : 'Best Bid'}</Text>}

                        <View style={styles.bidHeader}>
                            <Text style={styles.bidEmoji}>{bid.emoji}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.bidName}>{hi ? bid.marketNameHi : bid.marketName}</Text>
                                <Text style={styles.bidDist}>{bid.distance} km</Text>
                            </View>
                            <View style={styles.bidPriceBox}>
                                <Text style={styles.bidPriceLabel}>{hi ? 'बोली' : 'Bid'}</Text>
                                <Text style={styles.bidPrice}>
                                    {bid.currency === 'USD' ? '$' : '₹'}{bid.bidPrice}/kg
                                </Text>
                            </View>
                        </View>

                        <View style={styles.bidDetails}>
                            <View style={styles.bidDetail}>
                                <Text style={styles.detailLabel}>{hi ? 'माल' : 'Qty'}</Text>
                                <Text style={styles.detailVal}>{bid.effectiveQty} kg</Text>
                            </View>
                            <View style={styles.bidDetail}>
                                <Text style={styles.detailLabel}>{hi ? 'कुल' : 'Total'}</Text>
                                <Text style={[styles.detailVal, { color: '#66BB6A' }]}>₹{bid.bidTotal.toLocaleString()}</Text>
                            </View>
                            <View style={styles.bidDetail}>
                                <Text style={styles.detailLabel}>{hi ? 'ढुलाई' : 'Transport'}</Text>
                                <Text style={[styles.detailVal, { color: '#EF5350' }]}>-₹{bid.transportCost}</Text>
                            </View>
                        </View>

                        <View style={styles.bidFooter}>
                            <View>
                                <Text style={styles.netLabel}>{hi ? 'शुद्ध लाभ' : 'Net Profit'}</Text>
                                <Text style={[styles.netVal, { color: bid.netProfit >= 0 ? '#66BB6A' : '#EF5350' }]}>
                                    {bid.netProfit >= 0 ? '+' : ''}₹{bid.netProfit.toLocaleString()}
                                </Text>
                            </View>

                            {accepted || askVal <= 0 ? (
                                <ActionButton
                                    title={hi ? 'स्वीकार करें' : 'Accept Bid'}
                                    onPress={() => onSell(storageItem.id, bid.marketId)}
                                    variant={bid.netProfit >= 0 ? 'primary' : 'secondary'}
                                    size="small"
                                    style={{ minWidth: 100 }}
                                />
                            ) : (
                                <View style={styles.rejectedBadge}>
                                    <Text style={styles.rejectedText}>
                                        {hi ? '❌ कीमत कम' : '❌ Below Ask'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Comparison with asking price */}
                        {askVal > 0 && (
                            <View style={[styles.askCompare, { backgroundColor: accepted ? 'rgba(102,187,106,0.1)' : 'rgba(239,83,80,0.1)' }]}>
                                <Text style={[styles.askCompareText, { color: accepted ? '#66BB6A' : '#EF5350' }]}>
                                    {accepted
                                        ? `✅ ${hi ? 'बोली ≥ आपकी कीमत' : 'Bid ≥ Your Ask'} (+₹${Math.round((bid.bidPrice - askVal) * effQty)})`
                                        : `❌ ${hi ? 'बोली < आपकी कीमत' : 'Bid < Your Ask'} (-₹${Math.round((askVal - bid.bidPrice) * effQty)})`
                                    }
                                </Text>
                            </View>
                        )}
                    </View>
                );
            })}

            <Text style={styles.note}>
                {hi ? '💡 बोलियां वास्तविक मंडी डेटा पर आधारित हैं और हर दिन बदलती हैं'
                    : '💡 Bids are based on real mandi data and change daily'}
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 40, marginBottom: 6 },
    emptyText: { fontSize: 13, color: '#78909C' },

    itemCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10,
        marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    itemEmoji: { fontSize: 28, marginRight: 10 },
    itemName: { fontSize: 14, fontWeight: '800', color: '#CFD8DC' },
    itemDetail: { fontSize: 10, color: '#78909C' },

    askCard: {
        backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: 10, padding: 12,
        marginBottom: 10, borderWidth: 1, borderColor: 'rgba(46,125,50,0.25)',
    },
    askTitle: { fontSize: 13, fontWeight: '800', color: '#66BB6A', marginBottom: 2 },
    askHint: { fontSize: 9, color: '#78909C', marginBottom: 6 },
    askInput: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
        fontSize: 18, fontWeight: '800', color: '#66BB6A', textAlign: 'center',
        borderWidth: 1, borderColor: 'rgba(102,187,106,0.3)',
    },
    askTotal: { fontSize: 11, color: '#66BB6A', textAlign: 'center', marginTop: 4, fontWeight: '600' },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#90A4AE', marginBottom: 6, marginTop: 4 },

    bidCard: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 10,
        marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    topBid: { borderColor: 'rgba(102,187,106,0.3)', backgroundColor: 'rgba(46,125,50,0.08)' },
    rejectedBid: { opacity: 0.5 },
    topLabel: { fontSize: 10, fontWeight: '800', color: '#66BB6A', textAlign: 'center', marginBottom: 4 },

    bidHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    bidEmoji: { fontSize: 22, marginRight: 8 },
    bidName: { fontSize: 13, fontWeight: '700', color: '#CFD8DC' },
    bidDist: { fontSize: 9, color: '#607D8B' },
    bidPriceBox: { alignItems: 'flex-end' },
    bidPriceLabel: { fontSize: 8, color: '#78909C' },
    bidPrice: { fontSize: 16, fontWeight: '900', color: '#FFD740' },

    bidDetails: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
    bidDetail: { alignItems: 'center' },
    detailLabel: { fontSize: 8, color: '#607D8B' },
    detailVal: { fontSize: 11, fontWeight: '700', color: '#B0BEC5' },

    bidFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 6 },
    netLabel: { fontSize: 8, color: '#78909C' },
    netVal: { fontSize: 16, fontWeight: '900' },

    rejectedBadge: { backgroundColor: 'rgba(239,83,80,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    rejectedText: { fontSize: 11, color: '#EF5350', fontWeight: '700' },

    askCompare: { borderRadius: 6, padding: 4, marginTop: 4 },
    askCompareText: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

    note: { fontSize: 9, color: '#546E7A', textAlign: 'center', marginTop: 8, marginBottom: 20 },
});
