/**
 * Home screen – Buffr G2P.
 * Design: reference state-flow HomeScreen.tsx patterns.
 * §3.4 screen 25 / Figma nodeId 45:837.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { getWallets, type Wallet } from '@/services/wallets';
import { getTransactions, formatTransactionType, formatTransactionAmount, transactionIcon, type Transaction } from '@/services/transactions';

// Wallet emoji by type
const WALLET_EMOJI: Record<string, string> = {
  main: '📊',
  savings: '💰',
  grant: '🎁',
};

// Figma 575-4252: Mobile, Recharge, Buy Tickets, Subscriptions, Sponsored; Explore Utilities
const SERVICES_ROW1 = [
  { id: 'mobile', label: 'Mobile', icon: 'phone-portrait-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'recharge', label: 'Recharge', icon: 'flash-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'tickets', label: 'Buy Tickets', icon: 'ticket-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'subscriptions', label: 'Your Subscriptions', icon: 'repeat-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'sponsored', label: 'Sponsored', icon: 'megaphone-outline' as const, route: '/(tabs)/home/bills' },
];
const SERVICES_ROW2 = [
  { id: 'all', label: 'All', icon: 'apps-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'insurance', label: 'Insurance', icon: 'shield-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'explore', label: 'Explore Utilities', icon: 'grid-outline' as const, route: '/(tabs)/home/bills' },
];
// Keep G2P shortcuts for compatibility
const SERVICES = [
  { id: 'send', label: 'Send', icon: 'paper-plane-outline' as const, route: '/send-money/select-recipient' },
  { id: 'vouchers', label: 'My Vouchers', icon: 'gift-outline' as const, route: '/(tabs)/vouchers' },
  { id: 'bills', label: 'Pay Bills', icon: 'document-text-outline' as const, route: '/(tabs)/home/bills' },
  { id: 'loans', label: 'Loans', icon: 'business-outline' as const, route: '/(tabs)/home/loans' },
  { id: 'agents', label: 'Agent Network', icon: 'location-outline' as const, route: '/(tabs)/home/agents' },
  { id: 'cashout', label: 'Cash Out', icon: 'cash-outline' as const, route: '/wallets' },
];

function walletEmoji(w: Wallet): string {
  return WALLET_EMOJI[w.type] ?? '💼';
}

const CONTACT_CHIPS = ['Clara', 'Lukas', 'Rachel', 'Simon', 'Peter'];

export default function HomeScreen() {
  const { profile, buffrId, cardNumberMasked } = useUser();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(true);

  const firstName = profile?.firstName ?? 'there';
  const lastName = profile?.lastName ?? '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const initials = (profile?.firstName?.[0] ?? 'B').toUpperCase();
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [ws, txs] = await Promise.all([
        getWallets(),
        getTransactions({ limit: 5 }),
      ]);
      setWallets(ws);
      setRecentTx(txs);
    } catch {
      setLoadError('Could not load data. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const walletCount = wallets.length;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#EFF6FF', '#F5F3FF', '#FDF2F8']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ── Header: Buffr + Notifications (Figma 575-4252) ── */}
        <View style={styles.header}>
          <Text style={styles.buffrLogo}>Buffr</Text>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/(tabs)/profile/notifications' as never)}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color="#4B5563" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0029D6" />}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Search ── */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search anything..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* ── Balance + Show / Add (Figma) ── */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceAmount}>
              {loading ? '—' : balanceVisible ? `N$ ${totalBalance.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N$ ••••'}
            </Text>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <View style={styles.showAddRow}>
              <TouchableOpacity style={styles.pillBtn} onPress={() => setBalanceVisible((v) => !v)} accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}>
                <Text style={styles.pillBtnText}>{balanceVisible ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pillBtn} onPress={() => router.push('/add-wallet' as never)} accessibilityLabel="Add wallet">
                <Text style={styles.pillBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Buffr Card: user name, card number, View (Figma) ── */}
          <TouchableOpacity
            style={styles.buffrCardBlock}
            onPress={() => router.push('/wallets' as never)}
            activeOpacity={0.9}
          >
            <View style={styles.buffrCardTop}>
              <Text style={styles.buffrCardTitle}>Buffr Card</Text>
              <TouchableOpacity onPress={() => router.push('/wallets' as never)} hitSlop={12}>
                <Text style={styles.buffrCardView}>View</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.buffrCardName}>{displayName || 'Eino Nashikoto'}</Text>
            <Text style={styles.buffrCardNumber}>{cardNumberMasked || '••018 4756 9018'}</Text>
          </TouchableOpacity>

          {/* ── Wallets ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Wallets</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletsScroll}>
            {loading ? (
              <View style={styles.walletCardLoading}><ActivityIndicator color="#0029D6" /></View>
            ) : (
              <>
                {wallets.map((w, index) => (
                  <TouchableOpacity
                    key={w.id}
                    style={styles.walletCard}
                    onPress={() => router.push(`/wallets/${w.id}` as never)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.walletBadge}>{index + 1}/{walletCount}</Text>
                    <Text style={styles.walletEmoji}>{walletEmoji(w)}</Text>
                    <Text style={styles.walletName} numberOfLines={1}>{w.name}</Text>
                    <Text style={styles.walletBalance}>N$ {w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}</Text>
                    <View style={[styles.walletBar, { backgroundColor: '#0029D6' }]} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addWalletCard}
                  onPress={() => router.push('/add-wallet' as never)}
                  activeOpacity={0.8}
                  accessibilityLabel="Add a new wallet"
                >
                  <Ionicons name="add" size={28} color="#2563EB" />
                  <Text style={styles.addWalletText}>Add Wallet</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* ── Contact chips (Figma: Clara, Lukas, Rachel, Simon, Peter) ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Send to</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
            {CONTACT_CHIPS.map((name) => (
              <TouchableOpacity key={name} style={styles.contactChip} onPress={() => router.push('/send-money/select-recipient' as never)} activeOpacity={0.8}>
                <View style={styles.contactChipAvatar}>
                  <Text style={styles.contactChipLetter}>{name[0]}</Text>
                </View>
                <Text style={styles.contactChipName}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {/* ── Services: Mobile, Recharge, Buy Tickets, Subscriptions, Sponsored (Figma) ── */}
          <View style={styles.servicesSection}>
            <View style={styles.servicesGrid}>
              {SERVICES_ROW1.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.serviceBtn}
                  onPress={() => router.push(s.route as never)}
                  activeOpacity={0.8}
                  accessibilityLabel={s.label}
                >
                  <View style={styles.serviceIconWrap}>
                    <Ionicons name={s.icon as never} size={24} color="#4B5563" />
                  </View>
                  <Text style={styles.serviceLabel} numberOfLines={2}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.servicesGrid, { marginTop: 12 }]}>
              {SERVICES_ROW2.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.serviceBtn}
                  onPress={() => router.push(s.route as never)}
                  activeOpacity={0.8}
                  accessibilityLabel={s.label}
                >
                  <View style={styles.serviceIconWrap}>
                    <Ionicons name={s.icon as never} size={24} color="#4B5563" />
                  </View>
                  <Text style={styles.serviceLabel} numberOfLines={2}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Quick G2P: Send, Vouchers, Bills, Loans, Agents, Cash Out ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Quick actions</Text>
          </View>
          <View style={styles.servicesSection}>
            <View style={styles.servicesGrid}>
              {SERVICES.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.serviceBtn}
                  onPress={() => router.push(s.route as never)}
                  activeOpacity={0.8}
                  accessibilityLabel={s.label}
                >
                  <View style={styles.serviceIconWrap}>
                    <Ionicons name={s.icon as never} size={24} color="#4B5563" />
                  </View>
                  <Text style={styles.serviceLabel} numberOfLines={2}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Recent Transactions ── */}
          <View style={[styles.sectionRow, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions' as never)}>
              <Text style={styles.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#0029D6" style={{ marginTop: 24 }} />
          ) : loadError ? (
            <TouchableOpacity onPress={loadData} style={styles.errorBox}>
              <Text style={styles.errorText}>{loadError}</Text>
            </TouchableOpacity>
          ) : recentTx.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyDesc}>Your activity will appear here.</Text>
            </View>
          ) : (
            recentTx.map((tx) => {
              const isPositive = ['receive', 'voucher_redeem', 'add_money', 'loan_disbursement'].includes(tx.type);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  onPress={() => router.push(`/transactions/${tx.id}` as never)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.txIconWrap, isPositive ? styles.txIconReceived : styles.txIconSent]}>
                    <Ionicons
                      name={transactionIcon(tx.type) as never}
                      size={18}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.txBody}>
                    <Text style={styles.txLabel} numberOfLines={1}>{formatTransactionType(tx.type)}</Text>
                    <Text style={styles.txMeta}>{tx.counterparty ?? formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txAmount, isPositive ? styles.txAmountPos : styles.txAmountNeg]}>
                    {formatTransactionAmount(tx)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── FABs ── */}
        <View style={styles.fabRow}>
          <TouchableOpacity
            style={styles.fabSend}
            onPress={() => router.push('/send-money/select-recipient' as never)}
            activeOpacity={0.9}
            accessibilityLabel="Send money"
          >
            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
            <Text style={styles.fabSendText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabQr}
            onPress={() => router.push('/scan-qr' as never)}
            activeOpacity={0.9}
            accessibilityLabel="Scan QR code"
          >
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-NA', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  // Header (Figma: Buffr + notifications)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  buffrLogo: { fontSize: 22, fontWeight: '700', color: '#0029D6' },
  bellBtn: { padding: 8, position: 'relative' },
  bellDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: '#E11D48', borderRadius: 4 },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 200 },
  // Search
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: '#F8FAFC', borderRadius: 9999, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#020617' },
  // Balance
  balanceSection: { paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' },
  balanceAmount: { fontSize: 48, fontWeight: '700', color: '#020617', letterSpacing: -1, marginBottom: 4 },
  balanceLabel: { fontSize: 14, color: '#64748B', marginBottom: 10 },
  showAddRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  pillBtnText: { fontSize: 13, fontWeight: '600', color: '#0029D6' },
  // Buffr Card block (Figma)
  buffrCardBlock: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  buffrCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  buffrCardTitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  buffrCardView: { fontSize: 14, fontWeight: '600', color: '#0029D6' },
  buffrCardName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  buffrCardNumber: { fontSize: 16, fontWeight: '500', color: '#6B7280', letterSpacing: 2 },
  // Contact chips (Figma)
  chipsScroll: { marginBottom: 8 },
  chipsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 4 },
  contactChip: { alignItems: 'center', minWidth: 56 },
  contactChipAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  contactChipLetter: { fontSize: 18, fontWeight: '700', color: '#0029D6' },
  contactChipName: { fontSize: 12, fontWeight: '500', color: '#374151' },
  displayName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  // Section headers
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  sectionLink: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  // Wallets
  walletsScroll: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  walletCard: { width: 160, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  walletCardLoading: { width: 160, height: 120, justifyContent: 'center', alignItems: 'center' },
  walletBadge: { position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#94A3B8' },
  walletEmoji: { fontSize: 28, marginBottom: 10 },
  walletName: { fontSize: 13, fontWeight: '500', color: '#020617', marginBottom: 4 },
  walletBalance: { fontSize: 18, fontWeight: '700', color: '#020617' },
  walletBar: { height: 4, borderRadius: 9999, marginTop: 12, width: '100%' },
  addWalletCard: { width: 160, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', gap: 8 },
  addWalletText: { fontSize: 13, fontWeight: '500', color: '#2563EB' },
  // Divider
  divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16, marginVertical: 24 },
  // Services
  servicesSection: { paddingHorizontal: 16 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceBtn: { width: '30%', minWidth: 100, alignItems: 'center', gap: 8, paddingVertical: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  serviceIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  serviceLabel: { fontSize: 11, fontWeight: '500', color: '#374151', textAlign: 'center', lineHeight: 15 },
  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 16, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  txIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txIconSent: { backgroundColor: '#E11D48' },
  txIconReceived: { backgroundColor: '#22C55E' },
  txBody: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txAmountPos: { color: '#22C55E' },
  txAmountNeg: { color: '#111827' },
  // Empty/error states
  errorBox: { marginHorizontal: 16, padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#E11D48', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  // Bottom spacer + FABs
  bottomSpacer: { height: 160 },
  fabRow: { position: 'absolute', bottom: 90, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, zIndex: 30 },
  fabSend: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 140, height: 60, borderRadius: 30, backgroundColor: '#0029D6', justifyContent: 'center', shadowColor: '#0029D6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fabQr: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
});
