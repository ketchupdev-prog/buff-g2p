import { Stack } from 'expo-router';

export default function GroupSendLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="index" options={{ title: 'Send to group' }} />
      <Stack.Screen name="success" options={{ title: 'Sent', headerBackVisible: false }} />
    </Stack>
  );
}
