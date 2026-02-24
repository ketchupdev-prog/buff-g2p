/**
 * Loans Apply – redirect to the canonical tabs implementation.
 * §4.2 loan apply flow lives at /(tabs)/home/loans/apply.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function LoansApplyRedirect() {
  useEffect(() => {
    router.replace('/(tabs)/home/loans/apply' as never);
  }, []);
  return null;
}
