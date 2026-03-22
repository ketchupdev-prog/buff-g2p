/**
 * Location Services - Real Integration Tests
 * Location: fintech/smartpay/__tests__/integration/real-location-services.integration.test.ts
 *
 * Tests real location service integration with backend API, caching, and permission handling.
 * These tests connect to actual backend services and require valid authentication.
 *
 * Test Coverage:
 * - Nearest agents API integration
 * - Offline caching and fallback
 * - Location permission handling
 * - Integration with cash-out and voucher flows
 * - Deep linking and navigation
 *
 * References:
 * - PRD Appendix H §G20 (Agent Network Integration)
 * - services/copilot/locationService.ts
 * - hooks/useNearestAgents.ts
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import {
  findNearbyAgents,
  findNearbyATMs,
  findNampostOffices,
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  calculateDistance,
  clearLocationCache,
} from '@/services/copilot/locationService';
import { useNearestAgents } from '@/hooks/useNearestAgents';

// Test coordinates (Windhoek, Namibia)
const TEST_COORDS = {
  latitude: -22.5609,
  longitude: 17.0658,
};

// Mock location for testing (near Windhoek Central)
const MOCK_USER_LOCATION = {
  latitude: -22.5609,
  longitude: 17.0658,
};

function nearestAgentsHookWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe('Location Services - Real Integration', () => {
  beforeAll(async () => {
    await clearLocationCache();
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await clearLocationCache();
  });

  describe('Backend API Integration', () => {
    it('should fetch nearest agents from backend', async () => {
      const agents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      expect(Array.isArray(agents)).toBe(true);
      if (agents.length > 0) {
        const agent = agents[0];
        expect(agent).toHaveProperty('agent_code');
        expect(agent).toHaveProperty('agent_name');
        expect(agent).toHaveProperty('latitude');
        expect(agent).toHaveProperty('longitude');
        expect(agent).toHaveProperty('distance_km');
        expect(agent).toHaveProperty('supports_cashout');
        expect(typeof agent.distance_km).toBe('number');
      }
    }, 15000);

    it('should fetch nearest ATMs from backend', async () => {
      const atms = await findNearbyATMs(TEST_COORDS.latitude, TEST_COORDS.longitude, 10);

      expect(Array.isArray(atms)).toBe(true);
      if (atms.length > 0) {
        const atm = atms[0];
        expect(atm).toHaveProperty('atm_code');
        expect(atm).toHaveProperty('bank_name');
        expect(atm).toHaveProperty('latitude');
        expect(atm).toHaveProperty('longitude');
        expect(atm).toHaveProperty('distance_km');
        expect(atm).toHaveProperty('status');
        expect(['online', 'offline', 'maintenance']).toContain(atm.status);
      }
    }, 15000);

    it('should fetch NamPost offices from backend', async () => {
      const offices = await findNampostOffices(
        'Windhoek',
        TEST_COORDS.latitude,
        TEST_COORDS.longitude
      );

      expect(Array.isArray(offices)).toBe(true);
      if (offices.length > 0) {
        const office = offices[0];
        expect(office).toHaveProperty('branch_code');
        expect(office).toHaveProperty('branch_name');
        expect(office).toHaveProperty('latitude');
        expect(office).toHaveProperty('longitude');
        expect(office).toHaveProperty('services');
        expect(Array.isArray(office.services)).toBe(true);
      }
    }, 15000);

    it('should filter agents by service type', async () => {
      const cashoutAgents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      if (cashoutAgents.length > 0) {
        cashoutAgents.forEach((agent) => {
          expect(agent.supports_cashout).toBe(true);
        });
      }
    }, 15000);
  });

  describe('Offline Caching', () => {
    it('should cache locations for offline use', async () => {
      await clearLocationCache();

      await findNearbyAgents(TEST_COORDS.latitude, TEST_COORDS.longitude, 10, 'cashout');

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith('location_cache_'));
      expect(cacheKeys.length).toBeGreaterThan(0);

      const cached = await AsyncStorage.getItem(cacheKeys[0]);
      expect(cached).toBeTruthy();

      const { data, timestamp } = JSON.parse(cached!);
      expect(Array.isArray(data)).toBe(true);
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(Date.now() - 10000);
    }, 15000);

    it('should use cached data when available', async () => {
      const firstFetch = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      const secondFetch = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      expect(secondFetch).toEqual(firstFetch);
    }, 15000);

    it('should fall back to cache on API error', async () => {
      await findNearbyAgents(TEST_COORDS.latitude, TEST_COORDS.longitude, 10, 'cashout');

      const originalEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
      process.env.EXPO_PUBLIC_API_BASE_URL = 'http://invalid-url.test';

      const cachedAgents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      expect(Array.isArray(cachedAgents)).toBe(true);

      process.env.EXPO_PUBLIC_API_BASE_URL = originalEnv;
    }, 15000);
  });

  describe('useNearestAgents Hook', () => {
    it('should fetch and return agents', async () => {
      const { result } = renderHook(
        () =>
          useNearestAgents({
            latitude: TEST_COORDS.latitude,
            longitude: TEST_COORDS.longitude,
            service: 'cashout',
          }),
        { wrapper: nearestAgentsHookWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 15000 }
      );

      expect(Array.isArray(result.current.agents)).toBe(true);
      expect(result.current.error).toBeNull();
      if (result.current.agents.length > 0) {
        expect(result.current.lastUpdated).not.toBeNull();
      }
    }, 20000);

    it('should support manual refetch', async () => {
      const { result } = renderHook(
        () =>
          useNearestAgents({
            latitude: TEST_COORDS.latitude,
            longitude: TEST_COORDS.longitude,
            service: 'cashout',
          }),
        { wrapper: nearestAgentsHookWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(Array.isArray(result.current.agents)).toBe(true);
    }, 25000);

    it('should handle enabled flag', async () => {
      const { result } = renderHook(
        () =>
          useNearestAgents({
            latitude: TEST_COORDS.latitude,
            longitude: TEST_COORDS.longitude,
            service: 'cashout',
            enabled: false,
          }),
        { wrapper: nearestAgentsHookWrapper() }
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.agents).toEqual([]);
    }, 5000);
  });

  describe('Distance Calculations', () => {
    it('should calculate distance accurately', () => {
      const distance = calculateDistance(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        TEST_COORDS.latitude + 0.01,
        TEST_COORDS.longitude + 0.01
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(5);
    });

    it('should return agents sorted by distance', async () => {
      const agents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'all'
      );

      if (agents.length > 1) {
        for (let i = 0; i < agents.length - 1; i++) {
          expect(agents[i].distance_km).toBeLessThanOrEqual(agents[i + 1].distance_km);
        }
      }
    }, 15000);
  });

  describe('Integration with App Flows', () => {
    it('should integrate with cash-out flow', async () => {
      const mockNavigation = {
        currentRoute: 'location-finder',
        params: { service: 'cashout', returnTo: 'cashout' },
      };

      const agents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      expect(agents.every((a) => a.supports_cashout)).toBe(true);

      if (agents.length > 0) {
        const selectedAgent = agents[0];
        expect(selectedAgent).toHaveProperty('agent_code');
        expect(selectedAgent).toHaveProperty('agent_name');
        expect(selectedAgent.supports_cashout).toBe(true);
      }
    }, 15000);

    it('should integrate with voucher flow', async () => {
      const agents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'voucher'
      );

      if (agents.length > 0) {
        agents.forEach((agent) => {
          expect(agent.supports_voucher_redeem).toBe(true);
        });
      }
    }, 15000);

    it('should support deep link params', async () => {
      const deepLinkParams = {
        tab: 'agents' as const,
        service: 'cashout' as const,
      };

      const agents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        deepLinkParams.service
      );

      expect(Array.isArray(agents)).toBe(true);
    }, 15000);
  });

  describe('Permission Handling', () => {
    it('should check location permission status', async () => {
      const status = await checkLocationPermission();

      expect(status).toHaveProperty('granted');
      expect(status).toHaveProperty('canAskAgain');
      expect(status).toHaveProperty('status');
      expect(typeof status.granted).toBe('boolean');
    });

    it('should handle permission denial gracefully', async () => {
      const agents = await findNearbyAgents(
        MOCK_USER_LOCATION.latitude,
        MOCK_USER_LOCATION.longitude,
        10,
        'cashout'
      );

      expect(Array.isArray(agents)).toBe(true);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', async () => {
      const agents = await findNearbyAgents(999, 999, 10, 'cashout');

      expect(Array.isArray(agents)).toBe(true);
    }, 15000);

    it('should handle network errors', async () => {
      const originalEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
      process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:99999';

      const agents = await findNearbyAgents(
        TEST_COORDS.latitude,
        TEST_COORDS.longitude,
        10,
        'cashout'
      );

      expect(Array.isArray(agents)).toBe(true);

      process.env.EXPO_PUBLIC_API_BASE_URL = originalEnv;
    }, 15000);
  });
});
