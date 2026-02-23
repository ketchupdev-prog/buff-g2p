/**
 * PayFromSheet – wallet + linked bank card selector bottom sheet.
 * Used in: send-money/amount, add-wallet, loans/apply (future), cash-out hub.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { getWallets, type Wallet } from '@/services/wallets';

export interface PaySource {
  id: string;
  label: string;
  sub?: string;
  balance?: number;
  sourceType: 'wallet' | 'bank';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
}

export function buildPaySources(wallets: Wallet[]): PaySource[] {
  const sources: PaySource[] = wallets.map(w => ({
    id: w.id,
    label: w.name,
    sub: `N$ ${w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`,
    balance: w.balance,
    sourceType: 'wallet',
    icon: w.type === 'grant'
      ? 'gift-outline'
      : w.type === 'savings'
      ? 'wallet-outline'
      : 'card-outline',
    iconColor: w.type === 'grant' ? '#D97706' : w.type === 'savings' ? '#7C3AED' : '#0029D6',
  }));

  wallets.forEach(w =>
    (w.linkedCards ?? []).forEach(c =>
      sources.push({
        id: `bank_${c.id}`,
        label: c.label,
        sub: `**** ${c.last4}`,
        sourceType: 'bank',
        icon: 'business-outline',
        iconColor: '#374151',
      }),
    ),
  );

  return sources;
}

interface PayFromSheetProps {
  visible: boolean;
  selected: PaySource | null;
  onSelect: (source: PaySource) => void;
  onClose: () => void;
}

export function PayFromSheet({ visible, selected, onSelect, onClose }: PayFromSheetProps) {
  const [sources, setSources] = useState<PaySource[]>([]);

  const load = useCallback(async () => {
    const wallets = await getWallets();
    setSources(buildPaySources(wallets));
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Pay From" maxHeight="65%">
      <ScrollView>
        {sources.length === 0 ? (
          <Text style={styles.empty}>No payment methods found.</Text>
        ) : (
          sources.map(src => {
            const isSelected = selected?.id === src.id;
            return (
              <TouchableOpacity
                key={src.id}
                style={styles.row}
                onPress={() => { onSelect(src); onClose(); }}
                activeOpacity={0.8}
              >
                <View style={[styles.iconCircle, { backgroundColor: src.iconColor + '18' }]}>
                  <Ionicons name={src.icon} size={20} color={src.iconColor} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>{src.label}</Text>
                  {src.sub ? <Text style={styles.sub}>{src.sub}</Text> : null}
                </View>
                <View style={[styles.radio, isSelected && styles.radioActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </BottomSheet>
  );
}

/** Compact "Pay From" pill button shown inline in screens */
interface PayFromPillProps {
  source: PaySource | null;
  onPress: () => void;
}
export function PayFromPill({ source, onPress }: PayFromPillProps) {
  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.8}>
      {source ? (
        <Ionicons name={source.icon} size={14} color={source.iconColor} />
      ) : (
        <Ionicons name="wallet-outline" size={14} color="#6B7280" />
      )}
      <Text style={styles.pillText} numberOfLines={1}>
        {source ? source.label : 'Pay From'}
      </Text>
      <Ionicons name="chevron-down" size={12} color="#6B7280" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 32, fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: '#0029D6' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0029D6' },
  // Pill button
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 8,
    maxWidth: 180,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
});
