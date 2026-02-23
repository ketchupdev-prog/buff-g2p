import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function GroupDetailScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Group', headerBackTitle: '' }} />
      <Text style={styles.text}>Group details – coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  text: { fontSize: 16, color: '#6B7280' },
});
