import React from 'react';
import { UserProvider } from './UserContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}
