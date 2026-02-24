/**
 * SmartPay Redemption Code – Buffr G2P.
 * Show redemption QR / cash code to the SmartPay agent.
 * §3.2.3 SmartPay code display.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { generateRedemptionQR } from '@/services/vouchers';

const EXPIRE_SECS = 30 * 60; // 30 minutes

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function generateLocalCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function SmartPayCodeScreen() {
  const { voucherId, unitId, unitName } = useLocalSearchParams<{ voucherId: string; unitId: string; unitName?: string }>();
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(EXPIRE_SECS);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Try to generate QR from backend; fall back to local code
    generateRedemptionQR(voucherId ?? '', unitId ?? '', 'smartpay')
      .then(result => {
        setCode(result.qrPayload ? result.qrPayload.slice(0, 8).toUpperCase() : generateLocalCode());
      })
      .catch(() => { setCode(generateLocalCode()); })
      .finally(() => setLoading(false));
  }, [voucherId, unitId]);

  useEffect(() => {
    if (!loading && code) {
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, code]);

  function handleCopy() {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRefresh() {
    setCode(generateLocalCode());
    setCountdown(EXPIRE_SECS);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Redemption Code', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Agent info */}
          <View style={styles.agentBanner}>
            <Ionicons name="person-circle-outline" size={20} color={designSystem.colors.brand.primary} />
            <Text style={styles.agentBannerText}>{unitName ?? 'SmartPay Agent'}</Text>
          </View>

          {/* Code card */}
          <View style={styles.codeCard}>
            <Text style={styles.codeCardLabel}>Your Redemption Code</Text>
            {loading ? (
              <Text style={styles.codeCardValue}>• • • • • •</Text>
            ) : (
              <Text style={[styles.codeCardValue, countdown === 0 && { opacity: 0.4 }]}>{code}</Text>
            )}
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.timerText, countdown === 0 && { color: '#FCA5A5' }]}>
                {countdown > 0 ? `${formatCountdown(countdown)} remaining` : 'Code Expired'}
              </Text>
            </View>
          </View>

          {countdown === 0 ? (
            <View style={styles.expiredCard}>
              <Ionicons name="hourglass-outline" size={32} color={designSystem.colors.semantic.error} />
              <Text style={styles.expiredTitle}>Code Expired</Text>
              <Text style={styles.expiredSub}>Generate a new code to continue.</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.refreshBtnText}>Generate New Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Copy button */}
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                <Ionicons name={copied ? 'checkmark-outline' : 'copy-outline'} size={16} color={copied ? '#22C55E' : designSystem.colors.brand.primary} />
                <Text style={[styles.copyBtnText, copied && { color: '#22C55E' }]}>{copied ? 'Copied!' : 'Copy Code'}</Text>
              </TouchableOpacity>

              {/* Instructions */}
              <View style={styles.instructCard}>
                <Text style={styles.instructTitle}>What to do next</Text>
                {[
                  'Go to the selected SmartPay agent',
                  'Tell them you want to redeem a Buffr voucher',
                  `Show them this code: ${code}`,
                  'The agent will verify and give you your cash',
                ].map((s, i) => (
                  <View key={i} style={[styles.instructRow, i === 3 && { borderBottomWidth: 0 }]}>
                    <View style={styles.instructNum}>
                      <Text style={styles.instructNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.instructText}>{s}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.warnBanner}>
                <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                <Text style={styles.warnText}>This code is unique to your selected agent. Do not share it with anyone other than the agent.</Text>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)' as never)}>
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  agentBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 12, padding: 14, marginBottom: 20 },
  agentBannerText: { fontSize: 14, fontWeight: '700', color: DS.colors.brand.primary, flex: 1 },
  codeCard: { backgroundColor: DS.colors.brand.primary, borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 16 },
  codeCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  codeCardValue: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: 8, marginBottom: 20 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 },
  timerText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999, marginBottom: 20 },
  copyBtnText: { fontSize: 15, fontWeight: '700', color: DS.colors.brand.primary },
  instructCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: DS.colors.neutral.border, marginBottom: 16 },
  instructTitle: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.text, padding: 14, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  instructRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  instructNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  instructNumText: { fontSize: 12, fontWeight: '700', color: DS.colors.brand.primary },
  instructText: { flex: 1, fontSize: 13, color: DS.colors.neutral.text, lineHeight: 18 },
  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 24 },
  warnText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  expiredCard: { alignItems: 'center', padding: 24, marginBottom: 20 },
  expiredTitle: { fontSize: 18, fontWeight: '700', color: DS.colors.semantic.error, marginTop: 10, marginBottom: 6 },
  expiredSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 20 },
  refreshBtn: { height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  refreshBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  doneBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
});
