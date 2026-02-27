import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Shield, AlertTriangle, IndianRupee, CheckCircle, Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import CropSelector from '@/components/CropSelector';
import DateHeader from '@/components/DateHeader';
import { Crop, PreservationTip } from '@/mocks/crops';
import { useCrops } from '@/hooks/useCrops';

export default function StorageScreen() {
  const insets = useSafeAreaInsets();
  const { t, isHindi } = useLanguage();
  const { crops, isEnriched } = useCrops();
  const [selectedCrop, setSelectedCrop] = useState<Crop>(crops[0]);
  const countdownAnim = useRef(new Animated.Value(0)).current;

  // Keep selectedCrop in sync when crops data refreshes
  useEffect(() => {
    const updated = crops.find((c) => c.id === selectedCrop.id);
    if (updated) setSelectedCrop(updated);
  }, [crops]);

  const spoilage = selectedCrop.spoilageInfo;

  useEffect(() => {
    countdownAnim.setValue(0);
    Animated.timing(countdownAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [selectedCrop, countdownAnim]);

  const riskConfig = {
    low: { color: Colors.success, bg: Colors.successBg, label: t('low') },
    medium: { color: '#B8860B', bg: Colors.warningBg, label: t('medium') },
    high: { color: Colors.danger, bg: Colors.dangerBg, label: t('high') },
  };

  const risk = riskConfig[spoilage.riskLevel];

  const shelfWidth = countdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${Math.min((spoilage.shelfLifeDays / 30) * 100, 100)}%`],
  });

  const effectivenessIcon = (eff: string) => {
    switch (eff) {
      case 'high': return <Star size={14} color="#F59E0B" />;
      case 'medium': return <Star size={14} color={Colors.textMuted} />;
      default: return <Star size={14} color={Colors.divider} />;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Shield size={24} color={Colors.info} />
          <Text style={styles.headerTitle}>{t('spoilageRisk')}</Text>
        </View>
        <DateHeader showToggle={false} />
      </View>

      <CropSelector selectedCropId={selectedCrop.id} onSelect={setSelectedCrop} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.shelfLifeCard, { backgroundColor: risk.bg }]}>
          <View style={styles.shelfHeader}>
            <View style={[styles.riskBadge, { backgroundColor: risk.color }]}>
              <AlertTriangle size={14} color={Colors.white} />
              <Text style={styles.riskText}>{risk.label} {t('risk')}</Text>
            </View>
            <Clock size={20} color={risk.color} />
          </View>

          <View style={styles.countdownSection}>
            <Text style={styles.countdownNumber}>{spoilage.shelfLifeDays}</Text>
            <Text style={styles.countdownLabel}>{t('days')} {t('shelfLife').toLowerCase()}</Text>
          </View>

          <View style={styles.shelfBar}>
            <Animated.View style={[styles.shelfBarFill, { width: shelfWidth, backgroundColor: risk.color }]} />
          </View>

          <Text style={styles.shelfReason}>
            {isHindi ? spoilage.reasonHi : spoilage.reasonEn}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('preservationTips')}</Text>

        {spoilage.preservationTips.map((tip: PreservationTip, index: number) => (
          <View key={index} style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.tipTitleBlock}>
                <Text style={styles.tipTitle}>{isHindi ? tip.titleHi : tip.titleEn}</Text>
                <View style={styles.tipMeta}>
                  {effectivenessIcon(tip.effectiveness)}
                  <Text style={styles.tipEffText}>
                    {tip.effectiveness === 'high' ? t('high') : tip.effectiveness === 'medium' ? t('medium') : t('low')}
                  </Text>
                </View>
              </View>
              <View style={styles.tipStats}>
                <View style={styles.tipStatItem}>
                  <IndianRupee size={12} color={Colors.textMuted} />
                  <Text style={styles.tipStatValue}>
                    {tip.cost === 0 ? t('free') : `₹${tip.cost}`}
                  </Text>
                </View>
                <View style={styles.tipStatItem}>
                  <Clock size={12} color={Colors.success} />
                  <Text style={[styles.tipStatValue, { color: Colors.success }]}>
                    +{tip.daysAdded} {t('days')}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.tipDesc}>{isHindi ? tip.descHi : tip.descEn}</Text>
            {tip.cost === 0 && (
              <View style={styles.freeBadge}>
                <CheckCircle size={12} color={Colors.success} />
                <Text style={styles.freeText}>{t('noCost')}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.info,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  shelfLifeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  countdownSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 56,
    fontWeight: '900' as const,
    color: Colors.text,
  },
  countdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  shelfBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    marginBottom: 14,
  },
  shelfBarFill: {
    height: 8,
    borderRadius: 4,
  },
  shelfReason: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  tipTitleBlock: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  tipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipEffText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  tipStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tipStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipStatValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tipDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: Colors.successBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.success,
  },
});
