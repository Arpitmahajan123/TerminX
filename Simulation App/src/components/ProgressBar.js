/**
 * ProgressBar.js - Game-style progress bar
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressBar({ progress = 0, color = '#4CAF50', label, showPercent = false, height = 10, style }) {
    const p = Math.max(0, Math.min(100, progress));
    return (
        <View style={[styles.wrap, style]}>
            {label && (
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {showPercent && <Text style={styles.pct}>{Math.round(p)}%</Text>}
                </View>
            )}
            <View style={[styles.track, { height }]}>
                <View style={[styles.fill, { width: `${p}%`, backgroundColor: color, height }]} />
                <View style={[styles.shine, { height: height / 2 }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { width: '100%' },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    label: { fontSize: 10, color: '#B0BEC5', fontWeight: '600' },
    pct: { fontSize: 10, color: '#CFD8DC', fontWeight: '700' },
    track: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, overflow: 'hidden', position: 'relative' },
    fill: { borderRadius: 6 },
    shine: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6 },
});
