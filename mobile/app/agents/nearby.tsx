/**
 * Agents Map – Buffr G2P §3.4.
 * Map view of nearby agents, NamPost, ATMs. Uses shared NearbyAgentsContent (real map, no placeholder).
 */
import React from 'react';
import { Stack } from 'expo-router';
import { NearbyAgentsContent } from '@/components/agents/NearbyAgentsContent';

export default function AgentsNearbyScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Map', headerBackButtonDisplayMode: 'minimal' }} />
      <NearbyAgentsContent />
    </>
  );
}
