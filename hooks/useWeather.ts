import { useQuery } from '@tanstack/react-query';
import { fetchRealWeather, RealWeatherData } from '@/services/weatherService';

export function useWeather(lat?: number, lon?: number, region?: string) {
  return useQuery<RealWeatherData>({
    queryKey: ['weather', lat, lon],
    queryFn: () => fetchRealWeather(lat, lon, region),
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    staleTime: 5 * 60 * 1000,        // Consider stale after 5 minutes
    retry: 2,
  });
}
