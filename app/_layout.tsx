/**
 * Root layout – Buffr G2P.
 * Loads fonts, wraps app in providers, defines Stack. Entry: app/index.tsx.
 * SafeAreaProvider: Expo Router includes it; if not, wrap with SafeAreaProvider from react-native-safe-area-context (see §11.0).
 */
import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppProviders } from '@/contexts/AppProviders';
import { useGamification } from '@/contexts/GamificationContext';
import { BadgeToast } from '@/components/animations/BadgeToast';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function GlobalOverlays() {
  const { pendingToast, clearToast } = useGamification();
  return <BadgeToast badgeId={pendingToast} onDismiss={clearToast} />;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    // No custom fonts required for G2P; empty object.
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
          presentation: 'card',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="utilities" options={{ presentation: 'card' }} />
        <Stack.Screen name="wallets" options={{ presentation: 'card' }} />
        <Stack.Screen name="send-money" options={{ presentation: 'card' }} />
        <Stack.Screen name="merchants" options={{ presentation: 'card' }} />
        <Stack.Screen name="receive" options={{ presentation: 'card', headerShown: true }} />
        <Stack.Screen name="proof-of-life" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-wallet" options={{ presentation: 'card' }} />
        <Stack.Screen name="scan-qr" options={{ presentation: 'card' }} />
        <Stack.Screen name="groups" options={{ presentation: 'card' }} />
      </Stack>
      <GlobalOverlays />
    </AppProviders>
  );
}
