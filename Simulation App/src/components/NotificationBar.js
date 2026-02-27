/**
 * NotificationBar.js - Toast-style game notifications
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

export default function NotificationBar({ notifications, onDismiss }) {
    if (!notifications || notifications.length === 0) return null;
    return (
        <View style={styles.container}>
            {notifications.slice(0, 3).map((msg, i) => (
                <NotifItem key={`${i}-${msg}`} message={msg} onDismiss={() => onDismiss(i)} />
            ))}
        </View>
    );
}

function NotifItem({ message, onDismiss }) {
    const slide = useRef(new Animated.Value(-60)).current;
    useEffect(() => {
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    }, []);

    const isError = message.includes('❌');
    const isWarn = message.includes('⚠️');
    const bg = isError ? 'rgba(244,67,54,0.9)' : isWarn ? 'rgba(255,152,0,0.9)' : 'rgba(46,125,50,0.9)';

    return (
        <Animated.View style={[styles.notif, { backgroundColor: bg, transform: [{ translateY: slide }] }]}>
            <TouchableOpacity onPress={onDismiss} style={styles.notifInner} activeOpacity={0.8}>
                <Text style={styles.notifText} numberOfLines={2}>{message}</Text>
                <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, padding: 4 },
    notif: { borderRadius: 8, marginBottom: 3, elevation: 5 },
    notifInner: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    notifText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#FFF' },
    close: { fontSize: 14, color: 'rgba(255,255,255,0.7)', paddingLeft: 8 },
});
