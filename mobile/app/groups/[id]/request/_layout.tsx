/**
 * Request stack – form and success. §3.6 screen 47c-iii / 47c-iv.
 */
import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function RequestLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
        headerBackTitle: 'Back',
        headerTintColor: '#111827',
        headerStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Request from Group' }} />
      <Stack.Screen name="success" options={{ title: 'Request Sent', headerBackVisible: false }} />
    </Stack>
  );
}
