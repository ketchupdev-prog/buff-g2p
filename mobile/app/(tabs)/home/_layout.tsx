/**
 * Home tab stack – Buffr G2P.
 * Stack for Home + Bills, Agents, Loans, Merchants. Tab bar stays visible.
 * When a screen shows header (e.g. agents/nearby), back uses HeaderBackButton.
 */
import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function HomeTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
        headerBackTitle: 'Back',
        headerTintColor: '#111827',
        headerStyle: { backgroundColor: '#fff' },
        animation: 'slide_from_right',
      }}
    />
  );
}
