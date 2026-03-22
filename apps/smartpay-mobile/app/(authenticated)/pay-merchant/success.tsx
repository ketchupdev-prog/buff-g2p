/**
 * Pay Merchant Success - Generic success screen
 * 
 * Features:
 * - Animated checkmark
 * - Amount paid
 * - Merchant details
 * - Reference/invoice (if applicable)
 * - Receipt details
 * - "Done" CTA → Home
 * 
 * Location: app/(authenticated)/pay-merchant/success.tsx
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { designSystem as DS } from '@/constants/designSystem';
import { SuccessHero } from '@/components/receipts/SuccessHero';
import { ReceiptCard, ReceiptRow } from '@/components/receipts/ReceiptCard';
import { SuccessActionFooter } from '@/components/receipts/SuccessActionFooter';

export default function PayMerchantSuccessScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    merchantName?: string;
    merchantId?: string;
    reference?: string;
    invoiceNumber?: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  const handleShare = async () => {
    try {
      const message = `Payment Receipt\n\nAmount: N$${params.amount}\nMerchant: ${params.merchantName}\n${params.merchantId ? `Merchant ID: ${params.merchantId}\n` : ''}${params.reference ? `Reference: ${params.reference}\n` : ''}${params.invoiceNumber ? `Invoice: ${params.invoiceNumber}\n` : ''}`;
      
      await Share.share({
        message,
        title: 'Payment Receipt',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleDone = () => {
    router.replace('/(authenticated)/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <SuccessHero
          scaleAnim={scaleAnim}
          title="Payment Successful!"
          amount={`N$${params.amount ? parseFloat(params.amount).toFixed(2) : '0.00'}`}
          subtitle={`Payment to ${params.merchantName || 'merchant'} completed successfully`}
        />

        <ReceiptCard title="Transaction Details">
          <ReceiptRow label="Merchant" value={params.merchantName || 'N/A'} />
          {params.merchantId ? <ReceiptRow label="Merchant ID" value={params.merchantId} /> : null}
          {params.invoiceNumber ? <ReceiptRow label="Invoice Number" value={params.invoiceNumber} /> : null}
          {params.reference ? <ReceiptRow label="Reference" value={params.reference} /> : null}
          <ReceiptRow
            label="Date & Time"
            value={new Date().toLocaleString('en-NA', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        </ReceiptCard>
      </ScrollView>
      <SuccessActionFooter onShare={handleShare} onDone={handleDone} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: DS.spacing.horizontalPadding,
    paddingTop: DS.spacing.xl,
    paddingBottom: 120,
  },
});
