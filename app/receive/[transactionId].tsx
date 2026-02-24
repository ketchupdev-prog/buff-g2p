/**
 * Transaction Receipt – Buffr G2P.
 * Displays receipt for a received transaction. Opened via deep link.
 * §3.7 receive flow.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getTransactions, type Transaction } from '@/services/transactions';

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString('en-NA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export default function ReceiveTransactionScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions({ limit: 50 }).then(txs => {
      setTx(txs.find(t => t.id === transactionId) ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [transactionId]);

  async function handleShare() {
    if (!tx) return;
    await Share.share({
      message: `Buffr Payment Receipt\nFrom: ${tx.counterparty}\nAmount: N$${Math.abs(tx.amount).toFixed(2)}\nRef: ${tx.id}\nDate: ${formatDate(tx.date)}`,
    });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Transaction Receipt', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>
        ) : !tx ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Receipt not found</Text>
            <Text style={styles.emptySub}>This transaction may have expired or been removed.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.btnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Status indicator */}
            <View style={styles.statusWrap}>
              <View style={[styles.statusIcon, { backgroundColor: tx.amount > 0 ? '#D1FAE5' : '#DBEAFE' }]}>
                <Ionicons name={tx.amount > 0 ? 'arrow-down-outline' : 'arrow-up-outline'} size={28} color={tx.amount > 0 ? '#22C55E' : designSystem.colors.brand.primary} />
              </View>
              <Text style={styles.txType}>{tx.amount > 0 ? 'Money Received' : 'Payment Sent'}</Text>
              <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#22C55E' : designSystem.colors.neutral.text }]}>
                {tx.amount > 0 ? '+' : ''}{'N$'}{Math.abs(tx.amount).toLocaleString('en-NA', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
            </View>

            {/* Details */}
            <View style={styles.detailCard}>
              {[
                { label: tx.amount > 0 ? 'From' : 'To', value: tx.counterparty },
                { label: 'Type', value: tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                { label: 'Status', value: tx.status.charAt(0).toUpperCase() + tx.status.slice(1) },
                { label: 'Reference', value: tx.id },
                ...(tx.note ? [{ label: 'Note', value: tx.note }] : []),
              ].map((row, i, arr) => (
                <View key={row.label} style={[styles.detailRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={18} color={designSystem.colors.brand.primary} style={{ marginRight: 8 }} />
                <Text style={styles.shareBtnText}>Share Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)' as never)}>
                <Text style={styles.btnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 24 },
  content: { padding: 24, paddingBottom: 40 },
  statusWrap: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  statusIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  txType: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 8 },
  txAmount: { fontSize: 36, fontWeight: '800', marginBottom: 6 },
  txDate: { fontSize: 13, color: DS.colors.neutral.textTertiary },
  detailCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: DS.colors.neutral.border, marginBottom: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  detailLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '500', color: DS.colors.neutral.text, maxWidth: '60%', textAlign: 'right' },
  footer: { gap: 12 },
  shareBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  shareBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
  btn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
