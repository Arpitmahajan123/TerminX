import { useQuery } from '@tanstack/react-query';
import { getRealtimeMandis, generateRealtimeAlerts, setWeatherContext, getDataSourceInfo } from '@/services/marketService';
import { RealWeatherData } from '@/services/weatherService';
import { Mandi, Alert } from '@/mocks/mandis';

/**
 * Fetches real-time mandi prices using:
 * - Live USD/INR exchange rate (free API)
 * - Government MSP 2024-25 data
 * - Real weather impact from Open-Meteo
 * - Optional: live data.gov.in mandi prices
 *
 * Pass weather data to get weather-adjusted prices.
 */
export function useMarket(weather?: RealWeatherData) {
  // Pass weather context for price impact calculation
  if (weather) setWeatherContext(weather);

  return useQuery<Mandi[]>({
    queryKey: ['market', weather?.lastUpdated],
    queryFn: () => getRealtimeMandis(weather),
    refetchInterval: 5 * 60 * 1000,  // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000,
  });
}

export function useAlerts(weather: RealWeatherData | undefined, mandis: Mandi[] | undefined) {
  return useQuery<Alert[]>({
    queryKey: ['alerts', weather?.lastUpdated, mandis?.length],
    queryFn: () => {
      if (!weather || !mandis) return [];
      return generateRealtimeAlerts(weather, mandis);
    },
    enabled: !!weather && !!mandis,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}

/** Returns info about which data sources are active */
export function useDataSources() {
  return getDataSourceInfo();
}
