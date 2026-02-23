import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function CashOutBankScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Bank Transfer', headerBackTitle: '' }} />
      <Text style={styles.text}>Bank transfer cash-out – coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  text: { fontSize: 16, color: '#6B7280' },
});
