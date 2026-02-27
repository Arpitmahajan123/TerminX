import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, Minus, MapPin, Truck, Award, Info, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import CropSelector from '@/components/CropSelector';
import DateHeader from '@/components/DateHeader';
import { Crop } from '@/mocks/crops';
import { useMarket } from '@/hooks/useMarket';
import { useCrops } from '@/hooks/useCrops';
import { useWeather } from '@/hooks/useWeather';

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const { t, isHindi } = useLanguage();
  const { crops } = useCrops();
  const [selectedCrop, setSelectedCrop] = useState<Crop>(crops[0]);
  const [showReason, setShowReason] = useState<string | null>(null);

  const { data: weather } = useWeather();
  const { data: mandis, isLoading, dataUpdatedAt } = useMarket(weather);

  const sortedMandis = useMemo(() => {
    if (!mandis) return [];
    return [...mandis].sort((a, b) => {
      const aPrice = a.prices.find((p) => p.cropId === selectedCrop.id);
      const bPrice = b.prices.find((p) => p.cropId === selectedCrop.id);
      return (bPrice?.netProfit ?? 0) - (aPrice?.netProfit ?? 0);
    });
  }, [selectedCrop, mandis]);

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp size={14} color={Colors.success} />;
      case 'down': return <TrendingDown size={14} color={Colors.danger} />;
      default: return <Minus size={14} color={Colors.textMuted} />;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <TrendingUp size={24} color={Colors.accent} />
          <Text style={styles.headerTitle}>{t('mandiMatchmaker')}</Text>
        </View>
        <DateHeader showToggle={false} />
      </View>

      <CropSelector selectedCropId={selectedCrop.id} onSelect={setSelectedCrop} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>{t('compareMarkets')}</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>{t('loadingMandi')}</Text>
          </View>
        ) : sortedMandis.map((mandi, index) => {
          const priceData = mandi.prices.find((p) => p.cropId === selectedCrop.id);
          if (!priceData) return null;

          const isTop = index === 0;
          const isRecommended = mandi.isRecommended;

          return (
            <View key={mandi.id}>
              <View style={[
                styles.mandiCard,
                isTop && styles.mandiCardTop,
              ]}>
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Award size={12} color={Colors.white} />
                    <Text style={styles.recommendedText}>{t('recommended')}</Text>
                  </View>
                )}

                <View style={styles.mandiHeader}>
                  <View style={styles.mandiNameBlock}>
                    <Text style={styles.mandiName}>{isHindi ? mandi.nameHi : mandi.name}</Text>
                    <View style={styles.mandiMeta}>
                      <MapPin size={12} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{mandi.distance} km</Text>
                      <Truck size={12} color={Colors.textMuted} />
                      <Text style={styles.metaText}>₹{mandi.transportCost}</Text>
                    </View>
                  </View>
                  {trendIcon(priceData.trend)}
                </View>

                <View style={styles.priceRow}>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceLabel}>{t('pricePerQuintal')}</Text>
                    <Text style={styles.priceValue}>₹{priceData.pricePerQuintal.toLocaleString()}</Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceLabel}>{t('transportCost')}</Text>
                    <Text style={[styles.priceValue, { color: Colors.danger }]}>-₹{mandi.transportCost}</Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceLabel}>{t('netProfit')}</Text>
                    <Text style={[styles.priceValue, { color: Colors.success, fontWeight: '800' as const }]}>
                      ₹{priceData.netProfit.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.reasonBtn}
                  onPress={() => setShowReason(showReason === mandi.id ? null : mandi.id)}
                >
                  <Info size={14} color={Colors.primary} />
                  <Text style={styles.reasonBtnText}>{t('whyThisRec')}</Text>
                </Pressable>

                {showReason === mandi.id && (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText}>
                      {isHindi ? mandi.reasonHi : mandi.reasonEn}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
        }

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
    color: Colors.accent,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  mandiCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  mandiCardTop: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  mandiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  mandiNameBlock: {
    gap: 4,
  },
  mandiName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  mandiMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  priceBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  priceDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  reasonBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  reasonBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text,
  },
});
