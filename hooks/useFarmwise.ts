import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getAIPrediction,
  getPriceForecast,
  getAICrops,
  getModelInfo,
  getHealthStatus,
  getAutoPrices,
  getAIWeather,
  isApiAvailable,
  FarmWisePredictionInput,
  FarmWisePrediction,
  PriceForecastResponse,
  CropInfo,
  ModelInfo,
  HealthStatus,
  AutoPrices,
} from '@/services/farmwiseService';

/**
 * AI engine is always available (runs on-device).
 * Optional: checks if enhanced Python server is also running.
 */
export function useAIStatus() {
  return useQuery<{ local: true; server: boolean }>({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const server = await isApiAvailable();
      return { local: true as const, server };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    initialData: { local: true, server: false },
  });
}

/**
 * Full AI prediction — runs on device, optionally enhanced by server
 */
export function useAIPrediction() {
  return useMutation<FarmWisePrediction, Error, FarmWisePredictionInput>({
    mutationFn: getAIPrediction,
  });
}

/**
 * Price forecast — local engine with optional server data
 */
export function usePriceForecast(crop?: string) {
  return useQuery<PriceForecastResponse>({
    queryKey: ['price-forecast', crop],
    queryFn: () => getPriceForecast(crop),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Crops available in the AI system (always available)
 */
export function useAICrops() {
  return useQuery<Record<string, CropInfo>>({
    queryKey: ['ai-crops'],
    queryFn: getAICrops,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * ML model details (always available)
 */
export function useModelInfo() {
  return useQuery<ModelInfo[]>({
    queryKey: ['model-info'],
    queryFn: getModelInfo,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Health status (always healthy locally)
 */
export function useAIHealth() {
  return useQuery<HealthStatus>({
    queryKey: ['ai-health'],
    queryFn: getHealthStatus,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/**
 * Auto-filled price from local engine
 */
export function useAutoPrices(crop: string) {
  return useQuery<AutoPrices>({
    queryKey: ['auto-prices', crop],
    queryFn: () => getAutoPrices(crop),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Weather auto-fill from Open-Meteo (direct, no server proxy)
 */
export function useAIWeather(lat?: number, lon?: number) {
  return useQuery({
    queryKey: ['ai-weather', lat, lon],
    queryFn: () => getAIWeather(lat, lon),
    staleTime: 10 * 60 * 1000,
  });
}
