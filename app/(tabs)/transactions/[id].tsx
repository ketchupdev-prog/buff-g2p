/**
 * Transaction Detail – Buffr G2P.
 * §3.6 screen 49 / Figma 115:495.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import {
  getTransaction,
  formatTransactionType,
  formatTransactionAmount,
  transactionIcon,
  type Transaction,
} from '@/services/transactions';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getTransaction(id);
      setTx(data);
    } catch (e) {
      console.error('TransactionDetail load:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleShare() {
    if (!tx) return;
    try {
      await Share.share({
        message: `Buffr Transaction\n${formatTransactionType(tx.type)}\n${formatTransactionAmount(tx)}\n${new Date(tx.createdAt).toLocaleString('en-NA')}\nRef: ${tx.reference ?? tx.id}`,
      });
    } catch {
      // User cancelled share
    }
  }

  function statusColor(status: string): string {
    if (status === 'success') return designSystem.colors.semantic.success;
    if (status === 'failed') return designSystem.colors.semantic.error;
    return designSystem.colors.semantic.warning;
  }

  function formatDateTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString('en-NA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch { return iso; }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Transaction',
          headerTitleStyle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} accessibilityLabel="Share transaction">
              <Ionicons name="share-outline" size={22} color={designSystem.colors.neutral.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={designSystem.colors.brand.primary} />
        </View>
      ) : !tx ? (
        <View style={styles.center}>
          <Text style={styles.notFound}>Transaction not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.container}>
          {/* Amount Block */}
          <View style={styles.amountBlock}>
            <View style={styles.iconCircle}>
              <Ionicons name={transactionIcon(tx.type) as never} size={32} color={designSystem.colors.brand.primary} />
            </View>
            <Text style={styles.typeName}>{formatTransactionType(tx.type)}</Text>
            <Text style={styles.amountText}>{formatTransactionAmount(tx)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(tx.status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(tx.status) }]}>
                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsCard}>
            <DetailRow label="Date" value={formatDateTime(tx.createdAt)} />
            {tx.counterparty ? <DetailRow label="Counterparty" value={tx.counterparty} /> : null}
            {tx.description ? <DetailRow label="Description" value={tx.description} /> : null}
            {tx.fee ? <DetailRow label="Fee" value={`N$ ${tx.fee.toFixed(2)}`} /> : null}
            {tx.reference ? <DetailRow label="Reference" value={tx.reference} /> : null}
            <DetailRow label="ID" value={tx.id} mono />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.mono]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFound: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, marginBottom: 12 },
  link: { ...designSystem.typography.textStyles.body, color: designSystem.colors.brand.primary },
  container: { flex: 1, padding: designSystem.spacing.g2p.horizontalPadding },
  amountBlock: {
    alignItems: 'center',
    paddingVertical: designSystem.spacing.scale['2xl'],
    marginBottom: designSystem.spacing.scale.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeName: {
    ...designSystem.typography.textStyles.bodyLg,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 4,
  },
  amountText: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: designSystem.radius.pill,
  },
  statusText: { ...designSystem.typography.textStyles.bodySm, fontWeight: '600' },
  detailsCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    overflow: 'hidden',
    ...designSystem.shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: designSystem.spacing.scale.md,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  detailLabel: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, flex: 1 },
  detailValue: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12 },
});
