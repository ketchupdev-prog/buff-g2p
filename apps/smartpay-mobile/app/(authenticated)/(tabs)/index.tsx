/**
 * Home tab – Smartpay dashboard (authenticated).
 * Buffr-g2p style: balance/card area, wallet carousel, services grid, recent contacts.
 * Respects docs/UX_APP_STATE_BEFORE_AFTER_LINKING.md (before/after linking).
 * Location: fintech/smartpay/app/(authenticated)/(tabs)/index.tsx
 */
import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';
import { WalletCarousel, RecentContactsCarousel, ServicesGrid, BalanceCard } from '@/components/home';
import { useWallets } from '@/contexts/WalletsContext';
import { useUser } from '@/contexts/UserContext';

const ds = designSystem;

export default function HomeScreen() {
  const router = useRouter();
  const { smartpayId, profile } = useUser();
  const { wallets, primaryWallet, totalBalance, error, refresh } = useWallets();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshTrigger((t) => t + 1);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const onNavigate = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  const onWalletPress = useCallback(
    (wallet: { id: string }) => {
      router.push(`/(authenticated)/wallets/${wallet.id}` as any);
    },
    [router]
  );

  const onAddWallet = useCallback(() => {
    router.push('/(authenticated)/wallets/add' as any);
  }, [router]);

  const walletName = primaryWallet?.name ?? wallets[0]?.name ?? 'Main wallet';
  const ownerName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || undefined;
  const helperText = undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.colors.brand.primary} />
        }
      >
        {/* Main wallet balance card (G2P Home: BalanceCard) */}
        <BalanceCard
          balance={totalBalance}
          balanceVisible={balanceVisible}
          onToggleVisibility={() => setBalanceVisible((v) => !v)}
          walletName={walletName}
          ownerName={ownerName}
          smartpayId={smartpayId}
          helperText={helperText}
          onOpenQr={() => router.push('/(authenticated)/receive/qr')}
        />

        {/* Wallet carousel – surfaced above services so wallet context is visible first */}
        <WalletCarousel
          wallets={wallets}
          refreshTrigger={refreshTrigger}
          onWalletPress={onWalletPress}
          onAddWallet={onAddWallet}
        />

        {/* Services grid: Proof of life, Receive, Wallets, Vouchers, Bills, Loans, Groups, Find Agent */}
        <ServicesGrid onNavigate={onNavigate} />

        {/* Recent contacts */}
        <RecentContactsCarousel onSendPress={() => router.push('/send-money')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.colors.neutral.background },
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: ds.spacing.smartpay.horizontalPadding,
    paddingTop: ds.spacing.md,
    paddingBottom: ds.spacing.xxl,
  },
});
