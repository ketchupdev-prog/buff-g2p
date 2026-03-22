/**
 * Nearby Buffr Agents – Buffr G2P §3.4.
 * Embedded map view + list of Buffr Agents, NamPost branches, and ATMs.
 */
import React from 'react';
import { Stack } from 'expo-router';
import { NearbyAgentsContent } from '@/components/agents/NearbyAgentsContent';

export default function AgentsNearbyScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Buffr Agents & ATMs', headerBackTitle: '' }} />
      <NearbyAgentsContent />
    </>
  );
}
