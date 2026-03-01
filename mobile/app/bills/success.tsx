/**
 * Bill Payment Success – Buffr G2P.
 * Dedicated success route after bill pay. PRD §18.5.
 * Uses UserContext for profile (display name).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { SuccessScreen } from '@/components/ui';

const DS = designSystem;

export default function BillPaymentSuccessScreen() {
  const { profile } = useUser();
  const { amount, reference, billerName, accountRef, token } = useLocalSearchParams<{
    amount?: string;
    reference?: string;
    billerName?: string;
    accountRef?: string;
    token?: string;
  }>();

  const value = amount ? `N$${parseFloat(amount).toLocaleString('en-NA', { minimumFractionDigits: 2 })}` : undefined;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SuccessScreen
          title="Payment successful"
          subtitle={
            billerName
              ? `Paid to ${billerName}`
              : profile?.firstName
                ? `Thanks, ${profile.firstName}. Your bill payment was processed.`
                : 'Your bill payment was processed.'
          }
          value={value}
          checkColor={DS.colors.semantic.success}
          actions={[
            { label: 'Done', onPress: () => router.replace('/(tabs)' as never) },
            { label: 'View history', onPress: () => router.replace('/bills' as never), variant: 'secondary' },
          ]}
        />
        <View style={styles.refWrap}>
          {reference ? (
            <>
              <Text style={styles.refLabel}>Reference</Text>
              <Text style={styles.refValue}>{reference}</Text>
            </>
          ) : null}
          {token ? (
            <>
              <Text style={[styles.refLabel, { marginTop: 12 }]}>Prepaid token</Text>
              <Text style={styles.refValue} selectable>{token}</Text>
              <Text style={styles.tokenHint}>Enter on your prepaid meter</Text>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },
  refWrap: { paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  refLabel: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginBottom: 4 },
  refValue: { fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
  tokenHint: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 4 },
});
