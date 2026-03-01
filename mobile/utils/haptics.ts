/**
 * Haptic feedback utility – Buffr G2P.
 * Gracefully no-ops if expo-haptics is not installed.
 * To enable: npx expo install expo-haptics
 */

let _haptics: typeof import('expo-haptics') | null | false = null;

async function loadHaptics() {
  if (_haptics !== null) return _haptics || null;
  try {
    _haptics = await import('expo-haptics');
    return _haptics;
  } catch {
    _haptics = false;
    return null;
  }
}

export async function hapticSuccess(): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try {
    await h.notificationAsync(h.NotificationFeedbackType.Success);
  } catch {}
}

export async function hapticImpact(
  style: 'light' | 'medium' | 'heavy' = 'medium',
): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try {
    const map = {
      light: h.ImpactFeedbackStyle.Light,
      medium: h.ImpactFeedbackStyle.Medium,
      heavy: h.ImpactFeedbackStyle.Heavy,
    };
    await h.impactAsync(map[style]);
  } catch {}
}

export async function hapticSelection(): Promise<void> {
  const h = await loadHaptics();
  if (!h) return;
  try {
    await h.selectionAsync();
  } catch {}
}
