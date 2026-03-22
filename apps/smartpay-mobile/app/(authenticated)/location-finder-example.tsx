/**
 * Legacy location finder alias
 * Location: fintech/smartpay/app/(authenticated)/location-finder-example.tsx
 *
 * Keeps backward compatibility for older deep links by forwarding to
 * the canonical production route.
 */
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { designSystem as DS } from '@/constants/designSystem';

export default function LocationFinderExampleAliasScreen() {
  const params = useLocalSearchParams<{ tab?: string; service?: string; query?: string }>();

  useEffect(() => {
    const search = new URLSearchParams();
    if (params.tab) search.set('tab', params.tab);
    if (params.service) search.set('service', params.service);
    if (params.query) search.set('query', params.query);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    router.replace(`/(authenticated)/location-finder${suffix}` as any);
  }, [params.query, params.service, params.tab]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DS.colors.background }}>
      <ActivityIndicator color={DS.colors.brand.primary} />
    </View>
  );
}
