/**
 * Loan Success – Buffr G2P.
 * Standalone success route after loan application. PRD §18.5.
 * Uses UserContext for profile (display name).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { SuccessScreen } from '@/components/ui';

const DS = designSystem;

export default function LoanSuccessScreen() {
  const { profile } = useUser();
  const { loanId, amount, term } = useLocalSearchParams<{
    loanId?: string;
    amount?: string;
    term?: string;
  }>();

  const value = amount ? `N$${parseInt(amount, 10).toLocaleString()}` : undefined;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SuccessScreen
          title="Loan credited"
          subtitle={
            term
              ? `Term: ${term}`
              : profile?.firstName
                ? `${profile.firstName}, the amount has been added to your Buffr wallet.`
                : 'The amount has been added to your Buffr wallet.'
          }
          value={value}
          checkColor={DS.colors.semantic.success}
          actions={[
            { label: 'Done', onPress: () => router.replace('/(tabs)' as never) },
            { label: 'View loans', onPress: () => router.replace('/(tabs)/home/loans' as never), variant: 'secondary' },
          ]}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },
});
