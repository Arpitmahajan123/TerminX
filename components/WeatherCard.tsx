import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Sun, Cloud, CloudRain, CloudLightning, Droplets, Wind, Thermometer, RefreshCw } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import { useWeather } from '@/hooks/useWeather';
import { useUserLocation } from '@/hooks/useLocation';

const conditionIcon = (condition: string, size: number = 24) => {
  const color = condition === 'sunny' ? '#F59E0B' : condition === 'stormy' ? Colors.danger : Colors.textSecondary;
  switch (condition) {
    case 'sunny': return <Sun size={size} color={color} />;
    case 'cloudy': return <Cloud size={size} color={color} />;
    case 'rainy': return <CloudRain size={size} color={Colors.info} />;
    case 'stormy': return <CloudLightning size={size} color={color} />;
    default: return <Sun size={size} color={color} />;
  }
};

export default function WeatherCard() {
  const { t } = useLanguage();
  const { location } = useUserLocation();
  const { data: weather, isLoading, isError } = useWeather(location.lat, location.lon, location.displayName);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('todayWeather')}...</Text>
      </View>
    );
  }

  if (!weather) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.mainTemp}>
          {conditionIcon(weather.condition, 40)}
          <View style={styles.tempBlock}>
            <Text style={styles.temperature}>{weather.temperature}°C</Text>
            <Text style={styles.region}>{weather.region}</Text>
          </View>
        </View>
        {weather.lastUpdated && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Droplets size={16} color={Colors.info} />
          <Text style={styles.statLabel}>{t('humidity')}</Text>
          <Text style={styles.statValue}>{weather.humidity}%</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Wind size={16} color={Colors.textSecondary} />
          <Text style={styles.statLabel}>{t('wind')}</Text>
          <Text style={styles.statValue}>{weather.windSpeed} km/h</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Thermometer size={16} color={Colors.accent} />
          <Text style={styles.statLabel}>{t('soilMoisture')}</Text>
          <Text style={styles.statValue}>{weather.soilMoisture}%</Text>
        </View>
      </View>

      <View style={styles.forecast}>
        {weather.forecast.map((day) => (
          <View key={day.day} style={styles.forecastDay}>
            <Text style={styles.forecastDayText}>{day.day}</Text>
            {conditionIcon(day.condition, 20)}
            <Text style={styles.forecastTemp}>{day.tempHigh}°</Text>
            {day.rainChance > 50 && (
              <Text style={styles.rainChance}>{day.rainChance}%</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTemp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tempBlock: {
    gap: 2,
  },
  temperature: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  region: {
    fontSize: 13,
    color: Colors.textSecondary,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.divider,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  forecast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastDay: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  forecastDayText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  forecastTemp: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  rainChance: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: '600' as const,
  },
});
