/**
 * Wallet History – Buffr G2P.
 * Tabs: Earnings (received) and Added (add_money). Per Buffr design (Wallet History Earnings/Added).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getWallet, type Wallet } from '@/services/wallets';
import {
  getTransactions,
  formatTransactionType,
  formatTransactionAmount,
  transactionIcon,
  type Transaction,
  type TransactionType,
} from '@/services/transactions';
import { designSystem } from '@/constants/designSystem';

type Tab = 'earnings' | 'added';

const EARNINGS_TYPES: TransactionType[] = ['receive', 'voucher_redeem', 'loan_disbursement'];
const ADDED_TYPES: TransactionType[] = ['add_money'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function WalletHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('earnings');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [w, txs] = await Promise.all([
        getWallet(id),
        getTransactions({ walletId: id, limit: 50 }),
      ]);
      setWallet(w ?? null);
      setTransactions(txs);
    } catch (e) {
      console.error('WalletHistory load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const earnings = transactions.filter((t) => EARNINGS_TYPES.includes(t.type));
  const added = transactions.filter((t) => ADDED_TYPES.includes(t.type));
  const list = tab === 'earnings' ? earnings : added;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Wallet History',
          headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#020617' },
          headerTintColor: '#1E293B',
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        {wallet ? (
          <View style={styles.walletHeader}>
            <Text style={styles.walletName}>{wallet.name}</Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'earnings' && styles.tabActive]}
            onPress={() => setTab('earnings')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'earnings' && styles.tabTextActive]}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'added' && styles.tabActive]}
            onPress={() => setTab('added')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'added' && styles.tabTextActive]}>Added</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={designSystem.colors.brand.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={tab === 'earnings' ? 'arrow-down-circle-outline' : 'add-circle-outline'} size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{tab === 'earnings' ? 'No earnings yet' : 'No added funds yet'}</Text>
            <Text style={styles.emptySub}>
              {tab === 'earnings' ? 'Money received into this wallet will appear here.' : 'Money added from Buffr Account or bank will appear here.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={designSystem.colors.brand.primary} />
            }
          >
            {list.map((tx) => {
              const isCredit = ['receive', 'voucher_redeem', 'loan_disbursement', 'add_money'].includes(tx.type);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.row}
                  onPress={() => router.push(`/transactions/${tx.id}` as never)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatarWrap, isCredit ? styles.avatarCredit : styles.avatarDebit]}>
                    <Ionicons name={transactionIcon(tx.type) as never} size={20} color="#fff" />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>{tx.counterparty ?? formatTransactionType(tx.type)}</Text>
                    <Text style={styles.rowDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.rowAmount, isCredit ? styles.amountCredit : styles.amountDebit]}>
                    {formatTransactionAmount(tx)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  walletHeader: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: designSystem.colors.neutral.border },
  walletName: { fontSize: 15, fontWeight: '600', color: designSystem.colors.neutral.text },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: designSystem.colors.neutral.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: designSystem.colors.brand.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: designSystem.colors.neutral.textSecondary },
  tabTextActive: { color: designSystem.colors.brand.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: designSystem.colors.neutral.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: designSystem.colors.neutral.textSecondary, marginTop: 8, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: designSystem.colors.neutral.border, gap: 12 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarCredit: { backgroundColor: '#22C55E' },
  avatarDebit: { backgroundColor: '#E11D48' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '600', color: designSystem.colors.neutral.text },
  rowDate: { fontSize: 12, color: designSystem.colors.neutral.textTertiary, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  amountCredit: { color: '#22C55E' },
  amountDebit: { color: designSystem.colors.neutral.text },
  bottomSpacer: { height: 40 },
});
