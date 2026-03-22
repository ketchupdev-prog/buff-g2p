/**
 * AddMoneyModal – Buffr G2P.
 * Bottom sheet with 3 methods: Bank Transfer, Debit Card, Redeem Voucher.
 * PRD §3.4 screen 26, §3.11. From Home or Wallet Detail.
 * Location: components/modals/AddMoneyModal.tsx
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { designSystem } from '@/constants/designSystem';

const DS = designSystem;

export interface AddMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  /** When from Wallet Detail, pass wallet id for Bank Transfer. From Home, pass first wallet id or null. */
  walletId: string | null;
}

const METHODS = [
  {
    id: 'bank' as const,
    label: 'Bank Transfer',
    description: 'EFT to your Buffr wallet',
    icon: 'business-outline' as const,
    color: '#0029D6',
    bg: '#EFF6FF',
  },
  {
    id: 'card' as const,
    label: 'Debit / Credit Card',
    description: 'Link a card to top up',
    icon: 'card-outline' as const,
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    id: 'voucher' as const,
    label: 'Redeem Voucher',
    description: 'Use a grant or voucher code',
    icon: 'gift-outline' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
];

export function AddMoneyModal({ visible, onClose, walletId }: AddMoneyModalProps) {
  function handleMethod(method: 'bank' | 'card' | 'voucher') {
    onClose();
    if (method === 'bank') {
      if (walletId) {
        router.push(`/wallets/${walletId}/cash-out/bank` as never);
      } else {
        router.push('/wallets' as never);
      }
    } else if (method === 'card') {
      router.push('/add-card' as never);
    } else {
      router.push('/(tabs)/vouchers' as never);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Money" maxHeight="50%">
      <View style={styles.content}>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.methodRow, { backgroundColor: m.bg }]}
            onPress={() => handleMethod(m.id)}
            activeOpacity={0.8}
            accessibilityLabel={m.label}
          >
            <View style={[styles.iconWrap, { backgroundColor: m.bg }]}>
              <Ionicons name={m.icon} size={24} color={m.color} />
            </View>
            <View style={styles.methodText}>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodDesc}>{m.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={DS.colors.neutral.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text, marginBottom: 2 },
  methodDesc: { fontSize: 13, color: DS.colors.neutral.textSecondary },
});
