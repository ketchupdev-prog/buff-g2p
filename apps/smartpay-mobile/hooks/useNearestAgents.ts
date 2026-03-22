import { useQuery } from '@tanstack/react-query';
import {
  getNearestAgentsWithMeta,
  NEAREST_AGENTS_CACHE_TTL_MS,
  type NearestAgentServiceFilter,
} from '@/services/agents';

export function useNearestAgents(opts: {
  latitude: number;
  longitude: number;
  service: NearestAgentServiceFilter;
  enabled?: boolean;
}) {
  const enabled = opts.enabled !== false;

  const query = useQuery({
    queryKey: ['nearestAgents', opts.latitude, opts.longitude, opts.service],
    queryFn: () =>
      getNearestAgentsWithMeta({
        latitude: opts.latitude,
        longitude: opts.longitude,
        service: opts.service,
        limit: 80,
      }),
    enabled:
      enabled && Number.isFinite(opts.latitude) && Number.isFinite(opts.longitude),
    staleTime: NEAREST_AGENTS_CACHE_TTL_MS,
    gcTime: NEAREST_AGENTS_CACHE_TTL_MS * 2,
  });

  return {
    agents: query.data?.agents ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    fromCache: query.data?.fromCache ?? false,
    lastUpdated: query.data?.lastUpdated ?? null,
  };
}

export type { NearestAgentServiceFilter };
