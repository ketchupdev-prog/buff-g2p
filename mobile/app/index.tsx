import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { getStoredToken } from '@/services/auth';

SplashScreen.preventAutoHideAsync();

export default function AppEntry() {
  // null = still checking; 'home' | 'sign-in' | 'onboarding' = resolved destination
  const [destination, setDestination] = useState<'home' | 'sign-in' | 'onboarding' | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const onboardingValue = await AsyncStorage.getItem('buffr_onboarding_complete');
        const onboardingComplete = onboardingValue === 'true';

        if (!onboardingComplete) {
          setDestination('onboarding');
          return;
        }

        // S1 fix: onboarding is complete — verify a valid, non-expired token exists.
        const token = await getStoredToken();
        if (!token) {
          // Token missing or expired; send user back to sign-in entry point.
          setDestination('sign-in');
        } else {
          setDestination('home');
        }
      } catch (e) {
        console.error('Failed to check session state', e);
        setDestination('onboarding');
      } finally {
        SplashScreen.hideAsync();
      }
    };

    checkSession();
  }, []);

  if (destination === null) {
    // Still resolving — render nothing while splash is visible.
    return null;
  }

  if (destination === 'home') {
    return <Redirect href="/(tabs)/home" />;
  }
  if (destination === 'sign-in') {
    return <Redirect href="/onboarding/phone" />;
  }
  return <Redirect href="/onboarding" />;
}
