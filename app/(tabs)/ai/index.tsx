import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Truck,
  Award,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Server,
  BarChart3,
  Leaf,
  Thermometer,
  Droplets,
  CloudRain,
  Package,
  RefreshCw,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import DateHeader from '@/components/DateHeader';
import { useAIStatus, useAIPrediction, useModelInfo, useAIWeather, useAutoPrices } from '@/hooks/useFarmwise';
import { FarmWisePrediction } from '@/services/farmwiseService';
import { useUserLocation } from '@/hooks/useLocation';

const AI_CROPS = ['Tomato', 'Wheat', 'Rice', 'Onion', 'Potato'];

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguage();
  const { location: userLoc } = useUserLocation();
  const { data: aiStatus } = useAIStatus();
  const prediction = useAIPrediction();
  const { data: models } = useModelInfo();
  const { data: weather } = useAIWeather(userLoc.lat, userLoc.lon);

  // Form state
  const [crop, setCrop] = useState('Tomato');
  const [cropAge, setCropAge] = useState('75');
  const [rainPct, setRainPct] = useState('15');
  const [humidity, setHumidity] = useState('55');
  const [priceCurrent, setPriceCurrent] = useState('2200');
  const [price7d, setPrice7d] = useState('2350');
  const [quantity, setQuantity] = useState('10');

  // Auto-fill prices when crop changes
  const { data: autoPrices } = useAutoPrices(crop);
  useEffect(() => {
    if (autoPrices) {
      setPriceCurrent(String(autoPrices.current_price));
      setPrice7d(String(autoPrices.predicted_7d));
    }
  }, [autoPrices]);

  // Auto-fill weather data
  useEffect(() => {
    if (weather?.auto_fill) {
      setRainPct(String(weather.auto_fill.rain_pct));
      setHumidity(String(weather.auto_fill.humidity));
    }
  }, [weather]);

  // UI state
  const [showModels, setShowModels] = useState(false);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [showPreservation, setShowPreservation] = useState(false);

  const result: FarmWisePrediction | undefined = prediction.data;

  const handlePredict = useCallback(() => {
    prediction.mutate({
      crop,
      crop_age_days: parseInt(cropAge) || 75,
      rain_pct: parseFloat(rainPct) || 15,
      humidity: parseFloat(humidity) || 55,
      price_current: parseFloat(priceCurrent) || 2200,
      price_predicted_7d: parseFloat(price7d) || 2350,
      quantity_quintals: parseInt(quantity) || 10,
    });
  }, [crop, cropAge, rainPct, humidity, priceCurrent, price7d, quantity]);

  const decisionColor = (d: string) => {
    switch (d) {
      case 'HARVEST_NOW': return Colors.success;
      case 'WAIT': return '#f59e0b';
      case 'DELAY': return Colors.danger;
      default: return Colors.textMuted;
    }
  };

  const riskColor = (level: string) => {
    switch (level) {
      case 'LOW': return Colors.success;
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#f97316';
      case 'CRITICAL': return Colors.danger;
      default: return Colors.textMuted;
    }
  };

  const decisionLabel = (d: string) => {
    if (isHindi) {
      switch (d) {
        case 'HARVEST_NOW': return '🌾 अभी काटें';
        case 'WAIT': return '⏳ प्रतीक्षा करें';
        case 'DELAY': return '⚠️ रुकें';
        default: return d;
      }
    }
    switch (d) {
      case 'HARVEST_NOW': return '🌾 Harvest Now';
      case 'WAIT': return '⏳ Wait';
      case 'DELAY': return '⚠️ Delay';
      default: return d;
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Brain size={24} color="#a855f7" />
          <Text style={styles.headerTitle}>
            {isHindi ? 'AgriChain AI सलाहकार' : 'AgriChain AI Advisor'}
          </Text>
        </View>
        <DateHeader showToggle={false} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Description */}
        <View style={styles.descCard}>
          <Zap size={16} color="#a855f7" />
          <Text style={styles.descText}>
            {isHindi
              ? '4 ML मॉडल डिवाइस पर चलते हैं — मूल्य भविष्यवाणी, कटाई निर्णय, खराबी जोखिम, मंडी रैंकिंग। किसी सर्वर की जरूरत नहीं।'
              : '4 ML models run on your phone — price prediction, harvest decision, spoilage risk, market ranking. No server needed.'}
          </Text>
        </View>

        {/* Input Form */}
        <Text style={styles.sectionTitle}>
          {isHindi ? '📋 फसल विवरण दर्ज करें' : '📋 Enter Crop Details'}
        </Text>

        {/* Crop selector */}
        <Text style={styles.inputLabel}>{isHindi ? 'फसल' : 'Crop'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropRow}>
          {AI_CROPS.map((c) => (
            <Pressable
              key={c}
              style={[styles.cropChip, crop === c && styles.cropChipActive]}
              onPress={() => setCrop(c)}
            >
              <Text style={[styles.cropChipText, crop === c && styles.cropChipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Form fields */}
        <View style={styles.formGrid}>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>
              <Leaf size={12} color={Colors.textMuted} /> {isHindi ? 'फसल उम्र (दिन)' : 'Crop Age (days)'}
            </Text>
            <TextInput style={styles.input} value={cropAge} onChangeText={setCropAge} keyboardType="numeric" />
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>
              <CloudRain size={12} color={Colors.textMuted} /> {isHindi ? 'बारिश %' : 'Rain %'}
            </Text>
            <View style={[styles.input, styles.inputReadOnly]}>
              <Text style={styles.inputReadOnlyText}>{rainPct}%</Text>
            </View>
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>
              <Droplets size={12} color={Colors.textMuted} /> {isHindi ? 'नमी %' : 'Humidity %'}
            </Text>
            <View style={[styles.input, styles.inputReadOnly]}>
              <Text style={styles.inputReadOnlyText}>{humidity}%</Text>
            </View>
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>
              <TrendingUp size={12} color={Colors.textMuted} /> {isHindi ? 'वर्तमान मूल्य ₹' : 'Current Price ₹'}
            </Text>
            <TextInput style={styles.input} value={priceCurrent} onChangeText={setPriceCurrent} keyboardType="numeric" />
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>
              <BarChart3 size={12} color={Colors.textMuted} /> {isHindi ? '7-दिन भविष्यवाणी ₹' : '7d Predicted ₹'}
            </Text>
            <TextInput style={styles.input} value={price7d} onChangeText={setPrice7d} keyboardType="numeric" />
          </View>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>
              <Package size={12} color={Colors.textMuted} /> {isHindi ? 'मात्रा (क्विं)' : 'Qty (quintals)'}
            </Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </View>
        </View>

        {/* Predict Button */}
        <Pressable
          style={[styles.predictBtn, prediction.isPending && styles.predictBtnDisabled]}
          onPress={handlePredict}
          disabled={prediction.isPending}
        >
          {prediction.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Brain size={18} color="#fff" />
              <Text style={styles.predictBtnText}>
                {isHindi ? '🧠 AI भविष्यवाणी चलाएं' : '🧠 Run AI Prediction'}
              </Text>
            </>
          )}
        </Pressable>

        {prediction.isError && (
          <View style={styles.errorCard}>
            <AlertTriangle size={16} color={Colors.danger} />
            <Text style={styles.errorText}>
              {isHindi
                ? 'AI भविष्यवाणी में त्रुटि। कृपया इनपुट जांचें और पुनः प्रयास करें।'
                : 'AI prediction error. Please check inputs and try again.'}
            </Text>
          </View>
        )}

        {/* ═══ RESULTS ═══ */}
        {result && (
          <>
            {/* Decision Card */}
            <View style={[styles.decisionCard, { borderColor: decisionColor(result.recommendation.final_decision) }]}>
              <View style={styles.decisionHeader}>
                <Text style={[styles.decisionText, { color: decisionColor(result.recommendation.final_decision) }]}>
                  {decisionLabel(result.recommendation.final_decision)}
                </Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {result.recommendation.confidence_pct.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.windowRow}>
                <Text style={styles.windowLabel}>
                  {isHindi ? 'इष्टतम कटाई खिड़की' : 'Optimal Harvest Window'}
                </Text>
                <Text style={styles.windowDates}>
                  {result.recommendation.optimal_harvest_window.start_date} →{' '}
                  {result.recommendation.optimal_harvest_window.end_date}
                  {' '}({result.recommendation.optimal_harvest_window.window_days} {isHindi ? 'दिन' : 'days'})
                </Text>
              </View>

              {/* ML Probabilities */}
              <View style={styles.probRow}>
                {Object.entries(result.recommendation.ml_probabilities).map(([cls, prob]) => (
                  <View key={cls} style={styles.probItem}>
                    <Text style={styles.probLabel}>{cls}</Text>
                    <View style={styles.probBarBg}>
                      <View style={[styles.probBarFill, { width: `${prob}%`, backgroundColor: decisionColor(cls) }]} />
                    </View>
                    <Text style={styles.probValue}>{prob.toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Risk Analysis */}
            <Text style={styles.sectionTitle}>
              {isHindi ? '⚡ जोखिम विश्लेषण' : '⚡ Risk Analysis'}
            </Text>
            <View style={styles.riskCard}>
              <View style={styles.riskScoreRow}>
                <Text style={styles.riskScoreLabel}>
                  {isHindi ? 'समग्र जोखिम' : 'Composite Risk'}
                </Text>
                <View style={[styles.riskBadge, { backgroundColor: riskColor(result.risk_analysis.risk_level) + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: riskColor(result.risk_analysis.risk_level) }]}>
                    {result.risk_analysis.composite_score.toFixed(1)} — {result.risk_analysis.risk_level}
                  </Text>
                </View>
              </View>

              {/* Risk breakdown bars */}
              {Object.entries(result.risk_analysis.breakdown).map(([key, val]) => {
                const label = isHindi
                  ? { weather: 'मौसम', humidity: 'नमी', price: 'मूल्य', maturity: 'परिपक्वता' }[key] || key
                  : key.charAt(0).toUpperCase() + key.slice(1);
                const barColor = val.score <= 25 ? Colors.success : val.score <= 50 ? '#f59e0b' : val.score <= 75 ? '#f97316' : Colors.danger;
                return (
                  <View key={key} style={styles.riskRow}>
                    <Text style={styles.riskLabel}>{label} ({val.weight})</Text>
                    <View style={styles.riskBarBg}>
                      <View style={[styles.riskBarFill, { width: `${val.score}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={[styles.riskValue, { color: barColor }]}>{val.score.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Best Market */}
            <Text style={styles.sectionTitle}>
              {isHindi ? '🏪 सर्वश्रेष्ठ मंडी' : '🏪 Best Market'}
            </Text>
            {result.best_market && (
              <View style={styles.marketCard}>
                <View style={styles.marketHeader}>
                  <View style={styles.marketNameRow}>
                    <Award size={18} color={Colors.accent} />
                    <Text style={styles.marketName}>{result.best_market.market.replace(/_/g, ' ')}</Text>
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierText}>Tier {result.best_market.tier}</Text>
                    </View>
                  </View>
                  <Text style={styles.marketProfit}>
                    ₹{result.best_market.total_profit.toLocaleString()}
                  </Text>
                  <Text style={styles.marketProfitLabel}>
                    {isHindi ? `${quantity} क्विंटल पर कुल लाभ` : `Total profit for ${quantity} quintals`}
                  </Text>
                </View>
                <View style={styles.marketStats}>
                  <View style={styles.marketStat}>
                    <TrendingUp size={14} color={Colors.success} />
                    <Text style={styles.marketStatLabel}>{isHindi ? 'मूल्य' : 'Price'}</Text>
                    <Text style={styles.marketStatValue}>₹{result.best_market.est_price}/q</Text>
                  </View>
                  <View style={styles.marketStat}>
                    <Truck size={14} color={Colors.primaryLight} />
                    <Text style={styles.marketStatLabel}>{isHindi ? 'पारगमन' : 'Transit'}</Text>
                    <Text style={styles.marketStatValue}>{result.best_market.transit_hrs}h</Text>
                  </View>
                  <View style={styles.marketStat}>
                    <AlertTriangle size={14} color="#f59e0b" />
                    <Text style={styles.marketStatLabel}>{isHindi ? 'खराबी' : 'Spoilage'}</Text>
                    <Text style={styles.marketStatValue}>{result.best_market.spoilage_loss_pct}%</Text>
                  </View>
                  <View style={styles.marketStat}>
                    <MapPin size={14} color={Colors.textMuted} />
                    <Text style={styles.marketStatLabel}>{isHindi ? 'परिवहन' : 'Transport'}</Text>
                    <Text style={styles.marketStatValue}>₹{result.best_market.transport_cost}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* All Markets Toggle */}
            <Pressable style={styles.toggleRow} onPress={() => setShowAllMarkets(!showAllMarkets)}>
              <Text style={styles.toggleText}>
                {isHindi ? `सभी ${result.all_markets.length} मंडियां` : `All ${result.all_markets.length} Markets`}
              </Text>
              {showAllMarkets ? <ChevronUp size={16} color={Colors.primary} /> : <ChevronDown size={16} color={Colors.primary} />}
            </Pressable>
            {showAllMarkets && (
              <View style={styles.allMarkets}>
                {result.all_markets.map((m) => (
                  <View key={m.market} style={[styles.miniMarket, m.recommended && styles.miniMarketRec]}>
                    <View style={styles.miniMarketRow}>
                      <Text style={styles.miniMarketName}>
                        {m.rank}. {m.market.replace(/_/g, ' ')}
                        {m.recommended ? ' ⭐' : ''}
                      </Text>
                      <Text style={[styles.miniMarketProfit, { color: m.net_revenue_per_q > 0 ? Colors.success : Colors.danger }]}>
                        ₹{m.net_revenue_per_q}/q
                      </Text>
                    </View>
                    <Text style={styles.miniMarketDetails}>
                      Price ₹{m.est_price} | {m.transit_hrs}h | Spoilage {m.spoilage_loss_pct}% | Transport ₹{m.transport_cost}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Spoilage & Preservation */}
            <Text style={styles.sectionTitle}>
              {isHindi ? '🧪 खराबी जोखिम' : '🧪 Spoilage Risk'}
            </Text>
            <View style={styles.spoilageCard}>
              <View style={styles.spoilageHeader}>
                <View style={[styles.spoilageBadge, { backgroundColor: riskColor(result.spoilage.risk_level) + '20' }]}>
                  {result.spoilage.risk_level === 'LOW' ? (
                    <ShieldCheck size={16} color={riskColor(result.spoilage.risk_level)} />
                  ) : (
                    <ShieldAlert size={16} color={riskColor(result.spoilage.risk_level)} />
                  )}
                  <Text style={[styles.spoilageBadgeText, { color: riskColor(result.spoilage.risk_level) }]}>
                    {result.spoilage.risk_level}
                  </Text>
                </View>
                <Text style={styles.spoilageLoss}>
                  ~{result.spoilage.estimated_loss_pct}% {isHindi ? 'हानि' : 'loss'}
                </Text>
              </View>

              {/* Spoilage probabilities */}
              <View style={styles.probRow}>
                {Object.entries(result.spoilage.probabilities).map(([cls, prob]) => (
                  <View key={cls} style={styles.probItem}>
                    <Text style={styles.probLabel}>{cls}</Text>
                    <View style={styles.probBarBg}>
                      <View style={[styles.probBarFill, { width: `${prob}%`, backgroundColor: riskColor(cls) }]} />
                    </View>
                    <Text style={styles.probValue}>{prob.toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Preservation Actions Toggle */}
            <Pressable style={styles.toggleRow} onPress={() => setShowPreservation(!showPreservation)}>
              <Text style={styles.toggleText}>
                {isHindi ? '💊 संरक्षण सुझाव' : '💊 Preservation Actions'}
              </Text>
              {showPreservation ? <ChevronUp size={16} color={Colors.primary} /> : <ChevronDown size={16} color={Colors.primary} />}
            </Pressable>
            {showPreservation && result.spoilage.preservation_actions.length > 0 && (
              <View style={styles.preservationList}>
                {result.spoilage.preservation_actions.map((p) => (
                  <View key={p.action} style={styles.preservationItem}>
                    <View style={styles.preservationHeader}>
                      <Text style={styles.preservationRank}>#{p.rank}</Text>
                      <Text style={styles.preservationName}>{p.action}</Text>
                      <Text style={styles.preservationScore}>Score: {p.score}</Text>
                    </View>
                    <Text style={styles.preservationDetails}>
                      ₹{p.cost_per_quintal}/q | {p.effectiveness_pct}% effective | +{p.shelf_extension_days} days | Risk→{p.risk_after}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Explainability */}
            <Text style={styles.sectionTitle}>
              {isHindi ? '🔍 AI व्याख्या' : '🔍 AI Explainability'}
            </Text>
            <View style={styles.explainCard}>
              <Text style={styles.explainSubtitle}>
                {isHindi ? 'शीर्ष निर्णय कारक (RandomForest)' : 'Top Decision Factors (RandomForest)'}
              </Text>
              {result.explainability.map((e, i) => (
                <View key={e.factor} style={styles.explainRow}>
                  <Text style={styles.explainFactor}>{i + 1}. {e.factor}</Text>
                  <View style={styles.explainBarBg}>
                    <View style={[styles.explainBarFill, { width: `${e.importance * 100 * 3}%` }]} />
                  </View>
                  <Text style={styles.explainValue}>{(e.importance * 100).toFixed(1)}%</Text>
                </View>
              ))}
            </View>

            {/* Crop Info */}
            <View style={styles.cropInfoCard}>
              <Text style={styles.cropInfoTitle}>
                {isHindi ? `📋 ${result.input.crop} — फसल विवरण` : `📋 ${result.input.crop} — Crop Profile`}
              </Text>
              <View style={styles.cropInfoGrid}>
                <View style={styles.cropInfoItem}>
                  <Text style={styles.cropInfoLabel}>{isHindi ? 'परिपक्वता' : 'Maturity'}</Text>
                  <Text style={styles.cropInfoValue}>{result.crop_info.maturity_days.join('-')} days</Text>
                </View>
                <View style={styles.cropInfoItem}>
                  <Text style={styles.cropInfoLabel}>{isHindi ? 'शेल्फ लाइफ' : 'Shelf Life'}</Text>
                  <Text style={styles.cropInfoValue}>{result.crop_info.shelf_life_days} days</Text>
                </View>
                <View style={styles.cropInfoItem}>
                  <Text style={styles.cropInfoLabel}>{isHindi ? 'बारिश सहनशीलता' : 'Rain Tolerance'}</Text>
                  <Text style={styles.cropInfoValue}>{result.crop_info.rain_tolerance}</Text>
                </View>
                <View style={styles.cropInfoItem}>
                  <Text style={styles.cropInfoLabel}>{isHindi ? 'इष्टतम तापमान' : 'Optimal Temp'}</Text>
                  <Text style={styles.cropInfoValue}>{result.crop_info.optimal_temp.join('-')}°C</Text>
                </View>
              </View>
              <Text style={styles.cropInfoSeason}>
                {isHindi ? 'मौसम' : 'Season'}: {result.crop_info.harvest_season.join(', ')}
              </Text>
            </View>
          </>
        )}

        {/* Models Info Toggle */}
        <Pressable style={styles.toggleRow} onPress={() => setShowModels(!showModels)}>
          <Text style={styles.toggleText}>
            {isHindi ? '🤖 AI मॉडल विवरण' : '🤖 AI Model Details'}
          </Text>
          {showModels ? <ChevronUp size={16} color={Colors.primary} /> : <ChevronDown size={16} color={Colors.primary} />}
        </Pressable>
        {showModels && models && (
          <View style={styles.modelsList}>
            {models.map((m) => (
              <View key={m.name} style={styles.modelCard}>
                <View style={styles.modelHeader}>
                  <Text style={styles.modelIcon}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modelName}>{m.name}</Text>
                    <Text style={styles.modelAlgo}>{m.algorithm}</Text>
                  </View>
                  <View style={[styles.modelStatus, { backgroundColor: m.status === 'active' ? Colors.success + '20' : '#ef444420' }]}>
                    <Text style={[styles.modelStatusText, { color: m.status === 'active' ? Colors.success : Colors.danger }]}>
                      {m.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modelDesc}>{m.description}</Text>
                <View style={styles.modelMetrics}>
                  {Object.entries(m.metrics).map(([k, v]) => (
                    <View key={k} style={styles.metricItem}>
                      <Text style={styles.metricLabel}>{k}</Text>
                      <Text style={styles.metricValue}>{String(v)}</Text>
                    </View>
                  ))}
                </View>
                {m.feature_importances.length > 0 && (
                  <View style={styles.modelFeatures}>
                    <Text style={styles.featureTitle}>Top Features:</Text>
                    {m.feature_importances.slice(0, 5).map((fi) => (
                      <Text key={fi.feature} style={styles.featureItem}>
                        • {fi.feature}: {(fi.importance * 100).toFixed(1)}%
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* On-device info hint (shown when no prediction yet) */}
        {!result && !prediction.isPending && (
          <View style={styles.offlineCard}>
            <Smartphone size={32} color="#a855f7" />
            <Text style={styles.offlineTitle}>
              {isHindi ? 'AI आपके फोन पर चलता है' : 'AI Runs On Your Phone'}
            </Text>
            <Text style={styles.offlineText}>
              {isHindi
                ? 'सभी 4 ML मॉडल आपके डिवाइस पर चलते हैं। इंटरनेट या सर्वर की जरूरत नहीं। ऊपर फसल का विवरण भरें और AI भविष्यवाणी चलाएं।'
                : 'All 4 ML models run on your device. No internet or server needed. Fill in crop details above and run AI prediction.'}
            </Text>
            <View style={styles.chipRow}>
              <View style={styles.infoChip}><Text style={styles.infoChipText}>📈 Price Engine</Text></View>
              <View style={styles.infoChip}><Text style={styles.infoChipText}>🌾 Harvest AI</Text></View>
              <View style={styles.infoChip}><Text style={styles.infoChipText}>🧪 Spoilage Risk</Text></View>
              <View style={styles.infoChip}><Text style={styles.infoChipText}>🏪 Market Rank</Text></View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  descCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#a855f710', padding: 12, borderRadius: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#a855f730',
  },
  descText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 16, marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 4 },

  cropRow: { marginBottom: 8 },
  cropChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, marginRight: 8,
  },
  cropChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cropChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  cropChipTextActive: { color: '#fff' },

  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formField: { width: '48%' as any },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: Colors.text,
  },
  inputReadOnly: {
    backgroundColor: '#f0f4f8', justifyContent: 'center' as const,
  },
  inputReadOnlyText: {
    fontSize: 14, color: Colors.text, fontWeight: '600' as const,
  },

  predictBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#a855f7', paddingVertical: 14, borderRadius: 12,
    marginTop: 16, marginBottom: 8,
  },
  predictBtnDisabled: { opacity: 0.6 },
  predictBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ef444415', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#ef444440',
  },
  errorText: { flex: 1, fontSize: 12, color: Colors.danger },

  decisionCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginTop: 16, borderWidth: 2,
  },
  decisionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  decisionText: { fontSize: 22, fontWeight: '800' },
  confidenceBadge: {
    backgroundColor: Colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  confidenceText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  windowRow: { marginBottom: 12 },
  windowLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  windowDates: { fontSize: 14, fontWeight: '600', color: Colors.text },

  probRow: { gap: 6 },
  probItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  probLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, width: 80 },
  probBarBg: { flex: 1, height: 6, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  probBarFill: { height: '100%', borderRadius: 3 },
  probValue: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, width: 36, textAlign: 'right' },

  riskCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  riskScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  riskScoreLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  riskBadgeText: { fontSize: 13, fontWeight: '700' },

  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  riskLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, width: 100 },
  riskBarBg: { flex: 1, height: 6, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  riskBarFill: { height: '100%', borderRadius: 3 },
  riskValue: { fontSize: 11, fontWeight: '700', width: 30, textAlign: 'right' },

  marketCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  marketHeader: { marginBottom: 12 },
  marketNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  marketName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  tierBadge: { backgroundColor: Colors.primaryLight + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tierText: { fontSize: 10, fontWeight: '700', color: Colors.primaryLight },
  marketProfit: { fontSize: 24, fontWeight: '800', color: Colors.success },
  marketProfitLabel: { fontSize: 11, color: Colors.textSecondary },

  marketStats: { flexDirection: 'row', justifyContent: 'space-between' },
  marketStat: { alignItems: 'center', gap: 2 },
  marketStatLabel: { fontSize: 10, color: Colors.textSecondary },
  marketStatValue: { fontSize: 12, fontWeight: '700', color: Colors.text },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 4, marginTop: 8,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  allMarkets: { gap: 6, marginBottom: 8 },
  miniMarket: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  miniMarketRec: { borderColor: Colors.accent + '60' },
  miniMarketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniMarketName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  miniMarketProfit: { fontSize: 14, fontWeight: '700' },
  miniMarketDetails: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },

  spoilageCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  spoilageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  spoilageBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  spoilageBadgeText: { fontSize: 14, fontWeight: '700' },
  spoilageLoss: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  preservationList: { gap: 6, marginBottom: 8 },
  preservationItem: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  preservationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  preservationRank: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  preservationName: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  preservationScore: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  preservationDetails: { fontSize: 10, color: Colors.textSecondary },

  explainCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  explainSubtitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  explainRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  explainFactor: { fontSize: 11, fontWeight: '500', color: Colors.text, width: 100 },
  explainBarBg: { flex: 1, height: 6, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  explainBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#a855f7' },
  explainValue: { fontSize: 11, fontWeight: '700', color: '#a855f7', width: 36, textAlign: 'right' },

  cropInfoCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, marginTop: 12,
  },
  cropInfoTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  cropInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropInfoItem: {
    width: '47%' as any, backgroundColor: Colors.background, borderRadius: 8, padding: 8,
  },
  cropInfoLabel: { fontSize: 10, color: Colors.textSecondary },
  cropInfoValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  cropInfoSeason: { fontSize: 11, color: Colors.textSecondary, marginTop: 8 },

  modelsList: { gap: 10, marginBottom: 12 },
  modelCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  modelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modelIcon: { fontSize: 24 },
  modelName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  modelAlgo: { fontSize: 11, color: Colors.textSecondary },
  modelStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  modelStatusText: { fontSize: 10, fontWeight: '700' },
  modelDesc: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16, marginBottom: 8 },
  modelMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  metricItem: {
    backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  metricLabel: { fontSize: 9, color: Colors.textMuted },
  metricValue: { fontSize: 11, fontWeight: '700', color: Colors.text },
  modelFeatures: { marginTop: 4 },
  featureTitle: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  featureItem: { fontSize: 10, color: Colors.textMuted, lineHeight: 16 },

  offlineCard: {
    alignItems: 'center', padding: 30, marginTop: 20,
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: '#a855f730',
  },
  offlineTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 12, marginBottom: 6 },
  offlineText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  },
  infoChip: {
    backgroundColor: '#a855f715', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: '#a855f730',
  },
  infoChipText: { fontSize: 11, fontWeight: '600', color: '#a855f7' },
});
