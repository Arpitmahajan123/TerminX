/**
 * useLocation — GPS location hook with reverse geocoding
 * Requests location permission, gets coordinates, and reverse-geocodes to city name.
 * All other hooks/services consume this as the single source of truth for user location.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  lat: number;
  lon: number;
  city: string;
  region: string;       // state or admin area
  displayName: string;  // "City, Region"
  granted: boolean;
}

const OPEN_METEO_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

const DEFAULT_LOCATION: UserLocation = {
  lat: 19.9975,
  lon: 73.7898,
  city: 'Nashik',
  region: 'Maharashtra',
  displayName: 'Nashik, Maharashtra',
  granted: false,
};

/**
 * Reverse geocode using free Nominatim API (OpenStreetMap).
 */
async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; region: string }> {
  try {
    const res = await fetch(
      `${OPEN_METEO_REVERSE}?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'AgriChainApp/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Unknown';
    const region =
      addr.state || addr.state_district || addr.country || '';
    return { city, region };
  } catch {
    return { city: 'Unknown', region: '' };
  }
}

/**
 * React hook that provides the user's GPS location.
 * Requests permission on mount. Falls back to Nashik if denied or fails.
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLocation(DEFAULT_LOCATION);
        setLoading(false);
        return;
      }

      // Get current position
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lon } = pos.coords;

      // Reverse geocode
      const { city, region } = await reverseGeocode(lat, lon);
      const displayName = region ? `${city}, ${region}` : city;

      setLocation({
        lat,
        lon,
        city,
        region,
        displayName,
        granted: true,
      });
    } catch (e: any) {
      console.warn('Location error:', e);
      setError(e.message || 'Location unavailable');
      setLocation(DEFAULT_LOCATION);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, loading, error, refresh: fetchLocation };
}

export default useUserLocation;
