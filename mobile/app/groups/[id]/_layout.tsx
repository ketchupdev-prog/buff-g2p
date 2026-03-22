/**
 * Group [id] stack – group detail and nested screens (request, send, settings).
 */
import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function GroupIdLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="send" options={{ headerTitle: 'Send to Group' }} />
      <Stack.Screen name="request" options={{ headerTitle: 'Request from Group' }} />
      <Stack.Screen name="settings" options={{ headerTitle: 'Group Settings' }} />
      <Stack.Screen name="add-members" options={{ headerTitle: 'Add Members' }} />
    </Stack>
  );
}
