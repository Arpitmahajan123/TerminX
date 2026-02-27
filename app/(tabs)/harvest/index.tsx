import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, ActivityIndicator, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sprout, AlertTriangle, Clock, CheckCircle, Calendar, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import CropSelector from '@/components/CropSelector';
import TrustExplainer from '@/components/TrustExplainer';
import DateHeader from '@/components/DateHeader';
import { Crop } from '@/mocks/crops';
import { useCrops } from '@/hooks/useCrops';
import { getUpcomingDates, DAY_SHORT_EN, DAY_SHORT_HI } from '@/constants/translations';

export default function HarvestScreen() {
  const insets = useSafeAreaInsets();
  const { t, isHindi } = useLanguage();
  const { crops, isLoading, isEnriched } = useCrops();
  const [selectedCrop, setSelectedCrop] = useState<Crop>(crops[0]);
  const [daysInput, setDaysInput] = useState('');
  const [customDays, setCustomDays] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Keep selectedCrop in sync when crops data refreshes
  useEffect(() => {
    const updated = crops.find((c) => c.id === selectedCrop.id);
    if (updated) setSelectedCrop(updated);
  }, [crops]);

  // When crop changes, reset days input
  useEffect(() => {
    setDaysInput(String(selectedCrop.currentDay));
    setCustomDays(null);
  }, [selectedCrop.id]);

  // Compute effective crop data with custom days
  const effectiveCrop = (() => {
    if (customDays === null) return selectedCrop;
    const days = Math.max(0, Math.min(customDays, selectedCrop.daysToHarvest + 30));
    const progress = days / selectedCrop.daysToHarvest;
    const daysLeft = Math.max(0, selectedCrop.daysToHarvest - days);

    // Dynamic recommendation based on days passed
    let action: 'harvest_now' | 'wait' | 'harvest_early' = 'wait';
    let confidence = 80;
    let waitDays = daysLeft;
    let reasonEn = '';
    let reasonHi = '';

    if (progress >= 1.0) {
      action = 'harvest_now';
      waitDays = 0;
      confidence = 96;
      reasonEn = `Your ${selectedCrop.name} has completed its growth cycle (${days}/${selectedCrop.daysToHarvest} days). Harvest immediately to avoid over-ripening and quality loss.`;
      reasonHi = `आपकी ${selectedCrop.nameHi} की फसल अपना विकास चक्र पूरा कर चुकी है (${days}/${selectedCrop.daysToHarvest} दिन)। अधिक पकने और गुणवत्ता हानि से बचने के लिए तुरंत कटाई करें।`;
    } else if (progress >= 0.93) {
      action = 'harvest_now';
      waitDays = 0;
      confidence = 92;
      reasonEn = `${selectedCrop.name} is ${Math.round(progress * 100)}% mature (${days}/${selectedCrop.daysToHarvest} days). Optimal harvest window is now — don't wait longer.`;
      reasonHi = `${selectedCrop.nameHi} ${Math.round(progress * 100)}% परिपक्व है (${days}/${selectedCrop.daysToHarvest} दिन)। सर्वोत्तम कटाई का समय अभी है — ज्यादा इंतजार न करें।`;
    } else if (progress >= 0.85) {
      action = 'harvest_early';
      waitDays = daysLeft;
      confidence = 85;
      reasonEn = `${selectedCrop.name} is ${Math.round(progress * 100)}% mature. You can harvest early if weather threatens, or wait ${daysLeft} more days for full maturity.`;
      reasonHi = `${selectedCrop.nameHi} ${Math.round(progress * 100)}% परिपक्व है। मौसम खराब हो तो जल्दी काट सकते हैं, या पूर्ण परिपक्वता के लिए ${daysLeft} दिन और रुकें।`;
    } else if (progress >= 0.5) {
      action = 'wait';
      waitDays = daysLeft;
      confidence = 88;
      reasonEn = `${selectedCrop.name} is at ${Math.round(progress * 100)}% growth (${days} of ${selectedCrop.daysToHarvest} days). Wait ${daysLeft} more days. Ensure proper irrigation and pest monitoring.`;
      reasonHi = `${selectedCrop.nameHi} ${Math.round(progress * 100)}% बढ़ चुकी है (${days}/${selectedCrop.daysToHarvest} दिन)। ${daysLeft} दिन और रुकें। सिंचाई और कीट निगरानी सुनिश्चित करें।`;
    } else {
      action = 'wait';
      waitDays = daysLeft;
      confidence = 82;
      reasonEn = `${selectedCrop.name} is still early stage at ${Math.round(progress * 100)}% growth. ${daysLeft} days remaining. Focus on nutrition and weed control.`;
      reasonHi = `${selectedCrop.nameHi} अभी शुरुआती चरण में है (${Math.round(progress * 100)}% बढ़वार)। ${daysLeft} दिन बाकी हैं। पोषण और खरपतवार नियंत्रण पर ध्यान दें।`;
    }

    return {
      ...selectedCrop,
      currentDay: days,
      status: progress >= 0.95 ? 'urgent' as const : progress >= 0.8 ? 'ready' as const : 'growing' as const,
      harvestRecommendation: {
        ...selectedCrop.harvestRecommendation,
        action,
        waitDays,
        confidence,
        reasonEn,
        reasonHi,
        factors: selectedCrop.harvestRecommendation.factors.map(f => {
          if (f.name === 'Crop Maturity' || f.name === 'Crop Ripeness') {
            return {
              ...f,
              impact: progress >= 0.9 ? 'positive' as const : progress >= 0.7 ? 'neutral' as const : 'negative' as const,
              descEn: `Maturity at ${Math.round(progress * 100)}% — ${progress >= 0.9 ? 'ready for harvest' : progress >= 0.7 ? 'almost ready' : 'needs more time'}`,
              descHi: `परिपक्वता ${Math.round(progress * 100)}% — ${progress >= 0.9 ? 'कटाई के लिए तैयार' : progress >= 0.7 ? 'लगभग तैयार' : 'और समय चाहिए'}`,
            };
          }
          return f;
        }),
      },
    };
  })();

  useEffect(() => {
    if (effectiveCrop.harvestRecommendation.action === 'harvest_now') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [effectiveCrop.harvestRecommendation.action, pulseAnim]);

  const rec = effectiveCrop.harvestRecommendation;

  const actionConfig = {
    harvest_now: { icon: AlertTriangle, color: Colors.danger, bg: Colors.dangerBg, label: t('harvestNow') },
    harvest_early: { icon: AlertTriangle, color: Colors.warning, bg: Colors.warningBg, label: t('harvestNow') },
    wait: { icon: Clock, color: Colors.primaryLight, bg: Colors.successBg, label: t('waitDays', { days: String(rec.waitDays) }) },
  };

  const config = actionConfig[rec.action];
  const ActionIcon = config.icon;
  const progress = effectiveCrop.currentDay / effectiveCrop.daysToHarvest;

  const handlePredict = () => {
    const val = parseInt(daysInput, 10);
    if (isNaN(val) || val < 0) {
      Alert.alert(
        isHindi ? 'अमान्य इनपुट' : 'Invalid Input',
        isHindi ? 'कृपया एक मान्य दिन संख्या दर्ज करें (0 या अधिक)' : 'Please enter a valid number of days (0 or more)',
      );
      return;
    }
    setCustomDays(val);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Sprout size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>{t('harvestAdvisor')}</Text>
        </View>
        <DateHeader showToggle={false} />
      </View>

      <CropSelector selectedCropId={selectedCrop.id} onSelect={setSelectedCrop} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.cropStatusCard}>
          <Text style={styles.cropEmoji}>{selectedCrop.icon}</Text>
          <Text style={styles.cropName}>{isHindi ? selectedCrop.nameHi : selectedCrop.name}</Text>
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {effectiveCrop.currentDay}/{effectiveCrop.daysToHarvest} {isHindi ? 'दिन' : 'days'}
            </Text>
          </View>
        </View>

        {/* ── Days Passed Input ── */}
        <View style={styles.daysInputCard}>
          <View style={styles.daysInputHeader}>
            <Calendar size={18} color={Colors.primary} />
            <Text style={styles.daysInputTitle}>
              {isHindi ? 'बुवाई के बाद कितने दिन हुए?' : 'How many days since planting?'}
            </Text>
          </View>
          <Text style={styles.daysInputHint}>
            {isHindi
              ? `${selectedCrop.nameHi} की कुल अवधि: ${selectedCrop.daysToHarvest} दिन। दिन दर्ज करके AI भविष्यवाणी पाएं।`
              : `${selectedCrop.name} cycle: ${selectedCrop.daysToHarvest} days total. Enter days to get AI prediction.`}
          </Text>
          <View style={styles.daysInputRow}>
            <TextInput
              style={styles.daysTextInput}
              value={daysInput}
              onChangeText={setDaysInput}
              keyboardType="numeric"
              placeholder={isHindi ? 'दिन संख्या...' : 'Enter days...'}
              placeholderTextColor={Colors.textMuted}
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handlePredict}
            />
            <TouchableOpacity
              onPress={handlePredict}
              style={styles.predictBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.predictBtnText}>
                {isHindi ? '🔮 भविष्यवाणी करें' : '🔮 Predict'}
              </Text>
              <ChevronRight size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {customDays !== null && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>
                {isHindi
                  ? `📊 ${customDays} दिन के आधार पर AI भविष्यवाणी`
                  : `📊 AI prediction based on ${customDays} days entered`}
              </Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.recommendationCard, { backgroundColor: config.bg, transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.recHeader}>
            <View style={[styles.recIconWrap, { backgroundColor: config.color + '20' }]}>
              <ActionIcon size={24} color={config.color} />
            </View>
            <View style={styles.recTitleBlock}>
              <Text style={[styles.recAction, { color: config.color }]}>{config.label}</Text>
              <Text style={styles.recConfidence}>
                {isHindi ? 'विश्वसनीयता' : 'Confidence'}: {rec.confidence}%
              </Text>
            </View>
          </View>
          <Text style={styles.recReason}>
            {isHindi ? rec.reasonHi : rec.reasonEn}
          </Text>
        </Animated.View>

        <View style={styles.trustSection}>
          <TrustExplainer factors={rec.factors} confidence={rec.confidence} />
        </View>

        <View style={styles.harvestWindowCard}>
          <Text style={styles.windowTitle}>{t('harvestWindow')}</Text>
          <View style={styles.windowTimeline}>
            {getUpcomingDates(5).map((date, i) => {
              const isOptimal = i <= 1;
              const isDanger = i >= 2;
              const dayLabel = isHindi
                ? `${DAY_SHORT_HI[date.getDay()]} ${date.getDate()}`
                : `${DAY_SHORT_EN[date.getDay()]} ${date.getDate()}`;
              return (
                <View key={i} style={styles.windowDay}>
                  <View style={[
                    styles.windowDot,
                    isOptimal && styles.windowDotOptimal,
                    isDanger && styles.windowDotDanger,
                  ]}>
                    {isOptimal && <CheckCircle size={14} color={Colors.white} />}
                    {isDanger && <AlertTriangle size={14} color={Colors.white} />}
                  </View>
                  <Text style={[
                    styles.windowDayText,
                    isOptimal && { color: Colors.success, fontWeight: '700' as const },
                    isDanger && { color: Colors.danger },
                  ]}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.windowLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>{t('optimal')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
              <Text style={styles.legendText}>{t('risk')}</Text>
            </View>
          </View>
        </View>

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
    color: Colors.primary,
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
  cropStatusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  cropEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  cropName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  progressSection: {
    width: '100%',
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    width: '100%',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
  daysInputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: 16,
  },
  daysInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  daysInputTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  daysInputHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  daysInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  daysTextInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    textAlign: 'center' as const,
  },
  predictBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  predictBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  customBadge: {
    marginTop: 10,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  recommendationCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  recIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitleBlock: {
    gap: 2,
  },
  recAction: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  recConfidence: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recReason: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text,
  },
  trustSection: {
    marginBottom: 16,
  },
  harvestWindowCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  windowTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  windowTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  windowDay: {
    alignItems: 'center',
    gap: 8,
  },
  windowDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowDotOptimal: {
    backgroundColor: Colors.success,
  },
  windowDotDanger: {
    backgroundColor: Colors.danger,
  },
  windowDayText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  windowLegend: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
