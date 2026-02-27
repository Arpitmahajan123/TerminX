/**
 * FarmView.js - Responsive farm dashboard
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useGame } from '../state/GameContext';
import FieldTile from './FieldTile';
import WeatherDisplay from './WeatherDisplay';
import { FIELD_STATES, SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { getTotalStorageUsed } from '../engine/storageEngine';
import { t } from '../i18n/lang';

const { width } = Dimensions.get('window');

export default function FarmView() {
    const { state, dispatch } = useGame();

    const handleFieldPress = (field) => {
        if (field.status === FIELD_STATES.EMPTY) {
            dispatch({ type: Actions.SELECT_FIELD, payload: { fieldId: field.id } });
            dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.PLANTING } });
        } else if (field.status === FIELD_STATES.MATURE || field.status === FIELD_STATES.OVERRIPE) {
            dispatch({ type: Actions.HARVEST_FIELD, payload: { fieldId: field.id } });
        } else {
            dispatch({ type: Actions.SELECT_FIELD, payload: { fieldId: field.id } });
        }
    };

    const storageUsed = getTotalStorageUsed(state.storage);
    const storagePct = Math.min(100, Math.round((storageUsed / state.storageCapacity) * 100));
    const tileSize = Math.min(Math.floor((width - 32) / Math.min(state.fields.length, 3)) - 8, 120);

    return (
        <View style={styles.farmArea}>
            <WeatherDisplay weather={state.weather} />

            <View style={styles.farmLabel}>
                <Text style={styles.farmTitle}>🌾 {t('yourFarm')}</Text>
                <Text style={styles.fieldCount}>{state.fields.length} {t('fieldsCount')}</Text>
            </View>

            <View style={styles.fieldGrid}>
                {state.fields.map((field) => (
                    <FieldTile
                        key={field.id}
                        field={field}
                        onPress={() => handleFieldPress(field)}
                        isSelected={state.selectedFieldId === field.id}
                        compact={state.fields.length > 4}
                        size={tileSize}
                    />
                ))}
            </View>

            <Text style={styles.hint}>{t('tapToPlant')}</Text>

            <View style={styles.barn}>
                <Text style={styles.barnIcon}>🏠</Text>
                <View style={styles.barnInfo}>
                    <Text style={styles.barnLabel}>{t('storageBarn')}</Text>
                    <View style={styles.barnBar}>
                        <View style={[styles.barnFill, {
                            width: `${storagePct}%`,
                            backgroundColor: storagePct > 80 ? '#EF5350' : '#66BB6A',
                        }]} />
                    </View>
                    <Text style={styles.barnText}>
                        {Math.round(storageUsed)}/{state.storageCapacity} kg
                        {state.storage.length > 0 ? ` • ${state.storage.length} ${t('items')}` : ''}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    farmArea: { backgroundColor: '#1A3C34', minHeight: 200, padding: 6, position: 'relative' },
    farmLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, zIndex: 10 },
    farmTitle: { fontSize: 14, fontWeight: '800', color: '#A5D6A7', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    fieldCount: { fontSize: 10, color: '#81C784', fontWeight: '600' },
    fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', zIndex: 10, paddingVertical: 6, gap: 6 },
    hint: { fontSize: 8, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 2, zIndex: 10 },
    barn: {
        flexDirection: 'row', alignItems: 'center', zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: 8, marginTop: 6, marginHorizontal: 4,
    },
    barnIcon: { fontSize: 22, marginRight: 8 },
    barnInfo: { flex: 1 },
    barnLabel: { fontSize: 11, fontWeight: '700', color: '#A5D6A7' },
    barnBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 2, marginVertical: 2, overflow: 'hidden' },
    barnFill: { height: 4, borderRadius: 2 },
    barnText: { fontSize: 8, color: '#81C784' },
});
