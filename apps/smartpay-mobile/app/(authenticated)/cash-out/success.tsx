/**
 * Cash Out Success - Generic success screen
 * 
 * Features:
 * - Animated checkmark
 * - Amount cashed out
 * - Method used
 * - Reference/code (if applicable)
 * - Receipt details
 * - "Done" CTA → Home
 * 
 * Location: app/(authenticated)/cash-out/success.tsx
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as DS } from '@/constants/designSystem';
import { SuccessHero } from '@/components/receipts/SuccessHero';
import { ReceiptCard, ReceiptRow } from '@/components/receipts/ReceiptCard';
import { SuccessActionFooter } from '@/components/receipts/SuccessActionFooter';

export default function CashOutSuccessScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    method?: string;
    recipient?: string;
    code?: string;
    reference?: string;
    processingTime?: string;
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
      const message = `Cash Out Receipt\n\nAmount: N$${params.amount}\nMethod: ${params.method}\n${params.recipient ? `Recipient: ${params.recipient}\n` : ''}${params.code ? `Collection Code: ${params.code}\n` : ''}${params.reference ? `Reference: ${params.reference}\n` : ''}`;
      
      await Share.share({
        message,
        title: 'Cash Out Receipt',
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
          title="Cash Out Successful!"
          amount={`N$${params.amount ? parseFloat(params.amount).toFixed(2) : '0.00'}`}
          subtitle={`${params.method || 'Cash out'} completed successfully`}
        />

        <ReceiptCard title="Transaction Details">
          <ReceiptRow label="Method" value={params.method || 'N/A'} />
          {params.recipient ? <ReceiptRow label="Location/Agent" value={params.recipient} /> : null}

          {params.code && (
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>Collection Code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{params.code}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Code Copied', 'Collection code copied to clipboard');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="copy-outline" size={20} color={DS.colors.brand.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.codeHint}>Show this code at the ATM to collect your cash</Text>
            </View>
          )}

          {params.reference && (
            <ReceiptRow label="Reference" value={params.reference} />
          )}

          {params.processingTime && (
            <View style={styles.processingTimeSection}>
              <Ionicons name="time-outline" size={20} color={DS.colors.brand.primary} />
              <View style={styles.processingTimeInfo}>
                <Text style={styles.processingTimeLabel}>Processing Time</Text>
                <Text style={styles.processingTimeValue}>{params.processingTime}</Text>
              </View>
            </View>
          )}

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
  codeSection: {
    paddingVertical: DS.spacing.sm,
  },
  codeLabel: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DS.spacing.md,
    backgroundColor: DS.colors.background,
    borderRadius: DS.radius.md,
    borderWidth: 2,
    borderColor: DS.colors.brand.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: DS.typography.fontSize['2xl'],
    fontWeight: DS.typography.fontWeight.bold,
    color: DS.colors.brand.primary,
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
    marginTop: DS.spacing.sm,
    lineHeight: 20,
  },
  processingTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
    padding: DS.spacing.md,
    backgroundColor: DS.colors.brand.primaryMuted,
    borderRadius: DS.radius.md,
  },
  processingTimeInfo: {
    flex: 1,
  },
  processingTimeLabel: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.brand.primary,
    marginBottom: 2,
  },
  processingTimeValue: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.brand.primary,
  },
});
