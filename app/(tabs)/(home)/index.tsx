import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sprout, TrendingUp, Clock, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import WeatherCard from '@/components/WeatherCard';
import AlertCard from '@/components/AlertCard';
import DateHeader from '@/components/DateHeader';
import { useWeather } from '@/hooks/useWeather';
import { useMarket, useAlerts } from '@/hooks/useMarket';
import { useCrops } from '@/hooks/useCrops';
import { useUserLocation } from '@/hooks/useLocation';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t, isHindi } = useLanguage();
  const router = useRouter();
  const { location: userLoc } = useUserLocation();

  // Real-time data hooks — using GPS coordinates
  const { data: weather } = useWeather(userLoc.lat, userLoc.lon, userLoc.displayName);
  const { data: mandis } = useMarket(weather);
  const { data: alerts, isLoading: alertsLoading } = useAlerts(weather, mandis);
  const { crops } = useCrops();

  const statusColor = (status: string) => {
    switch (status) {
      case 'urgent': return Colors.danger;
      case 'ready': return Colors.success;
      default: return Colors.primaryLight;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'urgent': return isHindi ? 'तुरंत' : 'Urgent';
      case 'ready': return isHindi ? 'तैयार' : 'Ready';
      default: return isHindi ? 'बढ़ रहा है' : 'Growing';
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <View style={styles.locationRow}>
            <MapPin size={12} color={Colors.primary} />
            <Text style={styles.locationText}>{userLoc.displayName}</Text>
          </View>
        </View>
        <DateHeader />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>{t('todayWeather')}</Text>
        <WeatherCard />

        <Text style={styles.sectionTitle}>{t('alerts')}</Text>
        <View style={styles.alertsList}>
          {alertsLoading ? (
            <View style={styles.alertsLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.alertsLoadingText}>{t('loadingAlerts')}</Text>
            </View>
          ) : alerts && alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <View style={styles.noAlerts}>
              <Text style={styles.noAlertsText}>{t('noAlerts')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('yourCrops')}</Text>
        <View style={styles.cropsList}>
          {crops.map((crop) => {
            const progress = crop.currentDay / crop.daysToHarvest;
            return (
              <Pressable
                key={crop.id}
                style={styles.cropCard}
                onPress={() => router.push('/harvest')}
                testID={`crop-${crop.id}`}
              >
                <Text style={styles.cropIcon}>{crop.icon}</Text>
                <View style={styles.cropInfo}>
                  <View style={styles.cropHeader}>
                    <Text style={styles.cropName}>{isHindi ? crop.nameHi : crop.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(crop.status) + '18' }]}>
                      <Text style={[styles.statusText, { color: statusColor(crop.status) }]}>
                        {statusLabel(crop.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressWrap}>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: statusColor(crop.status) }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {crop.currentDay}/{crop.daysToHarvest} {isHindi ? 'दिन' : 'days'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        <View style={styles.actionsGrid}>
          <Pressable style={[styles.actionCard, { backgroundColor: '#E8F5E9' }]} onPress={() => router.push('/harvest')}>
            <Sprout size={28} color={Colors.primary} />
            <Text style={styles.actionLabel}>{t('harvestAdvisor')}</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { backgroundColor: '#FFF3E0' }]} onPress={() => router.push('/market')}>
            <TrendingUp size={28} color={Colors.accent} />
            <Text style={styles.actionLabel}>{t('mandiMatchmaker')}</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { backgroundColor: '#E3F2FD' }]} onPress={() => router.push('/storage')}>
            <Clock size={28} color={Colors.info} />
            <Text style={styles.actionLabel}>{t('spoilageRisk')}</Text>
          </Pressable>
        </View>

        <View style={{ height: 20 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 12,
  },
  alertsList: {
    gap: 10,
  },
  cropsList: {
    gap: 10,
  },
  cropCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cropIcon: {
    fontSize: 36,
  },
  cropInfo: {
    flex: 1,
    gap: 8,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  alertsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  alertsLoadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  noAlerts: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  noAlertsText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
