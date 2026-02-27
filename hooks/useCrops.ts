import { useMemo } from 'react';
import { mockCrops, Crop } from '@/mocks/crops';
import { useWeather } from '@/hooks/useWeather';
import { getSmartCrops } from '@/services/cropService';

/**
 * Returns weather-enriched crop data with real-time harvest & spoilage recommendations
 */
export function useCrops() {
  const { data: weather, isLoading: weatherLoading } = useWeather();

  const crops = useMemo<Crop[]>(() => {
    if (!weather) return mockCrops;
    return getSmartCrops(mockCrops, weather);
  }, [weather]);

  return {
    crops,
    isLoading: weatherLoading,
    isEnriched: !!weather,
  };
}
