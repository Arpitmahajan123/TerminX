/**
 * BankScreen.js - Professional bank view
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import LoanPanel from '../components/LoanPanel';
import ActionButton from '../components/ActionButton';
import NotificationBar from '../components/NotificationBar';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { t } from '../i18n/lang';

export default function BankScreen() {
    const { state, dispatch } = useGame();
    const goBack = () => dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.title}>🏦 {t('farmersBank')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <NotificationBar notifications={state.notifications} onDismiss={(i) => dispatch({ type: Actions.DISMISS_NOTIFICATION, payload: { index: i } })} />
            <ScrollView style={styles.content}><LoanPanel /></ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderBottomWidth: 1, borderBottomColor: '#1B3A4B' },
    title: { fontSize: 16, fontWeight: '800', color: '#CFD8DC' },
    content: { flex: 1, padding: 12 },
});
