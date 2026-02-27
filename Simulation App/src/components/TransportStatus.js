/**
 * TransportStatus.js - Active deliveries display
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import TruckAnimation from './TruckAnimation';

export default function TransportStatus() {
    const { state } = useGame();
    if (state.activeTransports.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>🚚 Deliveries ({state.activeTransports.length})</Text>
            {state.activeTransports.map(t => <TruckAnimation key={t.id} transport={t} />)}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: 12, paddingVertical: 6 },
    header: { fontSize: 14, fontWeight: '800', color: '#E8F5E9', marginBottom: 4 },
});
