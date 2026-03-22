/**
 * Profile AI chat – redirect to AI tab.
 * All AI chat uses the Buffr AI Companion at (tabs)/ai; no call to /api/v1/mobile/ai-chat.
 * Location: mobile/app/(tabs)/profile/ai-chat.tsx
 */
import { Redirect } from 'expo-router';

export default function ProfileAiChatRedirect() {
  return <Redirect href="/(tabs)/ai" />;
}
