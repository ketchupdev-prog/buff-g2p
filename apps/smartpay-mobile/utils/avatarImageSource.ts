/**
 * Resolves profile avatarUrl strings to a React Native Image source (bundled asset, absolute URL, or API-relative path).
 * Location: fintech/apps/smartpay-mobile/utils/avatarImageSource.ts
 */
import type { ImageSourcePropType } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export function getAvatarImageSource(
  avatarUrl: string | undefined | null
): ImageSourcePropType | null {
  if (!avatarUrl) return null;
  if (avatarUrl === '/avatars/pendo-avatar.png') {
    return require('@/assets/images/pendo-avatar.png');
  }
  const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE}${avatarUrl}`;
  return { uri };
}
