import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function AddCardLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackVisible: false, headerLeft: () => <HeaderBackButton />, headerBackTitle: 'Back', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="index" options={{ title: 'Add card' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan card' }} />
      <Stack.Screen name="details" options={{ title: 'Card details' }} />
      <Stack.Screen name="success" options={{ title: 'Card added', headerBackVisible: false }} />
    </Stack>
  );
}
