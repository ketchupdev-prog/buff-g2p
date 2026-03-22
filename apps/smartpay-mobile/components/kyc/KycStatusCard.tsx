/**
 * KycStatusCard
 *
 * Purpose: Displays the current KYC tier and stage messaging (pending review vs liveness failed)
 * using the same Smartpay mobile design tokens as other screens.
 *
 * Location within project: fintech/apps/smartpay-mobile/components/kyc/KycStatusCard.tsx
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designSystem } from '@/constants/designSystem';
import type { KycStatus } from '@/services/kyc';

const ds = designSystem;

export function KycStatusCard({ status }: { status: KycStatus }) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusLabel}>KYC tier</Text>
      <Text style={styles.statusValue}>{status.kycTier}</Text>
      {status.kycVerified ? <Text style={styles.verified}>Verified</Text> : null}
      {status.pendingSubmission ? (
        <Text style={styles.pending}>Submission under review</Text>
      ) : null}

      {!status.pendingSubmission && status.lastSubmission?.status === 'liveness_failed' ? (
        <Text style={styles.pending}>Liveness failed. Please retry with a new selfie video.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    backgroundColor: ds.colors.neutral.surface,
    padding: ds.spacing.lg,
    borderRadius: ds.radius.md,
    marginBottom: ds.spacing.lg,
    ...ds.shadows.sm,
  },
  statusLabel: { ...ds.typography.textStyles.caption, marginBottom: 4 },
  statusValue: { ...ds.typography.textStyles.h3, color: ds.colors.neutral.text, textTransform: 'capitalize' },
  verified: { ...ds.typography.textStyles.caption, color: ds.colors.success, marginTop: 4 },
  pending: { ...ds.typography.textStyles.caption, color: ds.colors.warning, marginTop: 4 },
});

