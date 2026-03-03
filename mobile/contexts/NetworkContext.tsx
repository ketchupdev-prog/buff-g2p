/**
 * NetworkContext – Buffr G2P.
 * Subscribes to NetInfo and keeps services/network isOnline() in sync. S5: offline awareness.
 * Location: contexts/NetworkContext.tsx
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { setNetworkState, isOnline } from '@/services/network';

type NetworkContextValue = { isOnline: boolean };

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  return ctx;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      setNetworkState(connected);
      setOnline(connected);
    });
    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline: online }}>
      {children}
    </NetworkContext.Provider>
  );
}
