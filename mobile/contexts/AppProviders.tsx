import React, { useEffect } from 'react';
import { UserProvider } from './UserContext';
import { GamificationProvider } from './GamificationContext';
import { OAuthProvider } from './OAuthContext';
import { seedDemoDataIfNeeded } from '@/services/seedData';

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDemoDataIfNeeded();
  }, []);

  return (
    <UserProvider>
      <OAuthProvider>
        <GamificationProvider>
          {children}
        </GamificationProvider>
      </OAuthProvider>
    </UserProvider>
  );
}
