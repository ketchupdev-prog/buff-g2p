import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/layout';

export default function ProfileTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackVisible: false,
        headerLeft: () => <HeaderBackButton />,
        headerBackTitle: 'Back',
        headerTintColor: '#111827',
        headerStyle: { backgroundColor: '#fff' },
      }}
    />
  );
}
