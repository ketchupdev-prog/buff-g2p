/**
 * Loans – Buffr G2P.
 * Design: reference LoansScreen patterns (gradient summary card, tier cards, warning banner).
 * Voucher-backed advances: up to 1/3 of previous voucher, 15% interest.
 * §3.6 screen 40 / Figma 108:276 / §2.3.
 * Uses UserContext for profile and walletStatus.
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
import { router, Stack } from 'expo-router';
import { getSecureItem } from '@/services/secureStorage';
import { useUser } from '@/contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export interface LoanOffer {
  id: string;
  maxAmount: number;
  interestRate: number;
  previousVoucherAmount: number;
  repaymentInfo: string;
}

export interface ActiveLoan {
  id: string;
  amount: number;
  interestAmount: number;
  totalRepayable: number;
  disbursedAt: string;
  status: 'active' | 'repaid' | 'overdue';
  repaymentDue: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {} as Record<string, string>; }
}

async function getLoanData(): Promise<{ offer: LoanOffer | null; activeLoans: ActiveLoan[] }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/loans`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) {
        const data = (await res.json()) as { offer?: LoanOffer; activeLoans?: ActiveLoan[] };
        return { offer: data.offer ?? null, activeLoans: data.activeLoans ?? [] };
      }
    } catch (e) { console.error('getLoanData:', e); }
  }
  try {
    const [offerRaw, loansRaw] = await Promise.all([
      AsyncStorage.getItem('buffr_loan_offer'),
      AsyncStorage.getItem('buffr_active_loans'),
    ]);
    return {
      offer: offerRaw ? (JSON.parse(offerRaw) as LoanOffer) : null,
      activeLoans: loansRaw ? (JSON.parse(loansRaw) as ActiveLoan[]) : [],
    };
  } catch { return { offer: null, activeLoans: [] }; }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function statusColor(status: ActiveLoan['status']): string {
  if (status === 'active') return '#2563EB';
  if (status === 'repaid') return '#22C55E';
  return '#E11D48';
}

export default function LoansScreen() {
  const { profile, walletStatus } = useUser();
  const [offer, setOffer] = useState<LoanOffer | null>(null);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getLoanData();
      setOffer(data.offer);
      setActiveLoans(data.activeLoans);
    } catch {
      setError('Could not load loan information. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive tier amounts from offer or show a preview state
  const maxLoan = offer?.maxAmount ?? 0;
  const totalVoucherValue = offer?.previousVoucherAmount ?? 0;

  const LOAN_TIERS = [
    { id: 'quick', label: 'Quick Cash Advance', pct: 50, term: '1 month', colors: ['#2563EB', '#06B6D4'] as [string, string], amount: Math.floor(maxLoan * 0.5) },
    { id: 'standard', label: 'Standard Grant Loan', pct: 75, term: '3 months', colors: ['#7C3AED', '#A78BFA'] as [string, string], amount: Math.floor(maxLoan * 0.75) },
    { id: 'maximum', label: 'Maximum Grant Loan', pct: 100, term: '6-12 months', colors: ['#22C55E', '#10B981'] as [string, string], amount: maxLoan },
  ];

  return (
    <View style={styles.screen}>
      
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Loans',
            headerTitleStyle: { fontSize: 18, fontWeight: '700', color: '#111827' },
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: '#111827',
            headerStyle: { backgroundColor: '#fff' },
          }}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#0029D6"
            />
          }
        >
          {loading ? (
            <ActivityIndicator color="#0029D6" style={{ marginTop: 60 }} />
          ) : error ? (
            <TouchableOpacity onPress={load} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Summary card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>Total Grant Value</Text>
                    <Text style={styles.summaryValue}>
                      {totalVoucherValue > 0 ? `N$${totalVoucherValue.toLocaleString()}` : 'N/A'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Max Loan (1/3)</Text>
                    <Text style={styles.summaryValue}>
                      {maxLoan > 0 ? `N$${maxLoan.toLocaleString()}` : 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressWrap}>
                  <View style={styles.progressBar}>
                    {maxLoan > 0 && <View style={[styles.progressFill, { width: '33%' }]} />}
                  </View>
                  <Text style={styles.progressHint}>15% APR • Auto-repayment from future grants</Text>
                </View>
              </View>

              {/* Warning banner */}
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={20} color="#B45309" />
                <Text style={styles.warningText}>
                  Stamp duties, Namfisa levies & disbursement fees apply. Repayment is deducted from future grant disbursements.
                </Text>
              </View>

              {/* Vouchers link */}
              <TouchableOpacity
                style={styles.vouchersLink}
                onPress={() => router.push('/(tabs)/vouchers' as never)}
                activeOpacity={0.8}
              >
                <Ionicons name="gift-outline" size={20} color="#0029D6" />
                <Text style={styles.vouchersLinkText}>My Vouchers</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Loan tiers */}
              <Text style={styles.sectionTitle}>Loan options</Text>
              {offer ? (
                LOAN_TIERS.map((tier) => (
                  <TouchableOpacity
                    key={tier.id}
                    style={styles.tierCard}
                    onPress={() => router.push({ pathname: '/loans/apply', params: { offerId: offer.id, tierId: tier.id, maxAmount: tier.amount.toString() } } as never)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.tierIconWrap, { backgroundColor: tier.colors[0] }]}>
                      <Ionicons name="cash-outline" size={24} color="#fff" />
                    </View>
                    <View style={styles.tierBody}>
                      <Text style={styles.tierLabel}>{tier.label}</Text>
                      <Text style={styles.tierAmount}>N${tier.amount.toLocaleString()}</Text>
                      <Text style={styles.tierTerm}>{tier.term} • {tier.pct}% of max</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noOffer}>
                  <Ionicons name="trending-up-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noOfferTitle}>No offer available</Text>
                  <Text style={styles.noOfferText}>
                    Loan offers are based on your previous voucher history. Redeem a voucher first to become eligible.
                  </Text>
                </View>
              )}

              {/* Active Loans */}
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Active Loans</Text>
              {activeLoans.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No active loans</Text>
                  <Text style={styles.emptyDesc}>Apply using your voucher value above.</Text>
                </View>
              ) : (
                activeLoans.map((loan) => (
                  <TouchableOpacity
                    key={loan.id}
                    style={styles.loanCard}
                    onPress={() => router.push(`/loans/${loan.id}` as never)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.loanRow}>
                      <View>
                        <Text style={styles.loanAmount}>N${loan.amount.toLocaleString()}</Text>
                        <Text style={styles.loanSub}>+ N${loan.interestAmount.toFixed(2)} interest</Text>
                      </View>
                      <View style={[styles.loanStatus, { backgroundColor: statusColor(loan.status) + '20' }]}>
                        <Text style={[styles.loanStatusText, { color: statusColor(loan.status) }]}>
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.loanRepayDate}>
                      Total repayable: N${loan.totalRepayable.toFixed(2)} · Due {formatDate(loan.repaymentDue)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  errorBox: { padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12, marginTop: 40 },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  // Summary gradient card
  summaryCard: { borderRadius: 24, padding: 24, marginBottom: 16, backgroundColor: '#0029D6' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  progressWrap: { marginTop: 4 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  progressHint: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  // Warning banner
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  // Vouchers link
  vouchersLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24, gap: 12 },
  vouchersLinkText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0029D6' },
  // Section title
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 12 },
  // Tier cards
  tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  tierIconWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  tierBody: { flex: 1 },
  tierLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tierAmount: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 2 },
  tierTerm: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  // No offer state
  noOffer: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#F9FAFB', borderRadius: 16 },
  noOfferTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 4 },
  noOfferText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 260, lineHeight: 18 },
  // Empty loans state
  emptyState: { backgroundColor: '#F9FAFB', padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  // Active loan cards
  loanCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  loanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  loanAmount: { fontSize: 17, fontWeight: '700', color: '#111827' },
  loanSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  loanStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  loanStatusText: { fontSize: 12, fontWeight: '600' },
  loanRepayDate: { fontSize: 12, color: '#9CA3AF' },
});
