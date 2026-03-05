/**
 * usePullToRefresh Hook
 * 
 * Purpose: Standardized pull-to-refresh functionality for all list screens
 * Location: mobile/hooks/usePullToRefresh.ts
 * 
 * Features:
 * - Consistent refresh behavior
 * - Loading state management
 * - Error handling
 * - Debouncing to prevent multiple refreshes
 * 
 * Sprint 4: Polish & Enhancements
 * Follows Rule 13: TypeScript with proper types
 */

import { useState, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  debounceMs?: number;
}

interface UsePullToRefreshReturn {
  refreshing: boolean;
  onRefresh: () => void;
}

export function usePullToRefresh({
  onRefresh,
  debounceMs = 300,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshTime = useRef<number>(0);

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    
    // Debounce: prevent multiple refreshes within debounceMs
    if (now - lastRefreshTime.current < debounceMs) {
      return;
    }

    lastRefreshTime.current = now;
    setRefreshing(true);

    try {
      await onRefresh();
    } catch (error) {
      console.error('Pull-to-refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, debounceMs]);

  return {
    refreshing,
    onRefresh: handleRefresh,
  };
}

/**
 * Usage Example:
 * 
 * const { refreshing, onRefresh } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await loadTransactions();
 *     await loadWallets();
 *   },
 * });
 * 
 * <ScrollView
 *   refreshControl={
 *     <RefreshControl
 *       refreshing={refreshing}
 *       onRefresh={onRefresh}
 *       tintColor={designSystem.colors.brand.primary}
 *     />
 *   }
 * >
 *   {content}
 * </ScrollView>
 */
