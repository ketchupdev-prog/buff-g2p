import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Link } from 'expo-router';
import { startAuthorizationCodeFlow } from '@/lib/oauthFlow';
import { clearAccessToken } from '@/lib/tokenStore';

/**
 * Home: start OAuth, navigate to AIS screens, or sign out.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buffr integration demo</Text>
      <Text style={styles.sub}>
        PKCE OAuth → linked accounts → transactions → loan affordability (enrichment API).
      </Text>

      <Pressable
        style={styles.btn}
        onPress={() =>
          startAuthorizationCodeFlow().catch((e) =>
            Alert.alert('OAuth error', e instanceof Error ? e.message : String(e))
          )
        }
      >
        <Text style={styles.btnText}>1. Connect bank (OAuth)</Text>
      </Pressable>

      <Link href="/accounts" asChild>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>2. Accounts & transactions</Text>
        </Pressable>
      </Link>

      <Link href="/loan" asChild>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>3. Loan affordability check</Text>
        </Pressable>
      </Link>

      <Pressable
        style={[styles.btn, styles.danger]}
        onPress={() => clearAccessToken().then(() => Alert.alert('Signed out', 'Token cleared from SecureStore'))}
      >
        <Text style={styles.btnText}>Sign out (clear token)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 14, opacity: 0.8, marginBottom: 12 },
  btn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  danger: { backgroundColor: '#64748b' },
  btnText: { color: '#fff', fontWeight: '600' },
});
