/**
 * Add Money – Buffr G2P.
 * 3 methods: Bank EFT, Agent Deposit, Debit Card (future).
 * §3.6 screen 51.
 */
import React, { useState } from 'react';
import {
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

type Method = 'bank' | 'agent' | 'card';

const METHODS: Array<{ id: Method; label: string; subtitle: string; icon: string; badge?: string }> = [
  { id: 'bank', label: 'Bank Transfer (EFT)', subtitle: 'Transfer from your bank account', icon: 'business-outline' },
  { id: 'agent', label: 'Agent Deposit', subtitle: 'Give cash to a Buffr agent', icon: 'person-outline' },
  { id: 'card', label: 'Debit / Credit Card', subtitle: 'Link a card to instantly top up', icon: 'card-outline' },
];

interface BankDetail { label: string; value: string; copyable?: boolean }

export default function AddMoneyScreen() {
  const { id: walletId } = useLocalSearchParams<{ id: string }>();
  const { buffrId, profile } = useUser();
  const [method, setMethod] = useState<Method>('bank');
  const [copied, setCopied] = useState<string | null>(null);

  const reference = buffrId ?? 'BFR-' + (profile?.phone?.replace(/\D/g, '').slice(-6) ?? '000000');

  const bankDetails: BankDetail[] = [
    { label: 'Bank', value: 'Bank Windhoek' },
    { label: 'Account Name', value: 'Buffr Financial Services' },
    { label: 'Account Number', value: '80 123 456 789', copyable: true },
    { label: 'Branch Code', value: '481 872', copyable: true },
    { label: 'Account Type', value: 'Cheque / Current' },
    { label: 'Reference', value: reference, copyable: true },
  ];

  function copyToClipboard(value: string, key: string) {
    Clipboard.setString(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Add Money', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Method selector */}
          <View style={styles.methodList}>
            {METHODS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodCard, method === m.id && styles.methodCardActive]}
                onPress={() => m.id === 'card' && walletId ? router.push({ pathname: '/wallets/[id]/add-money/card' as never, params: { id: walletId } }) : setMethod(m.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIcon, method === m.id && styles.methodIconActive]}>
                  <Ionicons name={m.icon as never} size={20} color={method === m.id ? '#fff' : designSystem.colors.brand.primary} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodLabel, method === m.id && { color: designSystem.colors.brand.primary }]}>{m.label}</Text>
                  <Text style={styles.methodSub}>{m.subtitle}</Text>
                </View>
                {method === m.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={designSystem.colors.brand.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Bank EFT */}
          {method === 'bank' && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Transfer to this account</Text>
              <View style={styles.detailCard}>
                {bankDetails.map((d, idx) => (
                  <View key={d.label} style={[styles.detailRow, idx === bankDetails.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>{d.label}</Text>
                    <View style={styles.detailValueRow}>
                      <Text style={[styles.detailValue, d.label === 'Reference' && { color: designSystem.colors.brand.primary, fontWeight: '700' }]}>{d.value}</Text>
                      {d.copyable && (
                        <TouchableOpacity onPress={() => copyToClipboard(d.value, d.label)} style={styles.copyBtn}>
                          <Ionicons name={copied === d.label ? 'checkmark-outline' : 'copy-outline'} size={14} color={copied === d.label ? '#22C55E' : designSystem.colors.neutral.textTertiary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.warnBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                <Text style={styles.warnText}>Always use your Reference number so we can match your payment. Transfers typically arrive within 1–2 business days.</Text>
              </View>
            </View>
          )}

          {/* Debit / Credit Card – link card to top up */}
          {method === 'card' && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Add money with a card</Text>
              <View style={styles.detailCard}>
                <View style={styles.cardMethodContent}>
                  <Text style={styles.methodSub}>Link your debit or credit card to add money to this wallet. You can use the card to top up anytime.</Text>
                  <TouchableOpacity style={styles.findAgentBtn} onPress={() => router.push('/add-card' as never)} activeOpacity={0.8}>
                    <Ionicons name="card-outline" size={16} color={designSystem.colors.brand.primary} />
                    <Text style={styles.findAgentText}>Link a card</Text>
                    <Ionicons name="chevron-forward" size={14} color={designSystem.colors.brand.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Agent deposit */}
          {method === 'agent' && (
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Deposit via a Buffr Agent</Text>
              <View style={styles.detailCard}>
                {[
                  { icon: 'location-outline', text: 'Find a Buffr-registered agent near you' },
                  { icon: 'cash-outline', text: 'Hand the agent the cash you want to deposit' },
                  { icon: 'phone-portrait-outline', text: `Tell them your Buffr ID: ${reference}` },
                  { icon: 'checkmark-circle-outline', text: 'Funds appear in your wallet within minutes' },
                ].map((item, i) => (
                  <View key={i} style={[styles.agentStep, i === 3 && { borderBottomWidth: 0 }]}>
                    <View style={styles.agentStepNum}><Text style={styles.agentStepNumText}>{i + 1}</Text></View>
                    <Ionicons name={item.icon as never} size={18} color={designSystem.colors.brand.primary} />
                    <Text style={styles.agentStepText}>{item.text}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.refBox}>
                <Text style={styles.refLabel}>Your Buffr ID</Text>
                <Text style={styles.refValue}>{reference}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(reference, 'buffr_id')} style={styles.copyRefBtn}>
                  <Ionicons name={copied === 'buffr_id' ? 'checkmark-outline' : 'copy-outline'} size={14} color={copied === 'buffr_id' ? '#22C55E' : '#fff'} />
                  <Text style={styles.copyRefText}>{copied === 'buffr_id' ? 'Copied!' : 'Copy ID'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.findAgentBtn} onPress={() => router.push('/(tabs)/home/agents' as never)} activeOpacity={0.8}>
                <Ionicons name="location-outline" size={16} color={designSystem.colors.brand.primary} />
                <Text style={styles.findAgentText}>Find nearest Buffr Agent</Text>
                <Ionicons name="chevron-forward" size={14} color={designSystem.colors.brand.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 24 },
  methodList: { gap: 10, marginBottom: 24 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  methodCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  methodIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  methodIconActive: { backgroundColor: DS.colors.brand.primary },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  methodSub: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  detailSection: { gap: 12 },
  detailTitle: { fontSize: 15, fontWeight: '700', color: DS.colors.neutral.text },
  detailCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: DS.colors.neutral.border },
  cardMethodContent: { padding: 16, gap: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  detailLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  detailValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailValue: { fontSize: 14, fontWeight: '500', color: DS.colors.neutral.text },
  copyBtn: { padding: 4 },
  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14 },
  warnText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  agentStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  agentStepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  agentStepNumText: { fontSize: 12, fontWeight: '700', color: DS.colors.brand.primary },
  agentStepText: { flex: 1, fontSize: 13, color: DS.colors.neutral.text, lineHeight: 18 },
  refBox: { backgroundColor: DS.colors.brand.primary, borderRadius: 16, padding: 20, alignItems: 'center' },
  refLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  refValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 2, marginBottom: 14 },
  copyRefBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 },
  copyRefText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  findAgentBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 12, padding: 14 },
  findAgentText: { flex: 1, fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
});
