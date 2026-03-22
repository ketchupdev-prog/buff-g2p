/**
 * Wallet History - Filtered transaction view
 * 
 * Figma Spec: Wallet History (Added).svg, Wallet History (Spendings).svg
 * Features:
 * - Two tabs: "Added" (incoming/deposits) and "Spendings" (outgoing/payments)
 * - Filtered transaction lists based on active tab
 * - Empty states for each tab
 * - Navigate to transaction details
 * - API: GET /api/v1/mobile/transactions?walletId=:id&type=credit|debit
 * 
 * Location: app/(authenticated)/wallets/[id]/history.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/layout/AppHeader';
import { designSystem as DS } from '@/constants/designSystem';
import { getWalletById, type Wallet } from '@/services/wallets';
import { getTransactions, type Transaction } from '@/services/transactions';

type TabType = 'added' | 'spendings';

export default function WalletHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('added');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletData, allTransactions] = await Promise.all([
        getWalletById(id),
        getTransactions(),
      ]);

      setWallet(walletData);

      // Filter transactions for this wallet
      const walletTransactions = allTransactions.filter(
        (t) => (t as any).walletId === id
      );
      setTransactions(walletTransactions);
    } catch (error) {
      console.error('Failed to load wallet history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === 'added') {
      return t.type === 'credit';
    } else {
      return t.type === 'debit';
    }
  });

  const handleTransactionPress = (transactionId: string) => {
    router.push(`/transactions/${transactionId}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <AppHeader
          title="History"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DS.colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader
        title={wallet?.name ? `${wallet.name} History` : 'History'}
        showBackButton
        onBackPress={() => router.back()}
      />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'added' && styles.tabActive]}
          onPress={() => setActiveTab('added')}
          activeOpacity={0.7}
          accessibilityLabel="Added transactions tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'added' }}
        >
          <Ionicons
            name="arrow-down"
            size={18}
            color={activeTab === 'added' ? DS.colors.brand.primary : DS.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'added' && styles.tabTextActive,
            ]}
          >
            Added
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'spendings' && styles.tabActive]}
          onPress={() => setActiveTab('spendings')}
          activeOpacity={0.7}
          accessibilityLabel="Spendings transactions tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'spendings' }}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={activeTab === 'spendings' ? DS.colors.brand.primary : DS.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'spendings' && styles.tabTextActive,
            ]}
          >
            Spendings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[
              styles.emptyIconCircle,
              { backgroundColor: activeTab === 'added' 
                ? DS.colors.semantic.successLight 
                : DS.colors.semantic.errorLight 
              }
            ]}>
              <Ionicons
                name={activeTab === 'added' ? 'arrow-down' : 'arrow-up'}
                size={48}
                color={activeTab === 'added' ? DS.colors.success : DS.colors.error}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'added' ? 'No Money Added Yet' : 'No Spending Yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'added'
                ? 'When you add money to this wallet, it will appear here'
                : 'When you spend from this wallet, it will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredTransactions.map((transaction) => (
              <TransactionListItem
                key={transaction.id}
                transaction={transaction}
                onPress={() => handleTransactionPress(transaction.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface TransactionListItemProps {
  transaction: Transaction;
  onPress: () => void;
}

function TransactionListItem({ transaction, onPress }: TransactionListItemProps) {
  const isDebit = transaction.type === 'debit';
  const amount = isDebit ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

  return (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${transaction.description}, amount ${amount < 0 ? 'minus' : 'plus'} N$${Math.abs(amount).toFixed(2)}`}
      accessibilityRole="button"
    >
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: isDebit
                ? DS.colors.semantic.errorLight
                : DS.colors.semantic.successLight,
            },
          ]}
        >
          <Ionicons
            name={isDebit ? 'arrow-up' : 'arrow-down'}
            size={20}
            color={isDebit ? DS.colors.error : DS.colors.success}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.transactionDate}>
            {transaction.createdAt
              ? new Date(transaction.createdAt).toLocaleDateString('en-NA', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A'}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: isDebit ? DS.colors.error : DS.colors.success },
        ]}
      >
        {amount < 0 ? '-' : '+'}N${Math.abs(amount).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: DS.spacing.md,
    paddingTop: DS.spacing.sm,
    paddingBottom: DS.spacing.xs,
    backgroundColor: DS.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.spacing.xs,
    paddingVertical: DS.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: DS.colors.brand.primary,
  },
  tabText: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.medium,
    color: DS.colors.textSecondary,
  },
  tabTextActive: {
    color: DS.colors.brand.primary,
    fontWeight: DS.typography.fontWeight.semibold,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: DS.spacing.md,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing['2xl'],
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: DS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
  },
  emptyTitle: {
    fontSize: DS.typography.fontSize.xl,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    lineHeight: DS.typography.lineHeight.relaxed * DS.typography.fontSize.base,
  },

  // Transactions List
  transactionsList: {
    paddingHorizontal: DS.spacing.md,
    gap: 1,
    backgroundColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
    marginHorizontal: DS.spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DS.spacing.md,
    backgroundColor: DS.colors.background,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: DS.spacing.md,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    gap: 2,
  },
  transactionDescription: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.medium,
    color: DS.colors.text,
  },
  transactionDate: {
    fontSize: DS.typography.fontSize.xs,
    color: DS.colors.textSecondary,
  },
  transactionAmount: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.bold,
    marginLeft: DS.spacing.sm,
  },
});
