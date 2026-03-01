/**
 * Bills – root redirect.
 * Canonical implementation lives at app/(tabs)/home/bills.tsx.
 */
import { Redirect } from 'expo-router';

export default function BillsRedirect() {
  return <Redirect href="/(tabs)/home/bills" />;
}
