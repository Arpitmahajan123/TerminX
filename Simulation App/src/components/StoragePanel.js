/**
 * StoragePanel.js - Visual warehouse inventory
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { getCropByName } from '../data/crops';
import { getEffectiveQuantity, getTotalStorageUsed } from '../engine/storageEngine';
import ProgressBar from './ProgressBar';

export default function StoragePanel({ onSelectItem }) {
    const { state } = useGame();
    const totalUsed = getTotalStorageUsed(state.storage);

    if (state.storage.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyText}>Storage Empty</Text>
                <Text style={styles.emptySub}>Harvest crops to fill storage</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <ProgressBar
                progress={(totalUsed / state.storageCapacity) * 100}
                color={totalUsed > state.storageCapacity * 0.8 ? '#FF5722' : '#4CAF50'}
                label={`Storage: ${Math.round(totalUsed)}/${state.storageCapacity}kg`}
                showPercent
                height={8}
                style={{ marginBottom: 10 }}
            />

            {state.storage.map(item => {
                const crop = getCropByName(item.cropType);
                const effQty = Math.round(getEffectiveQuantity(item));
                const spoilColor = item.currentSpoilage > 70 ? '#F44336' : item.currentSpoilage > 40 ? '#FF9800' : '#4CAF50';

                return (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.item}
                        onPress={() => onSelectItem && onSelectItem(item)}
                        activeOpacity={onSelectItem ? 0.7 : 1}
                    >
                        <Text style={styles.itemEmoji}>{crop?.emoji || '📦'}</Text>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.cropType}</Text>
                            <View style={styles.itemRow}>
                                <Text style={styles.itemQty}>{effQty}kg</Text>
                                <Text style={styles.itemSep}>•</Text>
                                <Text style={[styles.itemQuality, {
                                    color: item.quality > 80 ? '#69F0AE' : item.quality > 50 ? '#FFD740' : '#FF5252'
                                }]}>Q:{item.quality}%</Text>
                            </View>
                            <ProgressBar progress={item.currentSpoilage} color={spoilColor} height={4} />
                        </View>
                        <View style={styles.itemDays}>
                            <Text style={styles.daysNum}>{item.daysInStorage}</Text>
                            <Text style={styles.daysLabel}>days</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 18, fontWeight: '800', color: '#E8F5E9', marginTop: 8 },
    emptySub: { fontSize: 12, color: '#81C784' },
    item: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
        padding: 10, marginBottom: 6,
    },
    itemEmoji: { fontSize: 28, marginRight: 10 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '800', color: '#FFF' },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 },
    itemQty: { fontSize: 11, color: '#B0BEC5', fontWeight: '600' },
    itemSep: { fontSize: 8, color: '#546E7A' },
    itemQuality: { fontSize: 11, fontWeight: '700' },
    itemDays: { alignItems: 'center', marginLeft: 8 },
    daysNum: { fontSize: 16, fontWeight: '900', color: '#FFD740' },
    daysLabel: { fontSize: 8, color: '#90A4AE' },
});
