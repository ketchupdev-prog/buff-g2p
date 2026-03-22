import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function CashOutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
        headerBackTitle: 'Back',
        headerTintColor: '#111827',
        headerStyle: { backgroundColor: '#fff' },
      }}
    />
  );
}
