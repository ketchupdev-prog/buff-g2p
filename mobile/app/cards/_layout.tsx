import { Stack } from 'expo-router';

export default function CardsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackVisible: true, headerBackTitle: 'Back', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="index" options={{ title: 'Cards' }} />
    </Stack>
  );
}
