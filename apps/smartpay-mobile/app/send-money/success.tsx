/**
 * Payment Success Screen - Send Money Flow Step 5/5
 * 
 * Figma Node: 87:410
 * Location: app/send-money/success.tsx
 * 
 * Components:
 * - Animated checkmark (96×96, green #22C55E, spring animation)
 * - Title: "Payment Sent!" (24px bold)
 * - Amount (36px bold accent color)
 * - Subtitle: "You sent N$X to [Name]" (16px regular)
 * - Receipt card:
 *   - Transaction ID
 *   - Timestamp (formatted)
 *   - Fee
 * - Actions:
 *   - Share Receipt (secondary CTA)
 *   - Done (primary CTA) → Home
 * 
 * Navigation:
 * - onDone → /(tabs)/home (replace stack)
 * - onShare → Share API
 * 
 * ASCII Diagram (Figma):
 * ┌─────────────────────────────────────────┐
 * │                                         │
 * │            ✓                            │ ← Animated (96×96)
 * │        ┌──────┐                         │   Green #22C55E
 * │        │  ✓   │                         │   Spring animation
 * │        └──────┘                         │
 * │                                         │
 * │     Payment Sent!                       │ ← 24px bold
 * │                                         │
 * │     N$ 100.00                           │ ← 36px bold accent
 * │                                         │
 * │  You sent N$100 to Anna Johnson         │ ← 16px regular
 * │                                         │
 * │ ┌─────────────────────────────────────┐│
 * │ │ Transaction ID: TXN-123456789       ││ ← Receipt Card
 * │ │ Mar 17, 2026 • 14:23                ││
 * │ │ Fee: N$1.50                          ││
 * │ └─────────────────────────────────────┘│
 * │                                         │
 * │ [Share Receipt] ← 56px Secondary CTA    │
 * │ [Done] ← 56px Primary CTA               │
 * └─────────────────────────────────────────┘
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { designSystem as DS } from '@/constants/designSystem';
import { SuccessHero } from '@/components/receipts/SuccessHero';
import { ReceiptCard, ReceiptRow } from '@/components/receipts/ReceiptCard';
import { SuccessActionFooter } from '@/components/receipts/SuccessActionFooter';

export default function SuccessScreen() {
  const params = useLocalSearchParams<{
    recipientName: string;
    recipientSmartpayId: string;
    amount: string;
    fee: string;
    total: string;
    transactionId: string;
    timestamp: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: DS.animations.spring.damping,
      stiffness: DS.animations.spring.stiffness,
      mass: DS.animations.spring.mass,
    }).start();
  }, []);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} • ${hours}:${minutes}`;
  };

  const handleShareReceipt = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const message = `
Payment Receipt

To: ${params.recipientName}
Amount: N$ ${params.amount}
Fee: N$ ${params.fee}
Total: N$ ${params.total}

Transaction ID: ${params.transactionId}
Date: ${formatTimestamp(params.timestamp)}

Sent via Smartpay
      `.trim();

      await Share.share({
        message,
        title: 'Payment Receipt',
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(authenticated)/(tabs)');
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SuccessHero
            scaleAnim={scaleAnim}
            title="Payment Sent!"
            amount={`N$ ${params.amount ?? '0.00'}`}
            subtitle={`You sent N$${params.amount ?? '0.00'} to ${params.recipientName ?? 'recipient'}`}
          />

          <ReceiptCard title="Transaction Details">
            <ReceiptRow label="Transaction ID" value={params.transactionId ?? 'N/A'} />
            <ReceiptRow label="Date & Time" value={formatTimestamp(params.timestamp ?? new Date().toISOString())} />
            <ReceiptRow label="Transaction Fee" value={`N$ ${params.fee ?? '0.00'}`} />
          </ReceiptCard>
        </ScrollView>
        <SuccessActionFooter onShare={handleShareReceipt} onDone={handleDone} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  safe: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: DS.spacing.horizontalPadding,
    paddingTop: DS.spacing['3xl'],
    paddingBottom: 120,
  },
});
