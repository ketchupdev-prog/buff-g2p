/**
 * Home screen – Buffr G2P.
 * Design: reference state-flow HomeScreen.tsx patterns.
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


export default function HomeScreen() {
  const { profile, buffrId, cardNumberMasked } = useUser();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadData();
    }, [loadData])
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Background: Buffr App Design (BuffrCrew) — teal→blue gradient via SVG so it works without expo-linear-gradient native module.
  const bg = (designSystem.colors as Record<string, unknown>).backgroundGradient as { screenColors: string[]; screenLocations: number[] } | undefined;
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

        {/* ── Header: Search (left) + Notification + Avatar (right) – §6.4 ── */}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0029D6" />}
          keyboardShouldPersistTaps="handled"
        >
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
                <Text style={styles.pillBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Buffr Card = main Buffr account (primary wallet); card designs also represent additional wallets with user context (name, balance, type). */}
          <TouchableOpacity
            style={styles.buffrCardBlock}
            onPress={() => router.push('/wallets' as never)}
            activeOpacity={0.9}
          >
            <View style={styles.buffrCardThumbWrap}>
              <View style={styles.buffrCardThumbScale}>
                <CardFrame
                  userName={displayName || 'Eino Nashikoto'}
                  cardNumber={cardNumberMasked || '••018 4756 9018'}
                  expiryDate="••/••"
                />
              </View>
            </View>
            <View style={styles.buffrCardTextBlock}>
              <View style={styles.buffrCardTop}>
                <Text style={styles.buffrCardTitle}>Buffr Card</Text>
                <TouchableOpacity onPress={() => router.push('/wallets' as never)} hitSlop={12}>
                  <Text style={styles.buffrCardView}>View &gt;</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.buffrCardName}>{displayName || 'Eino Nashikoto'}</Text>
              <Text style={styles.buffrCardNumber}>{cardNumberMasked || '••018 4756 9018'}</Text>
            </View>
          </TouchableOpacity>

          {/* ── Wallets (real data: create/delete/modify from add-wallet and wallet detail) ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Wallets</Text>
          </View>
          <WalletCarousel
            wallets={wallets}
            loading={loading}
            onWalletPress={(w) => router.push(`/wallets/${w.id}` as never)}
            onAddWalletPress={() => router.push('/add-wallet' as never)}
          />

          {/* ── Recent Contacts (real data from getContacts(); empty = section hidden) ── */}
          {/* CONTACT_CHIPS alias kept for cached-bundle compatibility; UI uses RecentContactsCarousel */}
          <RecentContactsCarousel
            contacts={contacts}
            limit={8}
            onContactPress={(c) => router.push({ pathname: '/send-money/amount', params: { recipientPhone: c.phone, recipientName: c.name } } as never)}
          />

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
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 200 },
  // Balance
  balanceSection: { paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' },
  balanceAmount: { fontSize: 48, fontWeight: '700', color: '#020617', letterSpacing: -1, marginBottom: 4 },
  balanceLabel: { fontSize: 14, color: '#64748B', marginBottom: 10 },
  showAddRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  pillBtnText: { fontSize: 13, fontWeight: '600', color: '#0029D6' },
  // Buffr Card block (Figma): card asset thumbnail (CardFrame from assets/card-designs) + text; bell icon kept in header.
  buffrCardBlock: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 16 },
  buffrCardThumbWrap: { width: 76, height: 48, borderRadius: 10, overflow: 'hidden' },
  buffrCardThumbScale: { width: 340, height: 214, transform: [{ scale: 0.22 }], marginLeft: -132, marginTop: -83 },
  buffrCardTextBlock: { flex: 1, minWidth: 0 },
  buffrCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  buffrCardTitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  buffrCardView: { fontSize: 14, fontWeight: '600', color: '#0029D6' },
  buffrCardName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  buffrCardNumber: { fontSize: 16, fontWeight: '500', color: '#6B7280', letterSpacing: 2 },
  // Section headers
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  sectionLink: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
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
