/**
 * TruckAnimation.js - Animated truck on road
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export default function TruckAnimation({ transport }) {
    const pos = useRef(new Animated.Value(0)).current;
    const progress = transport.totalTravelDays > 0
        ? (transport.totalTravelDays - transport.daysRemaining) / transport.totalTravelDays : 0;

    useEffect(() => {
        Animated.timing(pos, { toValue: progress, duration: 500, useNativeDriver: false }).start();
    }, [progress]);

    return (
        <View style={styles.card}>
            <View style={styles.road}>
                <Text style={styles.endpoint}>🏠</Text>
                <View style={styles.track}>
                    <View style={styles.roadLine} />
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View key={i} style={[styles.dash, { left: `${i * 10 + 5}%` }]} />
                    ))}
                    <Animated.View style={[styles.truck, {
                        left: pos.interpolate({ inputRange: [0, 1], outputRange: ['0%', '85%'] }),
                    }]}>
                        <Text style={styles.truckIcon}>🚜</Text>
                    </Animated.View>
                </View>
                <Text style={styles.endpoint}>🏪</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.infoText}>{transport.cropType} ({Math.round(transport.quantity)}kg)</Text>
                <Text style={[styles.infoText, { color: '#FFD740' }]}>
                    {transport.daysRemaining}d left
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 8, marginBottom: 6 },
    road: { flexDirection: 'row', alignItems: 'center' },
    endpoint: { fontSize: 18 },
    track: { flex: 1, height: 24, marginHorizontal: 6, justifyContent: 'center', position: 'relative' },
    roadLine: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
    dash: { position: 'absolute', width: 6, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
    truck: { position: 'absolute', top: -4 },
    truckIcon: { fontSize: 20 },
    info: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    infoText: { fontSize: 10, color: '#B0BEC5', fontWeight: '600' },
});
