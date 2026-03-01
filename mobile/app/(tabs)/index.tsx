/**
 * Tabs index – redirect to home tab so "/(tabs)" always lands on home.
 * Fixes "This screen doesn't exist" when navigating to "/(tabs)".
 */
import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/(tabs)/home" />;
}
