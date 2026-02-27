/**
 * MarketScreen.js - Simulation-style market with Analysis + Bidding tabs
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import StoragePanel from '../components/StoragePanel';
import MarketPanel from '../components/MarketPanel';
import PriceTrendPanel from '../components/PriceTrendPanel';
import ActionButton from '../components/ActionButton';
import NotificationBar from '../components/NotificationBar';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { isHindi, t } from '../i18n/lang';

export default function MarketScreen() {
    const { state, dispatch } = useGame();
    const [tab, setTab] = useState('analysis'); // 'analysis' | 'sell'
    const [selectedItem, setSelectedItem] = useState(null);
    const hi = isHindi();

    const goBack = () => {
        if (tab === 'sell' && selectedItem) { setSelectedItem(null); return; }
        dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.GAME } });
    };

    const handleSell = (storageItemId, marketId) => {
        dispatch({ type: Actions.SELL_TO_MARKET, payload: { storageItemId, marketId } });
        setSelectedItem(null);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ActionButton title="←" onPress={goBack} variant="outline" size="small" />
                <Text style={styles.title}>🏪 {hi ? 'बाज़ार' : 'Market'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'analysis' && styles.activeTab]}
                    onPress={() => setTab('analysis')}
                >
                    <Text style={[styles.tabText, tab === 'analysis' && styles.activeTabText]}>
                        📊 {hi ? 'विश्लेषण' : 'Analysis'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'sell' && styles.activeTab]}
                    onPress={() => setTab('sell')}
                >
                    <Text style={[styles.tabText, tab === 'sell' && styles.activeTabText]}>
                        💰 {hi ? 'बेचें / बोली' : 'Sell / Bid'}
                    </Text>
                </TouchableOpacity>
            </View>

            <NotificationBar
                notifications={state.notifications}
                onDismiss={(i) => dispatch({ type: Actions.DISMISS_NOTIFICATION, payload: { index: i } })}
            />

            <View style={styles.content}>
                {tab === 'analysis' ? (
                    <PriceTrendPanel />
                ) : selectedItem ? (
                    <MarketPanel storageItem={selectedItem} onSell={handleSell} />
                ) : (
                    <StoragePanel onSelectItem={setSelectedItem} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.4)', borderBottomWidth: 1, borderBottomColor: '#1B3A4B',
    },
    title: { fontSize: 16, fontWeight: '800', color: '#B0BEC5' },
    tabs: {
        flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)',
        borderBottomWidth: 1, borderBottomColor: '#1B3A4B',
    },
    tab: {
        flex: 1, paddingVertical: 8, alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    activeTab: { borderBottomColor: '#66BB6A' },
    tabText: { fontSize: 12, fontWeight: '600', color: '#607D8B' },
    activeTabText: { color: '#66BB6A', fontWeight: '800' },
    content: { flex: 1, padding: 10 },
});
