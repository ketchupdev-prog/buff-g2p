/**
 * Loan Detail – Buffr G2P.
 * §23 / Figma 111:487.
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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getSecureItem } from '@/services/secureStorage';
import { useUser } from '@/contexts/UserContext';
import { InfoBanner, StatusBadge, statusToVariant, Timeline, Toggle, type TimelineEvent } from '@/components/ui';
import type { ActiveLoan } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface LoanMeta { name: string; icon: string; }

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function getLoan(id: string): Promise<ActiveLoan | null> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/loans/${id}`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return (await res.json()) as ActiveLoan;
    } catch (e) { console.error('getLoan:', e); }
  }
  try {
    const raw = await AsyncStorage.getItem('buffr_active_loans');
    const loans = raw ? (JSON.parse(raw) as ActiveLoan[]) : [];
    return loans.find(l => l.id === id) ?? null;
  } catch { return null; }
}

async function getLoanMeta(id: string): Promise<LoanMeta> {
  try {
    const raw = await AsyncStorage.getItem('buffr_loan_details') ?? '{}';
    const all = JSON.parse(raw) as Record<string, LoanMeta>;
    return all[id] ?? { name: 'My Loan', icon: '💰' };
  } catch { return { name: 'My Loan', icon: '💰' }; }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function buildTimeline(loan: ActiveLoan): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: 'credited', title: 'Loan Credited', subtitle: `N$${loan.amount.toLocaleString()} disbursed to your wallet`, date: formatDate(loan.disbursedAt), color: '#22C55E' },
  ];
  if (loan.status === 'repaid') {
    events.push({ id: 'repaid', title: 'Loan Repaid', subtitle: `N$${loan.totalRepayable.toFixed(2)} deducted from grant`, date: formatDate(loan.repaymentDue), color: '#2563EB' });
  } else if (loan.status === 'overdue') {
    events.push({ id: 'overdue', title: 'Payment Overdue', subtitle: `N$${loan.totalRepayable.toFixed(2)} outstanding`, date: formatDate(loan.repaymentDue), color: '#E11D48' });
  } else {
    events.push({ id: 'due', title: 'Upcoming Repayment', subtitle: `N$${loan.totalRepayable.toFixed(2)} from next grant`, date: formatDate(loan.repaymentDue), color: '#D1D5DB', hollow: true });
  }
  return events;
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useUser();
  const [loan, setLoan] = useState<ActiveLoan | null>(null);
  const [meta, setMeta] = useState<LoanMeta>({ name: 'My Loan', icon: '💰' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [l, m] = await Promise.all([getLoan(id ?? ''), getLoanMeta(id ?? '')]);
      setLoan(l);
      setMeta(m);
    } catch { setError('Could not load loan details.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Loan Details', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
        <ActivityIndicator color="#0029D6" />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.centerFill}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Loan Details', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>Loan not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Loan Details', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0029D6" />}
        >
          {error && <InfoBanner variant="error" message={error} style={{ marginBottom: 16 }} />}

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroEmoji}>{meta.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{meta.name}</Text>
              <Text style={styles.heroRef}>Ref: {loan.id}</Text>
            </View>
            <StatusBadge
              label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
              variant={statusToVariant(loan.status)}
            />
          </View>

          {/* Amount card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Loan Amount</Text>
            <Text style={styles.amountValue}>N${loan.amount.toLocaleString()}</Text>
            <View style={styles.amountMeta}>
              <View>
                <Text style={styles.metaLabel}>+ Interest (15%)</Text>
                <Text style={styles.metaValue}>N${loan.interestAmount.toFixed(2)}</Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Total Repayable</Text>
                <Text style={[styles.metaValue, { color: '#93C5FD', fontWeight: '700' }]}>
                  N${loan.totalRepayable.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.dueChip}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={styles.dueText}>Due {formatDate(loan.repaymentDue)}</Text>
            </View>
          </View>

          {/* Auto Pay */}
          <View style={styles.autoPayCard}>
            <Ionicons name="repeat-outline" size={20} color={autoPayEnabled ? '#22C55E' : '#9CA3AF'} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.autoPayTitle}>Auto Pay</Text>
              <Text style={styles.autoPayDesc}>
                {autoPayEnabled ? 'Repayment deducted from next grant' : 'Manual repayment required'}
              </Text>
            </View>
            <Toggle value={autoPayEnabled} onValueChange={setAutoPayEnabled} />
          </View>

          {/* Timeline */}
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timelineCard}>
            <Timeline events={buildTimeline(loan)} />
          </View>

          <InfoBanner
            variant="info"
            message="Repayment is automatically deducted when you redeem your next grant. Contact support to arrange alternative repayment."
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1 },
  content: { padding: 24 },
  centerFill: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  backLink: { fontSize: 15, color: '#0029D6', fontWeight: '600' },

  // Hero
  heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  heroEmoji: { fontSize: 28 },
  heroName: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 2 },
  heroRef: { fontSize: 12, color: '#9CA3AF' },

  // Amount card
  amountCard: { backgroundColor: '#0029D6', borderRadius: 20, padding: 24, marginBottom: 12 },
  amountLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  amountValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 16 },
  amountMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  metaValue: { fontSize: 15, fontWeight: '600', color: '#fff' },
  dueChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  dueText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  // Auto Pay
  autoPayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  autoPayTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  autoPayDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // Timeline
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 14 },
  timelineCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
});
