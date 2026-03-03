/**
 * Groups stack layout – Buffr G2P.
 * Routes: index (list), create, [id] (detail), [id]/request.
 * §3.6 groups flow; design ref: docs/BUFFR_APP_DESIGN_REFERENCE.md.
 */
import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function GroupsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Groups' }} />
      <Stack.Screen name="create" options={{ title: 'Create Group' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
