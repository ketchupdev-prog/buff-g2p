import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useBuffr } from '@buffr/sdk/react-native';

/**
 * Affordability / underwriting-style call: `client.enrichment.affordability(accountId, { loan_amount })`.
 * Response fields depend on deployment; cast or narrow when your API stabilizes.
 */
export default function LoanScreen() {
  const client = useBuffr();
  const [accountId, setAccountId] = useState('');
  const [loanAmount, setLoanAmount] = useState('5000');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!accountId.trim()) {
      Alert.alert('Account ID required', 'Paste an account id from the Accounts screen or your API.');
      return;
    }
    setBusy(true);
    setResult('');
    try {
      const { data } = await client.enrichment.affordability(accountId.trim(), {
        loan_amount: Number(loanAmount) || undefined,
      });
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h}>Loan application — affordability</Text>
      <Text style={styles.sub}>
        Calls GET /api/enrichment/affordability/:accountId. Ensure the user has consented to data use
        per your jurisdiction (e.g. NAMFISA / ETA 2019).
      </Text>

      <Text style={styles.label}>Account ID</Text>
      <TextInput
        style={styles.input}
        value={accountId}
        onChangeText={setAccountId}
        placeholder="uuid or stable account id"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Requested loan amount (optional)</Text>
      <TextInput
        style={styles.input}
        value={loanAmount}
        onChangeText={setLoanAmount}
        keyboardType="decimal-pad"
      />

      <Pressable style={styles.btn} onPress={() => void run()} disabled={busy}>
        <Text style={styles.btnText}>{busy ? 'Running…' : 'Run affordability check'}</Text>
      </Pressable>

      <Text style={styles.pre}>{result || '—'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  h: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13, opacity: 0.8 },
  label: { marginTop: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  btn: {
    marginTop: 12,
    backgroundColor: '#059669',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  pre: { marginTop: 16, fontFamily: 'monospace', fontSize: 12 },
});
