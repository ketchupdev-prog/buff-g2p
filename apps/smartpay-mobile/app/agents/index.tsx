/**
 * Agents Route Alias
 *
 * Purpose: Keep legacy `/agents` route working while forwarding users
 * to the canonical shared map finder flow.
 * Location: app/agents/index.tsx
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { designSystem } from '@/constants/designSystem';

export default function AgentsScreen() {
  useEffect(() => {
    router.replace('/(authenticated)/location-finder?tab=agents&service=cashout');
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: designSystem.colors.background,
      }}
    >
      <ActivityIndicator color={designSystem.colors.brand.primary} />
    </View>
  );
}
