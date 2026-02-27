/**
 * PlantingScreen.js - Professional crop selection
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import CropSelector from '../components/CropSelector';
import ProfitForecast from '../components/ProfitForecast';
import ActionButton from '../components/ActionButton';
import NotificationBar from '../components/NotificationBar';
import { SCREENS, FIELD_STATES } from '../data/constants';
import * as Actions from '../state/actions';
import { t } from '../i18n/lang';

export default function PlantingScreen() {
    const { state, dispatch } = useGame();
    const [showForecast, setShowForecast] = useState(false);

    const field = state.selectedFieldId !== null
        ? state.fields[state.selectedFieldId]
        : state.fields.find(f => f.status === FIELD_STATES.EMPTY);

    const handleSelectCrop = (cropType) => {
        if (!field) return;
        dispatch({ type: Actions.PLANT_CROP, payload: { fieldId: field.id, cropType } });
    };

    const goBack = () => dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });

    if (!field || field.status !== FIELD_STATES.EMPTY) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <ActionButton title={t('back')} onPress={goBack} variant="outline" size="small" />
                    <Text style={styles.title}>🌱 {t('planting')}</Text>
                    <View style={{ width: 60 }} />
                </View>
                <View style={styles.empty}>
                    <Text style={{ fontSize: 40 }}>🚫</Text>
                    <Text style={styles.emptyText}>{t('empty')} {t('fields')}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.title}>🌱 {t('fields')} {field.id + 1}</Text>
                <ActionButton title={showForecast ? "🌱" : "📊"} onPress={() => setShowForecast(!showForecast)} variant="dark" size="small" />
            </View>
            <NotificationBar notifications={state.notifications} onDismiss={(i) => dispatch({ type: Actions.DISMISS_NOTIFICATION, payload: { index: i } })} />
            <View style={styles.content}>
                {showForecast ? <ProfitForecast fieldCapacity={field.quantity} /> : <CropSelector fieldCapacity={field.quantity} onSelectCrop={handleSelectCrop} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderBottomWidth: 1, borderBottomColor: '#1B3A4B' },
    title: { fontSize: 16, fontWeight: '800', color: '#B0BEC5' },
    content: { flex: 1, padding: 12 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 14, color: '#607D8B', marginTop: 8 },
});
