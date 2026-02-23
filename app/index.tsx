import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function AppEntry() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('buffr_onboarding_complete');
        setOnboardingComplete(value === 'true');
      } catch (e) {
        // Handle error reading value
        console.error("Failed to read onboarding status from AsyncStorage", e);
        setOnboardingComplete(false); // Assume not complete on error
      } finally {
        SplashScreen.hideAsync();
      }
    };

    checkOnboarding();
  }, []);

  if (onboardingComplete === null) {
    // Still checking onboarding status, render nothing or a loading indicator
    return null;
  }

  if (onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}
