/**
 * WalletSelector Component
 * 
 * Purpose: Reusable wallet selection with balance display
 * Location: mobile/components/shared/WalletSelector.tsx
 * 
 * Features:
 * - Display wallets with balance
 * - Show insufficient balance warnings
 * - Highlight selected wallet
 * - Show wallet emoji icons
 * - Bottom sheet for selection
 * 
 * Follows Rule 2: Modular component for easy maintenance
 * Follows Rule 3: Component documentation
 */

import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  emoji?: string;
  color?: string;
}

interface WalletSelectorProps {
  wallets: Wallet[];
  selectedId?: string;
  onSelect: (walletId: string) => void;
  requiredBalance?: number;
  showBalance?: boolean;
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export function WalletSelector({
  wallets,
  selectedId,
  onSelect,
  requiredBalance = 0,
  showBalance = true,
  visible,
  onClose,
  title = 'Select Wallet',
}: WalletSelectorProps) {
  
  const handleSelect = (wallet: Wallet) => {
    if (requiredBalance > 0 && wallet.balance < requiredBalance) {
      // Don't allow selection if insufficient balance
      return;
    }
    onSelect(wallet.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={designSystem.colors.neutral.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {wallets.map((wallet) => {
              const isSelected = wallet.id === selectedId;
              const hasInsufficientBalance = requiredBalance > 0 && wallet.balance < requiredBalance;

              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletRow,
                    isSelected && styles.walletRowSelected,
                    hasInsufficientBalance && styles.walletRowDisabled,
                  ]}
                  onPress={() => handleSelect(wallet)}
                  disabled={hasInsufficientBalance}
                >
                  <View style={[
                    styles.iconWrap,
                    { backgroundColor: wallet.color || designSystem.colors.brand.primary + '20' }
                  ]}>
                    {wallet.emoji ? (
                      <Text style={styles.emoji}>{wallet.emoji}</Text>
                    ) : (
                      <Ionicons name="wallet-outline" size={20} color={designSystem.colors.brand.primary} />
                    )}
                  </View>
                  
                  <View style={styles.walletInfo}>
                    <Text style={[
                      styles.walletName,
                      hasInsufficientBalance && styles.walletNameDisabled
                    ]}>
                      {wallet.name}
                    </Text>
                    {showBalance && (
                      <Text style={[
                        styles.walletBalance,
                        hasInsufficientBalance && styles.walletBalanceInsufficient
                      ]}>
                        N${wallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                        {hasInsufficientBalance && ' (Insufficient balance)'}
                      </Text>
                    )}
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={designSystem.colors.brand.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.colors.neutral.text,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  walletRowSelected: {
    borderColor: DS.colors.brand.primary,
    backgroundColor: DS.colors.brand.primary + '08',
  },
  walletRowDisabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.neutral.text,
    marginBottom: 2,
  },
  walletNameDisabled: {
    color: DS.colors.neutral.textSecondary,
  },
  walletBalance: {
    fontSize: 13,
    color: DS.colors.neutral.textSecondary,
  },
  walletBalanceInsufficient: {
    color: DS.colors.semantic.error,
  },
});
