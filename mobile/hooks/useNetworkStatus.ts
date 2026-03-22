/**
 * useNetworkStatus Hook
 *
 * Purpose: Monitor network connectivity status. Uses safe NetInfo loader so the app
 * runs in Expo Go when the native module is not linked (RNCNetInfo null).
 * Location: mobile/hooks/useNetworkStatus.ts
 *
 * Features:
 * - Real-time network status when native NetInfo is available
 * - When NetInfo is unavailable (Expo Go): assumes online, no crash
 * - Connection type detection when available
 * - Optional callback on status change
 *
 * Sprint 4: Polish & Enhancements. Follows Rule 13: TypeScript with proper types.
 */

import { useEffect, useState } from 'react';
import { getNetInfo } from '@/lib/netinfoSafe';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export function useNetworkStatus(
  onStatusChange?: (status: NetworkStatus) => void
): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    const NetInfo = getNetInfo();
    if (!NetInfo) {
      setStatus({
        isConnected: true,
        isInternetReachable: null,
        type: null,
      });
      onStatusChange?.({
        isConnected: true,
        isInternetReachable: null,
        type: null,
      });
      return;
    }

    const unsubscribe = NetInfo.addEventListener((state: {
      isConnected?: boolean | null;
      isInternetReachable?: boolean | null;
      type?: string | null;
    }) => {
      const newStatus: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type ?? null,
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, [onStatusChange]);

  return status;
}

/**
 * Usage Example:
 *
 * function MyScreen() {
 *   const { isConnected, isInternetReachable } = useNetworkStatus((status) => {
 *     if (!status.isConnected) {
 *       console.log('Connection lost');
 *     }
 *   });
 *
 *   return (
 *     <View>
 *       {!isConnected && <OfflineBanner />}
 *       {content}
 *     </View>
 *   );
 * }
 */
