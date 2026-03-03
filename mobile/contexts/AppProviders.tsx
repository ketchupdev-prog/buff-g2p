import React from 'react';
import { UserProvider } from './UserContext';
import { GamificationProvider } from './GamificationContext';
import { OAuthProvider } from './OAuthContext';
import { NetworkProvider } from './NetworkContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <OAuthProvider>
        <NetworkProvider>
          <GamificationProvider>
            {children}
          </GamificationProvider>
        </NetworkProvider>
      </OAuthProvider>
    </UserProvider>
  );
}
