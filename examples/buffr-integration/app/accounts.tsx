import { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useAccounts, useTransactions } from '@buffr/sdk/react-native';

/**
 * Demonstrates `useAccounts` + `useTransactions` hooks from `@buffr/sdk/react-native`.
 * Data shape follows your Buffr deployment's `/api/accounts` and `/api/accounts/:id/transactions` payloads.
 */
export default function AccountsScreen() {
  const { accounts, loading: loadingAccounts, error: accErr, refresh: refreshAcc } = useAccounts({
    status: 'active',
    per_page: 50,
  });

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { transactions, loading: loadingTx, error: txErr, refresh: refreshTx } = useTransactions(
    selectedId,
    { per_page: 30 }
  );

  return (
    <View style={styles.container}>
      <Text style={styles.h}>Accounts</Text>
      {accErr ? <Text style={styles.err}>{accErr.message}</Text> : null}

      <FlatList
        data={accounts ?? []}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={loadingAccounts} onRefresh={refreshAcc} />}
        renderItem={({ item }) => {
          const row = item as Record<string, unknown>;
          const id = String(row.id ?? row.account_id ?? '');
          const label = String(row.account_name ?? row.account_number ?? id);
          const active = selectedId === id;
          return (
            <Pressable
              style={[styles.row, active && styles.rowActive]}
              onPress={() => setSelectedId(id)}
            >
              <Text style={styles.rowText}>{label}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loadingAccounts ? <Text>Loading…</Text> : <Text>No accounts — complete OAuth first.</Text>
        }
      />

      <Text style={styles.h}>Transactions {selectedId ? `(${selectedId})` : ''}</Text>
      {txErr ? <Text style={styles.err}>{txErr.message}</Text> : null}
      <FlatList
        data={transactions ?? []}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={loadingTx} onRefresh={refreshTx} />}
        renderItem={({ item }) => {
          const row = item as Record<string, unknown>;
          return (
            <Text style={styles.tx}>
              {String(row.booking_date ?? row.date ?? '')} — {String(row.description ?? row.merchant_name ?? '')}{' '}
              ({String(row.amount ?? '')})
            </Text>
          );
        }}
        ListEmptyComponent={
          selectedId ? (
            loadingTx ? (
              <Text>Loading…</Text>
            ) : (
              <Text>No transactions (check consent / sandbox data).</Text>
            )
          ) : (
            <Text>Select an account above.</Text>
          )
        }
      />

      <Text style={[styles.smallBtn, styles.smallBtnText]}>
        After OAuth, complete a consent in Buffr Connect, then call `client.accounts.sync(consent_id)` with
        the id from your consent completion flow.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h: { fontSize: 18, fontWeight: '700', marginVertical: 8 },
  err: { color: '#b91c1c' },
  row: { padding: 12, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  rowActive: { backgroundColor: '#dbeafe' },
  rowText: { fontSize: 16 },
  tx: { fontSize: 13, paddingVertical: 4 },
  smallBtn: { padding: 8 },
  smallBtnText: { fontSize: 11, opacity: 0.7 },
});
