/**
 * NetworkContext – Buffr G2P.
 * Subscribes to NetInfo when native module is available; otherwise assumes online. S5: offline awareness.
 * Location: contexts/NetworkContext.tsx
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setNetworkState, isOnline } from '@/services/network';
import { getNetInfo } from '@/lib/netinfoSafe';

type NetworkContextValue = { isOnline: boolean };

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  return ctx;
}

function useNetInfoSubscription(): boolean {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const NetInfo = getNetInfo();
    if (!NetInfo) {
      setNetworkState(true);
      setOnline(true);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = NetInfo.addEventListener((state) => {
        const connected = state.isConnected === true && state.isInternetReachable !== false;
        setNetworkState(connected);
        setOnline(connected);
      });
    } catch {
      setNetworkState(true);
      setOnline(true);
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return online;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const online = useNetInfoSubscription();

  return (
    <NetworkContext.Provider value={{ isOnline: online }}>
      {children}
    </NetworkContext.Provider>
  );
}
