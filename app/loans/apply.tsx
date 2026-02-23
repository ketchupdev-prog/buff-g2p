import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function LoansApplyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Apply for Loan', headerBackTitle: '' }} />
      <Text style={styles.text}>Loan Application – coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  text: { fontSize: 16, color: '#6B7280' },
});
