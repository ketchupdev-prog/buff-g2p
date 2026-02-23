import React, { useEffect } from 'react';
import { UserProvider } from './UserContext';
import { GamificationProvider } from './GamificationContext';
import { seedDemoDataIfNeeded } from '@/services/seedData';

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDemoDataIfNeeded();
  }, []);

  return (
    <UserProvider>
      <GamificationProvider>
        {children}
      </GamificationProvider>
    </UserProvider>
  );
}
