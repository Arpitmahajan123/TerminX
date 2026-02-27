import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CloudRain, TrendingUp, Package } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Alert } from '@/mocks/mandis';
import { useLanguage } from '@/hooks/useLanguage';

interface AlertCardProps {
  key?: string;
  alert: Alert;
}

const alertIconMap = {
  weather: CloudRain,
  price: TrendingUp,
  spoilage: Package,
  harvest: AlertTriangle,
};

const severityColors = {
  info: { bg: Colors.infoBg, border: Colors.info, text: Colors.info },
  warning: { bg: Colors.warningBg, border: Colors.warning, text: '#B8860B' },
  danger: { bg: Colors.dangerBg, border: Colors.danger, text: Colors.danger },
};

export default function AlertCard({ alert }: AlertCardProps) {
  const { isHindi } = useLanguage();
  const Icon = alertIconMap[alert.type];
  const colors = severityColors[alert.severity];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <View style={styles.iconWrap}>
        <Icon size={20} color={colors.text} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isHindi ? alert.titleHi : alert.titleEn}
        </Text>
        <Text style={styles.desc}>
          {isHindi ? alert.descHi : alert.descEn}
        </Text>
        <Text style={styles.time}>{alert.timestamp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
