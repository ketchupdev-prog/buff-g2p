/**
 * Home tab stack – Buffr G2P.
 * Stack for Home + Bills, Agents, Loans, Merchants. Tab bar stays visible.
 */
import { Stack } from 'expo-router';

export default function HomeTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
