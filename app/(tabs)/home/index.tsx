/**
 * Home screen – Buffr G2P.
 * §3.4 screen 25 / Figma nodeId 45:837.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useFocusEffect, router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { getWallets, type Wallet } from '@/services/wallets';
import { getContacts, type Contact } from '@/services/send';
import { getTransactions, formatTransactionType, formatTransactionAmount, transactionIcon, type Transaction } from '@/services/transactions';
import { designSystem } from '@/constants/designSystem';
import CardFrame from '@/components/cards/CardFrame';
import { AppHeader } from '@/components/layout';
import { WalletCarousel, RecentContactsCarousel } from '@/components/home';
import { AddMoneyModal } from '@/components/modals';

// ─── 3×3 Services Grid ────────────────────────────────────────────────────────
// 9 tiles per Buffr app design: Proof of Life, Receive, Cash Out, Vouchers, Airtime, Bills, Loans, Groups, Find Agent. Send remains via FAB.
const SERVICES_GRID = [
  {
    id: 'proof-of-life',
    label: 'Proof of Life',
    icon: 'shield-checkmark-outline' as const,
    color: '#B45309',
    bg: '#FFFBEB',
    route: '/proof-of-life/verify',
  },
  {
    id: 'receive',
    label: 'Receive',
    icon: 'arrow-down-circle-outline' as const,
    color: '#22C55E',
    bg: '#F0FDF4',
    route: '/receive',
  },
  {
    id: 'cashout',
    label: 'Cash Out',
    icon: 'cash-outline' as const,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    route: '/wallets',
  },
  {
    id: 'vouchers',
    label: 'Vouchers',
    icon: 'gift-outline' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    route: '/(tabs)/vouchers',
  },
  {
    id: 'airtime',
    label: 'Airtime',
    icon: 'phone-portrait-outline' as const,
    color: '#0891B2',
    bg: '#ECFEFF',
    route: '/(tabs)/home/bills?category=airtime',
  },
  {
    id: 'bills',
    label: 'Pay Bills',
    icon: 'document-text-outline' as const,
    color: '#E11D48',
    bg: '#FFF1F2',
    route: '/(tabs)/home/bills',
  },
  {
    id: 'loans',
    label: 'Loans',
    icon: 'business-outline' as const,
    color: '#6366F1',
    bg: '#EEF2FF',
    route: '/(tabs)/home/loans',
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: 'people-outline' as const,
    color: '#7C3AED',
    bg: '#EDE9FE',
    route: '/groups',
  },
  {
    id: 'agents',
    label: 'Find Agent',
    icon: 'location-outline' as const,
    color: '#64748B',
    bg: '#F8FAFC',
    route: '/(tabs)/home/agents',
  },
];

/** True when proof-of-life due date is within the next 14 days. §3.6 screen 58. */
function isProofOfLifeDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const in14 = new Date(now);
  in14.setDate(in14.getDate() + 14);
  return due >= now && due <= in14;
}

