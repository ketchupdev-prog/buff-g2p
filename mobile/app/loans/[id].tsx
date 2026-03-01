/**
 * Loan Detail – redirect to the canonical tabs implementation.
 * §4.3 loan detail lives at /(tabs)/home/loans/[id].
 */
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export default function LoanDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    if (id) {
      router.replace({ pathname: '/(tabs)/home/loans/[id]' as never, params: { id } });
    } else {
      router.replace('/(tabs)' as never);
    }
  }, [id]);
  return null;
}
