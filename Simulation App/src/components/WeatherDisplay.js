/**
 * WeatherDisplay.js - Weather overlay effects on the farm
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export default function WeatherDisplay({ weather }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (weather === 'Storm' || weather === 'Rain') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            anim.setValue(0);
        }
    }, [weather]);

    const overlays = {
        Sunny: { bg: 'rgba(255,235,59,0.08)', particles: '☀️' },
        Rain: { bg: 'rgba(33,150,243,0.12)', particles: '💧' },
        Heatwave: { bg: 'rgba(255,87,34,0.1)', particles: '🔥' },
        Storm: { bg: 'rgba(69,39,160,0.15)', particles: '⚡' },
    };

    const o = overlays[weather] || overlays.Sunny;

    return (
        <Animated.View style={[styles.overlay, { backgroundColor: o.bg, opacity: weather === 'Storm' ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) : 1 }]} pointerEvents="none">
            {(weather === 'Rain' || weather === 'Storm') && (
                <View style={styles.particles}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Text key={i} style={[styles.particle, { left: `${i * 12 + 5}%`, top: `${(i * 17) % 80}%` }]}>{o.particles}</Text>
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
    particles: { flex: 1, position: 'relative' },
    particle: { position: 'absolute', fontSize: 14, opacity: 0.4 },
});
