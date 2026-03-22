import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'location_permission';

export type LocationPermissionUiStatus = 'granted' | 'denied' | 'undetermined';

function mapPermission(s: Location.PermissionStatus): LocationPermissionUiStatus {
  if (s === Location.PermissionStatus.GRANTED) return 'granted';
  if (s === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionUiStatus>('undetermined');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  const syncFromSystem = useCallback(async () => {
    try {
      const { status: fs } = await Location.getForegroundPermissionsAsync();
      setStatus(mapPermission(fs));
      if (fs === Location.PermissionStatus.GRANTED) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      }
    } catch (e) {
      console.warn('syncFromSystem location error', e);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status: fs } = await Location.getForegroundPermissionsAsync();
        if (!alive) return;
        setStatus(mapPermission(fs));
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && __DEV__) {
          console.log('[location_permission] stored:', stored);
        }
        if (fs === Location.PermissionStatus.GRANTED) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (alive) setLocation(loc);
        }
      } catch (e) {
        console.warn('useLocationPermission init error', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const requestPermission = async () => {
    try {
      const { status: fs } = await Location.requestForegroundPermissionsAsync();
      const next = mapPermission(fs);
      setStatus(next);
      await AsyncStorage.setItem(STORAGE_KEY, fs);

      if (fs === Location.PermissionStatus.GRANTED) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      }
    } catch (e) {
      console.warn('requestPermission error', e);
      setStatus('denied');
    }
  };

  return { status, location, requestPermission, syncFromSystem };
}
