/**
 * AI tab layout – Buffr G2P.
 * Single stack for the Buffr AI Companion chat screen.
 */
import { Stack } from 'expo-router';

export default function AiTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
