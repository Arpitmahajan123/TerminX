import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ChevronDown, CircleCheck as CheckCircle, AlertTriangle, Minus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import { HarvestFactor } from '@/mocks/crops';

interface TrustExplainerProps {
  factors: HarvestFactor[];
  confidence: number;
}

export default function TrustExplainer({ factors, confidence }: TrustExplainerProps) {
  const { t, isHindi } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(animValue, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const rotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const maxHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, factors.length * 80],
  });

  const impactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <CheckCircle size={16} color={Colors.success} />;
      case 'negative': return <AlertTriangle size={16} color={Colors.danger} />;
      default: return <Minus size={16} color={Colors.textMuted} />;
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{t('whyThisRec')}</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{confidence}%</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={20} color={Colors.textSecondary} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.factorsList, { maxHeight, overflow: 'hidden' as const }]}>
        {factors.map((factor, i) => (
          <View key={i} style={styles.factorRow}>
            <View style={styles.factorIcon}>
              {impactIcon(factor.impact)}
            </View>
            <View style={styles.factorContent}>
              <Text style={styles.factorName}>{isHindi ? factor.nameHi : factor.name}</Text>
              <Text style={styles.factorDesc}>{isHindi ? factor.descHi : factor.descEn}</Text>
            </View>
            <View style={styles.weightBar}>
              <View style={[styles.weightFill, { width: `${factor.weight * 100}%` }]} />
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  confidenceBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  factorsList: {
    paddingHorizontal: 14,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 10,
  },
  factorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorContent: {
    flex: 1,
    gap: 2,
  },
  factorName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  factorDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  weightBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
  },
  weightFill: {
    height: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 2,
  },
});
