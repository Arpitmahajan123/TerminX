/**
 * AgriChain AI Service — Runs entirely on-device (Android/iOS)
 *
 * 4 ML model behaviors ported from Python to TypeScript:
 * 1. XGBoost-style: Seasonal price prediction engine
 * 2. LSTM-style: Pre-computed deep learning forecasts + rolling prediction
 * 3. RandomForest: Composite risk-scoring harvest decision
 * 4. GradientBoosting: Environmental spoilage risk classification
 *
 * All computation runs locally — no Python server needed.
 * Optional: connect to localhost:8000 for enhanced predictions.
 */

import {
  localPredict,
  localGetPriceForecastResponse,
  localGetCrops,
  localGetModelInfo,
  localGetHealth,
  localGetAutoPrices,
} from './farmwiseLocalEngine';

// ─── Configuration ───
const FARMWISE_API_URL = 'http://localhost:8000';

// ─── Types ───

export interface FarmWisePredictionInput {
  crop: string;
  crop_age_days: number;
  rain_pct: number;
  humidity: number;
  price_current: number;
  price_predicted_7d: number;
  date?: string;
  storage_temp?: number;
  transit_hrs?: number;
  has_cold_chain?: boolean;
  quantity_quintals?: number;
  budget_per_quintal?: number;
}

export interface RiskBreakdown {
  weather: { score: number; weight: string };
  humidity: { score: number; weight: string };
  price: { score: number; weight: string };
  maturity: { score: number; weight: string };
}

export interface MarketRanking {
  market: string;
  tier: number;
  est_price: number;
  transit_hrs: number;
  transport_cost: number;
  spoilage_loss_pct: number;
  net_revenue_per_q: number;
  total_profit: number;
  rank: number;
  recommended: boolean;
}

export interface PreservationAction {
  action: string;
  cost_per_quintal: number;
  effectiveness_pct: number;
  shelf_extension_days: number;
  score: number;
  risk_after: number;
  rank: number;
}

export interface ExplainabilityFactor {
  factor: string;
  importance: number;
}

export interface FarmWisePrediction {
  status: string;
  input: {
    crop: string;
    crop_age_days: number;
    date: string;
    rain_pct: number;
    humidity: number;
    price_current: number;
    price_predicted_7d: number;
    price_chg: number;
    maturity_pct: number;
  };
  recommendation: {
    final_decision: 'HARVEST_NOW' | 'WAIT' | 'DELAY';
    confidence_pct: number;
    optimal_harvest_window: {
      start_date: string;
      end_date: string;
      window_days: number;
    };
    ml_decision: string;
    ml_probabilities: Record<string, number>;
  };
  risk_analysis: {
    composite_score: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    breakdown: RiskBreakdown;
  };
  best_market: MarketRanking;
  all_markets: MarketRanking[];
  spoilage: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    estimated_loss_pct: number;
    probabilities: Record<string, number>;
    preservation_actions: PreservationAction[];
  };
  explainability: ExplainabilityFactor[];
  crop_info: {
    maturity_days: number[];
    optimal_temp: number[];
    critical_humidity: number;
    rain_tolerance: string;
    shelf_life_days: number;
    harvest_season: string[];
  };
}

export interface PriceForecast {
  date: string;
  day: string;
  price: number;
}

export interface PriceForecastResponse {
  commodity: string;
  market: string;
  forecasts: PriceForecast[];
  lstm_forecasts?: PriceForecast[];
  metrics: Record<string, any>;
}

export interface CropInfo {
  maturity_days: number[];
  harvest_season: string[];
  shelf_life_days: number;
  rain_tolerance: string;
  base_price: number;
}

export interface ModelInfo {
  name: string;
  algorithm: string;
  icon: string;
  status: string;
  metrics: Record<string, string>;
  config: Record<string, any>;
  feature_importances: Array<{ feature: string; importance: number }>;
  description: string;
}

export interface HealthStatus {
  status: string;
  models: boolean;
  metrics: Record<string, number>;
  crops: string[];
  lstm_available: boolean;
}

export interface AutoPrices {
  status: string;
  crop: string;
  current_price: number;
  predicted_7d: number;
  lstm_available: boolean;
  source: string;
}

// ─── API Status Check ───
let _apiAvailable: boolean | null = null;
let _lastCheck = 0;
const CHECK_INTERVAL = 30_000;