export default function HomeScreen() {
  const { profile, cardNumberMasked, proofOfLifeDueDate, walletStatus } = useUser();
  const showProofOfLifeBanner = isProofOfLifeDueSoon(proofOfLifeDueDate);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  // Search: filter services, recent transactions, and contacts by query (PRD SearchBar "Search anything...")
  const q = searchQuery.trim().toLowerCase();
  const filteredServices = q
    ? SERVICES_GRID.filter((s) => s.label.toLowerCase().includes(q))
    : SERVICES_GRID;
  const filteredRecentTx = q
    ? recentTx.filter(
        (tx) =>
          formatTransactionType(tx.type).toLowerCase().includes(q) ||
          (tx.counterparty ?? '').toLowerCase().includes(q)
      )
    : recentTx;
  const filteredContacts = q
    ? contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
    : contacts;

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [ws, cs, txs] = await Promise.all([
        getWallets(),
        getContacts(),
        getTransactions({ limit: 5 }),
      ]);
      setWallets(ws);
      setContacts(cs);
      setRecentTx(txs);
    } catch {
      setLoadError('Could not load data. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // §3.6 screen 61: when wallet is frozen, redirect to proof-of-life expired
  useEffect(() => {
    if (walletStatus === 'frozen') {
      router.replace('/proof-of-life/expired' as never);
    }
  }, [walletStatus]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Background gradient via react-native-svg (works without native expo-linear-gradient module)
  const bg = (designSystem.colors as Record<string, unknown>).backgroundGradient as
    | { screenColors: string[]; screenLocations: number[] }
    | undefined;
  const bgColors = bg?.screenColors ?? ['#FFFFFF', '#E8FBF9', '#D6EBFE', '#93C5FD', '#C7DAFA', '#EFF6FF'];
  const bgLocations = bg?.screenLocations ?? [0, 0.25, 0.4, 0.5, 0.6, 1];
  const { width, height } = Dimensions.get('window');

  return (
    <View style={styles.screen}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="homeBg" x1="0" y1="0" x2="0" y2="1">
            {bgColors.map((color, i) => (
              <Stop key={i} offset={String(bgLocations[i] ?? i / (bgColors.length - 1))} stopColor={color} />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#homeBg)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <AppHeader
          searchPlaceholder="Search anything..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch
          onNotificationPress={() => router.push('/(tabs)/profile/notifications' as never)}
          onAvatarPress={() => router.push('/(tabs)/profile' as never)}
          avatarUri={profile?.photoUri ?? null}
          notificationBadge
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0029D6" />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* §3.6 screen 58: Proof-of-life banner when due within 14 days */}
          {showProofOfLifeBanner && (
            <TouchableOpacity
              style={styles.pofBanner}
              onPress={() => router.push('/proof-of-life/verify' as never)}
              activeOpacity={0.9}
              accessibilityLabel="Proof of life due. Verify now to continue receiving grants."
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#B45309" />
              <Text style={styles.pofBannerText}>Please verify to continue receiving grants.</Text>
              <Text style={styles.pofBannerCta}>Verify now</Text>
            </TouchableOpacity>
          )}

          {/* ── Balance ── */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceAmount}>
              {loading
                ? '—'
                : balanceVisible
                ? `N$${totalBalance.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'N$••••'}
            </Text>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <View style={styles.showAddRow}>
              <TouchableOpacity
                style={styles.pillBtn}
                onPress={() => setBalanceVisible((v) => !v)}
                accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}
              >
                <Text style={styles.pillBtnText}>{balanceVisible ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pillBtn}
                onPress={() => (wallets.length ? setShowAddMoneyModal(true) : router.push('/wallets' as never))}
                accessibilityLabel="Add"
              >
                <Text style={styles.pillBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Buffr Card thumbnail ── */}
          <TouchableOpacity
            style={styles.buffrCardBlock}
            onPress={() => router.push('/wallets' as never)}
            activeOpacity={0.9}
          >
            <View style={styles.buffrCardThumbWrap}>
              <View style={styles.buffrCardThumbScale}>
                <CardFrame
                  userName={displayName}
                  cardNumber={cardNumberMasked ?? ''}
                  expiryDate="••/••"
                />
              </View>
            </View>
            <View style={styles.buffrCardTextBlock}>
              <View style={styles.buffrCardTopRow}>
                <Text style={styles.buffrCardTitle}>Buffr Account</Text>
                <View style={styles.buffrCardActions}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); wallets.length ? setShowAddMoneyModal(true) : router.push('/wallets' as never); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.buffrCardAddMoney}>Add money</Text>
                  </TouchableOpacity>
                  <Text style={styles.buffrCardView}>View &gt;</Text>
                </View>
              </View>
              {displayName ? <Text style={styles.buffrCardName}>{displayName}</Text> : null}
              {cardNumberMasked ? (
                <Text style={styles.buffrCardNumber}>{cardNumberMasked}</Text>
              ) : null}
            </View>
          </TouchableOpacity>

          {/* ── Wallet carousel ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Wallets</Text>
          </View>
          <WalletCarousel
            wallets={wallets}
            loading={loading}
            onWalletPress={(w) => router.push(`/wallets/${w.id}` as never)}
            onAddWalletPress={() => router.push('/add-wallet' as never)}
            onAddFundsPress={() => (wallets.length ? setShowAddMoneyModal(true) : router.push('/add-wallet' as never))}
          />

          {/* ── Recent contacts (filtered by search) ── */}
          <RecentContactsCarousel
            contacts={filteredContacts}
            limit={8}
            onContactPress={(c) =>
              router.push({
                pathname: '/send-money/amount',
                params: { recipientPhone: c.phone, recipientName: c.name },
              } as never)
            }
          />

          {/* ── 3×3 Services ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Services</Text>
          </View>

          <View style={styles.grid}>
            {filteredServices.length === 0 ? (
              q ? (
                <View style={[styles.gridCell, { width: '100%', paddingVertical: 24 }]}>
                  <Ionicons name="search-outline" size={32} color="#94A3B8" />
                  <Text style={[styles.gridLabel, { marginTop: 8 }]}>No services match "{searchQuery}"</Text>
                </View>
              ) : null
            ) : (
              filteredServices.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridCell}
                  onPress={() => router.push(item.route as never)}
                  activeOpacity={0.7}
                  accessibilityLabel={item.label}
                >
                  <View style={[styles.gridIconWrap, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* ── Recent Transactions ── */}
          <View style={[styles.sectionRow, { marginTop: 28 }]}>
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
          ) : filteredRecentTx.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {q ? 'No matches for your search' : 'No transactions yet'}
              </Text>
              <Text style={styles.emptyDesc}>
                {q ? 'Try a different term.' : 'Your activity will appear here.'}
              </Text>
            </View>
          ) : (
            filteredRecentTx.map((tx) => {
              const isPositive = ['receive', 'voucher_redeem', 'add_money', 'loan_disbursement'].includes(tx.type);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  onPress={() => router.push(`/(tabs)/transactions/${tx.id}` as never)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.txIconWrap, isPositive ? styles.txIconReceived : styles.txIconSent]}>
                    <Ionicons name={transactionIcon(tx.type) as never} size={18} color="#fff" />
                  </View>
                  <View style={styles.txBody}>
                    <Text style={styles.txLabel} numberOfLines={1}>
                      {formatTransactionType(tx.type)}
                    </Text>
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

        <AddMoneyModal
          visible={showAddMoneyModal}
          onClose={() => setShowAddMoneyModal(false)}
          walletId={wallets[0]?.id ?? null}
        />
      </SafeAreaView>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-NA', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 200 },

  // §3.6 screen 58: Proof-of-life banner
  pofBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  pofBannerText: { flex: 1, fontSize: 14, color: '#92400E', fontWeight: '500' },
  pofBannerCta: { fontSize: 14, fontWeight: '700', color: '#B45309' },

  // Balance
  balanceSection: { paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' },
  balanceAmount: { fontSize: 48, fontWeight: '700', color: '#020617', letterSpacing: -1, marginBottom: 4 },
  balanceLabel: { fontSize: 14, color: '#64748B', marginBottom: 10 },
  showAddRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  pillBtnText: { fontSize: 13, fontWeight: '600', color: '#0029D6' },

  // Buffr card block
  buffrCardBlock: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  buffrCardThumbWrap: { width: 76, height: 48, borderRadius: 10, overflow: 'hidden' },
  buffrCardThumbScale: {
    width: 340,
    height: 214,
    transform: [{ scale: 0.22 }],
    marginLeft: -132,
    marginTop: -83,
  },
  buffrCardTextBlock: { flex: 1, minWidth: 0 },
  buffrCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  buffrCardTitle: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  buffrCardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buffrCardAddMoney: { fontSize: 13, fontWeight: '600', color: '#059669' },
  buffrCardView: { fontSize: 13, fontWeight: '600', color: '#0029D6' },
  buffrCardName: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  buffrCardNumber: { fontSize: 14, fontWeight: '500', color: '#6B7280', letterSpacing: 2 },

  // Section headers
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  sectionLink: { fontSize: 14, color: '#2563EB', fontWeight: '500' },

  // ── 3×3 Services grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  gridCell: {
    // (screenWidth - 24px side padding - 2×10px gaps) / 3
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gridIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Transactions
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  txIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txIconSent: { backgroundColor: '#E11D48' },
  txIconReceived: { backgroundColor: '#22C55E' },
  txBody: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txAmountPos: { color: '#22C55E' },
  txAmountNeg: { color: '#111827' },

  // States
  errorBox: { marginHorizontal: 16, padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#E11D48', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  // FABs
  bottomSpacer: { height: 160 },
  fabRow: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    zIndex: 30,
  },
  fabSend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 140,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0029D6',
    justifyContent: 'center',
    shadowColor: '#0029D6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fabQr: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
