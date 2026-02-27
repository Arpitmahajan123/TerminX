/**
 * LoanPanel.js - Bank visual
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { LOAN_AMOUNTS, BASE_DAILY_INTEREST_RATE, REPUTATION_INTEREST_MODIFIER, MAX_LOAN_BALANCE } from '../data/constants';
import ActionButton from './ActionButton';

export default function LoanPanel() {
    const { state, dispatch } = useGame();
    const dailyRate = BASE_DAILY_INTEREST_RATE + Math.max(0, 50 - state.reputation) * REPUTATION_INTEREST_MODIFIER;
    const annualRate = (dailyRate * 365 * 100).toFixed(1);

    return (
        <View style={styles.container}>
            <View style={styles.bankCard}>
                <Text style={styles.bankIcon}>🏦</Text>
                <Text style={styles.bankTitle}>Farmer's Bank</Text>

                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Loan Balance</Text>
                    <Text style={[styles.statVal, { color: state.loanBalance > 0 ? '#FF5252' : '#69F0AE' }]}>
                        ₹{Math.round(state.loanBalance).toLocaleString()}
                    </Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Interest Rate</Text>
                    <Text style={styles.statVal}>{annualRate}%/yr</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Max Loan</Text>
                    <Text style={styles.statVal}>₹{(MAX_LOAN_BALANCE / 100000).toFixed(0)}L</Text>
                </View>

                {state.reputation < 50 && (
                    <Text style={styles.warn}>⚠️ Low reputation increases interest!</Text>
                )}
            </View>

            <Text style={styles.sectionTitle}>Take Loan</Text>
            <View style={styles.btnRow}>
                {LOAN_AMOUNTS.map(amt => (
                    <ActionButton
                        key={amt}
                        title={`₹${amt / 1000}K`}
                        onPress={() => dispatch({ type: 'TAKE_LOAN', payload: { amount: amt } })}
                        variant="accent"
                        size="small"
                        disabled={state.loanBalance + amt > MAX_LOAN_BALANCE}
                        style={styles.loanBtn}
                    />
                ))}
            </View>

            {state.loanBalance > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Repay</Text>
                    <View style={styles.btnRow}>
                        {[10000, 25000, 50000].map(amt => (
                            <ActionButton
                                key={amt}
                                title={`₹${amt / 1000}K`}
                                onPress={() => dispatch({ type: 'REPAY_LOAN', payload: { amount: Math.min(amt, state.loanBalance) } })}
                                variant="success"
                                size="small"
                                disabled={state.money < Math.min(amt, state.loanBalance)}
                                style={styles.loanBtn}
                            />
                        ))}
                        <ActionButton
                            title="All"
                            onPress={() => dispatch({ type: 'REPAY_LOAN', payload: { amount: state.loanBalance } })}
                            variant="primary"
                            size="small"
                            disabled={state.money < state.loanBalance}
                            style={styles.loanBtn}
                        />
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    bankCard: {
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 16,
        alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)',
    },
    bankIcon: { fontSize: 40, marginBottom: 4 },
    bankTitle: { fontSize: 20, fontWeight: '900', color: '#FFD740', marginBottom: 12 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 4 },
    statLabel: { fontSize: 13, color: '#90A4AE' },
    statVal: { fontSize: 13, fontWeight: '800', color: '#E0E0E0' },
    warn: { fontSize: 11, color: '#FF9800', marginTop: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#E8F5E9', marginBottom: 8 },
    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
    loanBtn: { minWidth: 70 },
});