export async function isApiAvailable(): Promise<boolean> {
  if (_apiAvailable !== null && Date.now() - _lastCheck < CHECK_INTERVAL) {
    return _apiAvailable;
  }
  try {
    const res = await fetch(`${FARMWISE_API_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    _apiAvailable = res.ok;
  } catch {
    _apiAvailable = false;
  }
  _lastCheck = Date.now();
  return _apiAvailable;
}

// ─── Core API Calls (local-first, optional server fallback) ───

/**
 * Full AI prediction — runs on-device, falls back to server if available
 */
export async function getAIPrediction(input: FarmWisePredictionInput): Promise<FarmWisePrediction> {
  // Try server first for enhanced ML predictions
  try {
    const online = await isApiAvailable();
    if (online) {
      const res = await fetch(`${FARMWISE_API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return res.json();
    }
  } catch { /* fall through to local */ }

  // Local engine — always works, no server needed
  return localPredict(input);
}

/**
 * Price forecast — local engine with optional server enhancement
 */
export async function getPriceForecast(crop?: string): Promise<PriceForecastResponse> {
  try {
    const online = await isApiAvailable();
    if (online) {
      const res = await fetch(`${FARMWISE_API_URL}/api/price-forecast`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return res.json();
    }
  } catch { /* fall through */ }
  return localGetPriceForecastResponse(crop);
}

/**
 * Get available crops — always available locally
 */
export async function getAICrops(): Promise<Record<string, CropInfo>> {
  try {
    const online = await isApiAvailable();
    if (online) {
      const res = await fetch(`${FARMWISE_API_URL}/api/crops`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return data.crops;
      }
    }
  } catch { /* fall through */ }
  return localGetCrops();
}

/**
 * Model details — always available locally
 */
export async function getModelInfo(): Promise<ModelInfo[]> {
  try {
    const online = await isApiAvailable();
    if (online) {
      const res = await fetch(`${FARMWISE_API_URL}/api/models`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return data.models;
      }
    }
  } catch { /* fall through */ }
  return localGetModelInfo();
}

/**
 * Health status — always healthy locally
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  try {
    const online = await isApiAvailable();
    if (online) {
      const res = await fetch(`${FARMWISE_API_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return res.json();
    }
  } catch { /* fall through */ }
  return localGetHealth();
}

/**
 * Auto-filled prices — always available locally
 */
export async function getAutoPrices(crop: string): Promise<AutoPrices> {
  try {
    const online = await isApiAvailable();
    if (online) {
      const res = await fetch(`${FARMWISE_API_URL}/api/auto-prices?crop=${encodeURIComponent(crop)}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return res.json();
    }
  } catch { /* fall through */ }
  return localGetAutoPrices(crop);
}

/**
 * Weather auto-fill from Open-Meteo (direct call, no server proxy needed)
 */
export async function getAIWeather(lat = 19.9975, lon = 73.7898): Promise<{
  status: string;
  current: {
    temperature: number;
    humidity: number;
    precipitation_mm: number;
    rain_mm: number;
    wind_speed: number;
  };
  forecast_7d: {
    rain_probability_today: number;
    rain_probability_avg: number;
    daily_rain_probs: number[];
    daily_temp_max: number[];
    daily_temp_min: number[];
    dates: string[];
  };
  auto_fill: {
    rain_pct: number;
    humidity: number;
    storage_temp: number;
  };
}> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m` +
      `&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=Asia%2FKolkata&forecast_days=7`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await resp.json();
    const current = data.current || {};
    const daily = data.daily || {};
    const rainProbs: number[] = daily.precipitation_probability_max || [0];
    const avgRain = rainProbs.reduce((a: number, b: number) => a + b, 0) / rainProbs.length;
    return {
      status: 'success',
      current: {
        temperature: Math.round((current.temperature_2m || 30) * 10) / 10,
        humidity: current.relative_humidity_2m || 60,
        precipitation_mm: current.precipitation || 0,
        rain_mm: current.rain || 0,
        wind_speed: current.wind_speed_10m || 0,
      },
      forecast_7d: {
        rain_probability_today: rainProbs[0] || 0,
        rain_probability_avg: Math.round(avgRain * 10) / 10,
        daily_rain_probs: rainProbs,
        daily_temp_max: daily.temperature_2m_max || [],
        daily_temp_min: daily.temperature_2m_min || [],
        dates: daily.time || [],
      },
      auto_fill: {
        rain_pct: Math.round(rainProbs[0] || 15),
        humidity: current.relative_humidity_2m || 55,
        storage_temp: Math.round(current.temperature_2m || 30),
      },
    };
  } catch {
    return {
      status: 'fallback',
      current: { temperature: 30, humidity: 55, precipitation_mm: 0, rain_mm: 0, wind_speed: 5 },
      forecast_7d: { rain_probability_today: 15, rain_probability_avg: 15, daily_rain_probs: [], daily_temp_max: [], daily_temp_min: [], dates: [] },
      auto_fill: { rain_pct: 15, humidity: 55, storage_temp: 30 },
    };
  }
}
