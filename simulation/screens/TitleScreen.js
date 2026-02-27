/**
 * TitleScreen.js - Responsive landing screen for Android
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useGame } from '../state/GameContext';
import ActionButton from '../components/ActionButton';
import { SCREENS } from '../data/constants';
import * as Actions from '../state/actions';
import { t, setLanguage, getLanguage } from '../i18n/lang';

const { width, height } = Dimensions.get('window');

export default function TitleScreen() {
    const { dispatch } = useGame();
    const fade = useRef(new Animated.Value(0)).current;
    const [lang, setLang] = useState(getLanguage());

    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const toggleLang = () => {
        const next = lang === 'en' ? 'hi' : 'en';
        setLanguage(next);
        setLang(next);
    };

    const handleStart = () => {
        dispatch({ type: Actions.SET_SCREEN, payload: { screen: SCREENS.SETUP } });
    };

    return (
        <View style={styles.bg}>
            <TouchableOpacity onPress={toggleLang} style={styles.langBtn} activeOpacity={0.7}>
                <Text style={styles.langText}>{t('langSwitch')}</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={[styles.content, { opacity: fade }]}>
                    <Text style={styles.logo}>🌾</Text>
                    <Text style={styles.title}>{t('appName')}</Text>
                    <Text style={styles.subtitle}>{t('appTagline')}</Text>
                    <Text style={styles.desc}>{t('appDesc')}</Text>

                    <ActionButton
                        title={t('trySimulation')}
                        onPress={handleStart}
                        variant="primary"
                        size="large"
                        style={styles.startBtn}
                    />

                    <View style={styles.features}>
                        <Text style={styles.feat}>{t('feat1')}</Text>
                        <Text style={styles.feat}>{t('feat2')}</Text>
                        <Text style={styles.feat}>{t('feat3')}</Text>
                        <Text style={styles.feat}>{t('feat4')}</Text>
                        <Text style={styles.feat}>{t('feat5')}</Text>
                        <Text style={styles.feat}>{t('feat6')}</Text>
                    </View>

                    <View style={styles.goalBanner}>
                        <Text style={styles.goalText}>{t('goalText')}</Text>
                    </View>

                    <Text style={styles.powered}>Powered by Open-Meteo • ExchangeRate API</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#0D1B2A' },
    langBtn: {
        position: 'absolute', top: 40, right: 16, zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    langText: { fontSize: 12, fontWeight: '700', color: '#66BB6A' },
    scrollContent: {
        flexGrow: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 50,
    },
    content: { alignItems: 'center', width: '100%', maxWidth: 400 },
    logo: { fontSize: 50, marginBottom: 2 },
    title: { fontSize: 22, fontWeight: '900', color: '#2E7D32', letterSpacing: 1.5 },
    subtitle: { fontSize: 12, color: '#66BB6A', fontWeight: '500', marginBottom: 6 },
    desc: {
        fontSize: 12, color: '#78909C', textAlign: 'center', lineHeight: 18,
        paddingHorizontal: 10, marginBottom: 16,
    },
    startBtn: { width: Math.min(260, width * 0.7), marginBottom: 16 },
    features: { alignItems: 'flex-start', marginBottom: 12 },
    feat: { fontSize: 11, color: '#546E7A', marginVertical: 1.5 },
    goalBanner: {
        backgroundColor: 'rgba(46,125,50,0.1)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(46,125,50,0.25)',
    },
    goalText: { fontSize: 11, fontWeight: '600', color: '#66BB6A', textAlign: 'center' },
    powered: { fontSize: 8, color: '#37474F', marginTop: 12 },
});
