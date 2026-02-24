/**
 * Request stack – form and success. §3.6 screen 47c-iii / 47c-iv.
 */
import { Stack } from 'expo-router';

export default function RequestLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back', headerTintColor: '#111827', headerStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" options={{ title: 'Request from Group' }} />
      <Stack.Screen name="success" options={{ title: 'Request Sent', headerBackVisible: false }} />
    </Stack>
  );
}
