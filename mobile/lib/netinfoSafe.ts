/**
 * Safe NetInfo loader – Buffr G2P.
 * Returns NetInfo when the native module is linked, null otherwise (Expo Go / prebuild not run).
 * Location: lib/netinfoSafe.ts
 */
type NetInfoType = {
  addEventListener: (listener: (state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) => void) => () => void;
};

let cached: NetInfoType | null = null;

try {
  cached = require('@react-native-community/netinfo').default;
} catch {
  cached = null;
}

export function getNetInfo(): NetInfoType | null {
  return cached;
}
