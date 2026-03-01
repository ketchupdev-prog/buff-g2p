/**
 * Group [id] stack – group detail and nested screens (request, send, settings).
 */
import { Stack } from 'expo-router';

export default function GroupIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back', headerTintColor: '#111827', headerStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="send" options={{ headerShown: true, headerTitle: 'Send to Group' }} />
      <Stack.Screen name="request" options={{ headerShown: true, headerTitle: 'Request from Group' }} />
      <Stack.Screen name="settings" options={{ headerShown: true, headerTitle: 'Group Settings' }} />
      <Stack.Screen name="add-members" options={{ headerShown: true, headerTitle: 'Add Members' }} />
    </Stack>
  );
}
