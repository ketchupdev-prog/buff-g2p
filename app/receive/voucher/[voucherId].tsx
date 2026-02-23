import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

export default function ReceiveVoucherScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: true, title: 'Receive Voucher', headerBackTitleVisible: false, headerTintColor: '#1E293B', headerStyle: { backgroundColor: '#fff' }, headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#020617' } }} />
      <View style={styles.center}>
        <Ionicons name="gift-outline" size={48} color="#CBD5E1" />
        <Text style={styles.title}>Receive Voucher</Text>
        <Text style={styles.sub}>This screen is under development</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  sub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  btn: { height: 48, borderRadius: 9999, paddingHorizontal: 24, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
