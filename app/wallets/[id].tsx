/**
 * Wallet Detail – Buffr G2P.
 * Design: reference WalletDetailScreen patterns (emoji icon, pill buttons, auto pay card, activity rows).
 * §3.6 screen 50 / Figma 116:629.
 * Uses UserContext for profile, walletStatus, isLoaded.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getWallet, deleteWallet, type Wallet } from '@/services/wallets';
import {
  getTransactions,
  formatTransactionType,
  formatTransactionAmount,
  type Transaction,
} from '@/services/transactions';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { AddMoneyModal } from '@/components/modals';

/** User-defined icon (emoji) or neutral – per Buffr design, no predetermined types. */
function walletDisplayIcon(w: Wallet): string {
  return w.icon?.trim() ? w.icon : '💼';
}

function isDebit(tx: Transaction): boolean {
  return ['send', 'cash_out', 'bill_pay', 'airtime', 'loan_repayment'].includes(tx.type);
}

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, walletStatus, isLoaded } = useUser();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [w, txs] = await Promise.all([
        getWallet(id),
        getTransactions({ walletId: id, limit: 20 }),
      ]);
      setWallet(w);
      setTransactions(txs);
    } catch (e) {
      console.error('WalletDetail load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isMainWallet = wallet?.type === 'main';
  const isFrozen = walletStatus === 'frozen';

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Wallet', headerTintColor: '#1E293B', headerStyle: { backgroundColor: '#fff' } }} />
        <View style={styles.center}>
          <ActivityIndicator color="#0029D6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: wallet?.name ?? 'Wallet',
          headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#020617' },
          headerBackTitleVisible: false,
          headerTintColor: '#1E293B',
          headerStyle: { backgroundColor: '#fff' },
          headerRight: () => wallet ? (
            <View style={styles.headerRightRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push({ pathname: '/wallets/[id]/edit', params: { id: wallet.id } } as never)}
                accessibilityLabel="Edit wallet"
              >
                <Ionicons name="pencil-outline" size={22} color="#1E293B" />
              </TouchableOpacity>
              {!isMainWallet && (
                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => setShowDeleteConfirm(true)}
                  accessibilityLabel="Delete wallet"
                >
                  <Ionicons name="trash-outline" size={22} color="#E11D48" />
                </TouchableOpacity>
              )}
            </View>
          ) : null,
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0029D6" />
        </View>
      ) : !wallet ? (
        <View style={styles.center}>
          <Text style={styles.notFound}>Wallet not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0029D6" />
          }
        >
          {isFrozen && (
            <View style={styles.frozenBanner}>
              <Ionicons name="lock-closed-outline" size={20} color={designSystem.colors.semantic.error} />
              <Text style={styles.frozenText}>Your wallet is frozen. Complete proof-of-life to use this wallet.</Text>
            </View>
          )}
          {/* Balance block with user icon – per Buffr design */}
          <View style={styles.balanceBlock}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{walletDisplayIcon(wallet)}</Text>
            </View>
            <Text style={styles.walletSubtitle}>{wallet.name}</Text>
            <Text style={styles.balanceAmount}>
              N${wallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            {/* Monthly Pay line – per design; link to auto-pay when configured */}
            <TouchableOpacity
              style={styles.monthlyPayRow}
              onPress={() => router.push(`/wallets/${wallet.id}/auto-pay` as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.monthlyPayLabel}>Monthly Pay</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Bottom nav: History | Transfer | Add – per Buffr design */}
          <View style={styles.walletNav}>
            <TouchableOpacity style={styles.walletNavItem} onPress={() => router.push(`/wallets/${wallet.id}/history` as never)} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={22} color="#64748B" />
              <Text style={styles.walletNavLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletNavItem} onPress={() => router.push('/send-money/select-recipient' as never)} activeOpacity={0.8}>
              <Ionicons name="swap-horizontal-outline" size={22} color="#64748B" />
              <Text style={styles.walletNavLabel}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.walletNavItem, styles.walletNavItemActive]} onPress={() => setShowAddMoneyModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color="#0029D6" />
              <Text style={[styles.walletNavLabel, styles.walletNavLabelActive]}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Quick actions row */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push(`/wallets/${wallet.id}/cash-out` as never)}
              activeOpacity={0.8}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name="cash-outline" size={22} color="#0029D6" />
              </View>
              <Text style={styles.quickLabel}>Cash Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push({ pathname: '/scan-qr', params: { mode: 'cashout', walletId: wallet.id } } as never)}
              activeOpacity={0.8}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name="qr-code-outline" size={22} color="#0029D6" />
              </View>
              <Text style={styles.quickLabel}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(tabs)/vouchers' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name="gift-outline" size={22} color="#0029D6" />
              </View>
              <Text style={styles.quickLabel}>Vouchers</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push(`/wallets/${wallet.id}/history` as never)} activeOpacity={0.8}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No transactions for this wallet.</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const debit = isDebit(tx);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  onPress={() => router.push(`/(tabs)/transactions/${tx.id}` as never)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.txIcon, debit ? styles.txIconDebit : styles.txIconCredit]}>
                    <Ionicons name={debit ? 'arrow-up' : 'arrow-down'} size={18} color={debit ? '#E11D48' : '#22C55E'} />
                  </View>
                  <View style={styles.txContent}>
                    <Text style={styles.txDesc}>{formatTransactionType(tx.type)}</Text>
                    {tx.counterparty ? <Text style={styles.txDate}>{tx.counterparty}</Text> : null}
                  </View>
                  <Text style={[styles.txAmount, debit ? styles.txAmountDebit : styles.txAmountCredit]}>
                    {formatTransactionAmount(tx)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <AddMoneyModal
        visible={showAddMoneyModal}
        onClose={() => setShowAddMoneyModal(false)}
        walletId={wallet?.id ?? null}
      />
      {/* Delete confirmation sheet */}
      <Modal visible={showDeleteConfirm} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowDeleteConfirm(false)} activeOpacity={1} />
          <View style={styles.deleteSheet}>
            <View style={styles.deleteTitleWrap}>
              <Text style={styles.deleteTitle}>Delete "{wallet?.name}"?</Text>
              <Text style={styles.deleteSub}>
                This wallet and all its settings will be permanently removed. Any remaining balance will be transferred to your Main Wallet.
              </Text>
            </View>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteBtn}
                disabled={deleting}
                onPress={async () => {
                  if (!wallet?.id) return;
                  setDeleting(true);
                  const result = await deleteWallet(wallet.id);
                  setDeleting(false);
                  setShowDeleteConfirm(false);
                  if (result.success) router.replace('/(tabs)' as never);
                  else Alert.alert('Error', result.error ?? 'Could not delete wallet.');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete Wallet'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.homeIndicatorWrap}><View style={styles.homeIndicatorPill} /></View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFound: { fontSize: 16, color: '#64748B', marginBottom: 12 },
  link: { fontSize: 16, color: '#2563EB' },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  trashBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  frozenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designSystem.colors.feedback.red100,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  frozenText: { flex: 1, fontSize: 13, color: designSystem.colors.semantic.error, lineHeight: 18 },
  // Balance block
  balanceBlock: { alignItems: 'center', paddingTop: 32, paddingBottom: 28 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#D9EAF3',
    borderWidth: 1, borderColor: '#0F172A',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 36 },
  walletSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: '#020617', marginBottom: 4 },
  balanceLabel: { fontSize: 14, color: '#64748B' },
  monthlyPayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#F8FAFC', borderRadius: 12 },
  monthlyPayLabel: { fontSize: 14, color: '#64748B' },
  walletNav: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 8, marginBottom: 24 },
  walletNavItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12 },
  walletNavItemActive: {},
  walletNavLabel: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  walletNavLabelActive: { color: '#0029D6' },
  // Action buttons (legacy)
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  primaryBtn: { flex: 1, height: 48, borderRadius: 9999, backgroundColor: '#020617', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  secondaryBtn: { flex: 1, height: 48, borderRadius: 9999, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { fontSize: 14, color: '#020617', fontWeight: '600' },
  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 28 },
  quickBtn: { alignItems: 'center', gap: 8 },
  quickIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '500', color: '#374151' },
  // Activity
  activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  activityTitle: { fontSize: 16, color: '#020617', fontWeight: '600' },
  viewAllText: { fontSize: 14, color: '#2563EB' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#64748B', marginTop: 10, textAlign: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txIconCredit: { backgroundColor: '#DCFCE7' },
  txIconDebit: { backgroundColor: '#FEF2F2' },
  txContent: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, color: '#020617', fontWeight: '500' },
  txDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  txAmountCredit: { color: '#22C55E' },
  txAmountDebit: { color: '#E11D48' },
  // Delete modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  deleteSheet: { backgroundColor: '#F2F2F7', borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingHorizontal: 16, paddingBottom: 8 },
  deleteTitleWrap: { paddingVertical: 20, alignItems: 'center' },
  deleteTitle: { fontSize: 16, color: '#020617', marginBottom: 8, textAlign: 'center', fontWeight: '600' },
  deleteSub: { fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 18 },
  deleteActions: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  deleteBtn: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  deleteBtnText: { fontSize: 20, color: '#E11D48' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 20, color: '#3B82F6' },
  homeIndicatorWrap: { height: 21, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8, marginTop: 8 },
  homeIndicatorPill: { width: 139, height: 5, backgroundColor: '#000', borderRadius: 100 },
});
