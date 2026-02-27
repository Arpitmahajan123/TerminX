/**
 * StorageScreen.js - Professional storage view
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import StoragePanel from '../components/StoragePanel';
import ActionButton from '../components/ActionButton';
import NotificationBar from '../components/NotificationBar';
import { SCREENS, FIELD_COST, STORAGE_UPGRADE_COST, MAX_FIELDS, MAX_STORAGE_CAPACITY } from '../data/constants';
import * as Actions from '../state/actions';
import { t } from '../i18n/lang';

export default function StorageScreen() {
    const { state, dispatch } = useGame();
    const goBack = () => dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.title}>📦 {t('storage')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <NotificationBar notifications={state.notifications} onDismiss={(i) => dispatch({ type: Actions.DISMISS_NOTIFICATION, payload: { index: i } })} />
            <View style={styles.content}><StoragePanel /></View>
            <View style={styles.upgradeBar}>
                <ActionButton title={`🏗️ ${t('buyField')} ₹${FIELD_COST / 1000}K`} onPress={() => dispatch({ type: Actions.BUY_FIELD })}
                    variant="accent" size="small" disabled={state.money < FIELD_COST || state.fields.length >= MAX_FIELDS} style={{ flex: 1 }} />
                <ActionButton title={`📦 ${t('upgradeStorage')} ₹${STORAGE_UPGRADE_COST / 1000}K`} onPress={() => dispatch({ type: Actions.UPGRADE_STORAGE })}
                    variant="accent" size="small" disabled={state.money < STORAGE_UPGRADE_COST || state.storageCapacity >= MAX_STORAGE_CAPACITY} style={{ flex: 1 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderBottomWidth: 1, borderBottomColor: '#1B3A4B' },
    title: { fontSize: 16, fontWeight: '800', color: '#B0BEC5' },
    content: { flex: 1, padding: 12 },
    upgradeBar: { flexDirection: 'row', gap: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderTopWidth: 1, borderTopColor: '#1B3A4B' },
});
