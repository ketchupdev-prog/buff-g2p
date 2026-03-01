/**
 * Cards View – Buffr G2P. §3.4 screen 34b.
 * Buffr (NamPost) main card + linked bank cards loaded from primary wallet.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import CardFrame from '@/components/cards/CardFrame';
import { getWallets } from '@/services/wallets';

const DS = designSystem;

interface LinkedCard {
  id: string;
  label: string;
  last4: string;
  brand: string;
}

const BRAND_ICON: Record<string, string> = {
  Visa: 'card-outline',
  Mastercard: 'card-outline',
  default: 'card-outline',
};

export default function CardsScreen() {
  const { profile, cardNumberMasked } = useUser();
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Buffr User';

  const load = useCallback(async () => {
    try {
      const wallets = await getWallets();
      // Collect linked cards from all wallets (primarily the main wallet)
      const cards: LinkedCard[] = [];
      wallets.forEach(w => {
        w.linkedCards?.forEach(lc => {
          if (!cards.find(c => c.id === lc.id)) {
            cards.push({ id: lc.id, label: lc.label, last4: lc.last4, brand: lc.brand });
          }
        });
      });
      setLinkedCards(cards);
    } catch (e) {
      console.error('CardsScreen load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Cards', headerShown: true, headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Buffr account card */}
          <Text style={styles.sectionLabel}>Buffr Account</Text>
          <TouchableOpacity style={styles.cardWrap} activeOpacity={0.9}>
            <CardFrame
              userName={displayName}
              cardNumber={cardNumberMasked ?? '•••• •••• •••• ••••'}
              expiryDate="••/••"
            />
          </TouchableOpacity>

          {/* Linked bank cards */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Linked bank cards</Text>
            <TouchableOpacity onPress={() => router.push('/add-card' as never)}>
              <Text style={styles.addLink}>+ Add card</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={DS.colors.brand.primary} style={{ marginTop: 16 }} />
          ) : linkedCards.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="card-outline" size={32} color={DS.colors.neutral.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No linked cards</Text>
              <Text style={styles.emptyDesc}>Link a bank card to easily top up your Buffr wallet or pay merchants.</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-card' as never)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Link a card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            linkedCards.map((c) => (
              <View key={c.id} style={styles.linkedRow}>
                <View style={styles.linkedIconWrap}>
                  <Ionicons name={(BRAND_ICON[c.brand] ?? BRAND_ICON.default) as never} size={22} color={DS.colors.brand.primary} />
                </View>
                <View style={styles.linkedInfo}>
                  <Text style={styles.linkedName}>{c.label}</Text>
                  <Text style={styles.linkedLast4}>{c.brand} •••• {c.last4}</Text>
                </View>
                <TouchableOpacity style={styles.unlinkBtn}>
                  <Ionicons name="trash-outline" size={16} color={DS.colors.semantic.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add another card CTA when cards exist */}
          {!loading && linkedCards.length > 0 && (
            <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.push('/add-card' as never)}>
              <Ionicons name="add-circle-outline" size={18} color={DS.colors.brand.primary} />
              <Text style={styles.addMoreText}>Link another card</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  addLink: { fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
  cardWrap: { marginBottom: 8 },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: DS.colors.neutral.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 20, paddingHorizontal: 16, lineHeight: 18 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 24, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  linkedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: DS.colors.neutral.border, gap: 12 },
  linkedIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  linkedInfo: { flex: 1 },
  linkedName: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  linkedLast4: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  unlinkBtn: { padding: 8 },

  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: DS.colors.neutral.border },
  addMoreText: { fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
});
