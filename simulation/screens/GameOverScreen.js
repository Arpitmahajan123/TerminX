/**
 * GameOverScreen.js - Win/Loss screen
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import ActionButton from '../components/ActionButton';
import * as Actions from '../state/actions';
import { SCREENS } from '../data/constants';

export default function GameOverScreen() {
    const { state, dispatch } = useGame();
    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.5)).current;
    const isWin = state.gameStatus === 'won';

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleNewGame = () => {
        dispatch({ type: Actions.RESET_GAME });
    };

    return (
        <View style={[styles.bg, { backgroundColor: isWin ? '#1B5E20' : '#B71C1C' }]}>
            <Animated.View style={[styles.content, { opacity: fade, transform: [{ scale }] }]}>
                <Text style={styles.emoji}>{isWin ? '🏆' : '💔'}</Text>
                <Text style={styles.title}>{isWin ? 'YOU WIN!' : 'GAME OVER'}</Text>
                <Text style={styles.reason}>
                    {isWin ? 'You built a farming empire!'
                        : state.gameOverReason === 'DEBT_SEIZURE'
                            ? 'The bank seized your farm!'
                            : 'You went bankrupt!'}
                </Text>

                <View style={styles.stats}>
                    <Stat label="Days" value={state.day} />
                    <Stat label="Money" value={`₹${Math.round(state.money).toLocaleString()}`} color={state.money >= 0 ? '#69F0AE' : '#FF5252'} />
                    <Stat label="Rep" value={state.reputation} />
                    <Stat label="Debt" value={`₹${Math.round(state.loanBalance).toLocaleString()}`} />
                    <Stat label="Fields" value={state.fields.length} />
                </View>

                <ActionButton title="🔄 Play Again" onPress={handleNewGame} variant="gold" size="large" style={{ width: 220 }} />
            </Animated.View>
        </View>
    );
}

function Stat({ label, value, color }) {
    return (
        <View style={s.stat}>
            <Text style={s.statLabel}>{label}</Text>
            <Text style={[s.statVal, color && { color }]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    stat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
    statVal: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const styles = StyleSheet.create({
    bg: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    content: { alignItems: 'center', width: '100%' },
    emoji: { fontSize: 72, marginBottom: 8 },
    title: { fontSize: 36, fontWeight: '900', color: '#FFF', letterSpacing: 3, marginBottom: 8 },
    reason: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24 },
    stats: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 16,
        width: '100%', marginBottom: 24,
    },
});
