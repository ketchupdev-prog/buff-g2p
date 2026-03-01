/**
 * Wallets list – Buffr G2P. §3.12 wallets list.
 * Lists user wallets; tap to open wallet detail.
 * Uses UserContext for profile, walletStatus, isLoaded.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { getWallets, type Wallet } from '@/services/wallets';

/** User-defined wallet display: use wallet's icon (emoji) when set, else neutral. No predetermined types per Buffr design. */
function walletIcon(w: Wallet): string {
  return w.icon?.trim() ? w.icon : '💼';
}

export default function WalletsListScreen() {
  const { profile, walletStatus, isLoaded } = useUser();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFrozen = walletStatus === 'frozen';

  const load = useCallback(async () => {
    try {
      const list = await getWallets();
      setWallets(list);
    } catch (e) {
      console.error('Wallets list load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Wallets', headerShown: true, headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        {!isLoaded || loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={designSystem.colors.brand.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={designSystem.colors.brand.primary} />}
          >
            {isFrozen && (
              <View style={styles.frozenBanner}>
                <Ionicons name="lock-closed-outline" size={20} color={designSystem.colors.semantic.error} />
                <Text style={styles.frozenText}>Your wallet is frozen. Complete proof-of-life to use wallets.</Text>
              </View>
            )}
            {wallets.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No wallets yet</Text>
                <Text style={styles.emptySub}>Your wallets will appear here.</Text>
              </View>
            ) : (
              wallets.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.card}
                  onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: w.id } } as never)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconWrap}>
                    <Text style={styles.iconEmoji}>{walletIcon(w)}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{w.name}</Text>
                    <Text style={styles.cardBalance}>N${w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={designSystem.colors.neutral.textSecondary} />
                </TouchableOpacity>
              ))
            )}
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
  scroll: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: designSystem.colors.neutral.text },
  emptySub: { fontSize: 14, color: designSystem.colors.neutral.textSecondary, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconEmoji: { fontSize: 24 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: designSystem.colors.neutral.text },
  cardBalance: { fontSize: 14, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  frozenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designSystem.colors.feedback.red100,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  frozenText: { flex: 1, fontSize: 13, color: designSystem.colors.semantic.error, lineHeight: 18 },
});
