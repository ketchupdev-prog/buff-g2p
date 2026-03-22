/**
 * Agents Service - SmartPay Mobile
 * Nearest agents with JWT (via api client), 24h AsyncStorage cache, retries, offline fallback.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { api, NetworkError } from './api';
import type { AgentLocation } from './copilot/locationService';

export interface Agent {
  id: string;
  code: string;
  name: string;
  type: 'agent' | 'merchant' | 'till';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    region?: string;
  };
  services: string[];
  operatingHours?: {
    open: string;
    close: string;
  };
  rating?: number;
  distance?: number;
  phone?: string;
  status: 'active' | 'inactive';
}

export type NearestAgentServiceFilter = 'cashout' | 'voucher' | 'ewallet' | 'namqr' | 'all';

const CACHE_PREFIX = 'smartpay_nearest_agents_v1_';
/** Disk cache + suggested React Query stale time for nearest agents */
export const NEAREST_AGENTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

interface AgentsCachePayload {
  v: 1;
  agents: AgentLocation[];
  savedAt: number;
}

export interface NearestAgentsMetaResult {
  agents: AgentLocation[];
  fromCache: boolean;
  lastUpdated: number | null;
}

function cacheKey(
  lat: number,
  lng: number,
  service: NearestAgentServiceFilter,
  limit: number
): string {
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;
  return `${CACHE_PREFIX}${rLat}_${rLng}_${service}_${limit}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryAfterFailure(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    if (!status) return true;
    if (status >= 500) return true;
    if (status === 429) return true;
  }
  return false;
}

function pickRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toHoursRecord(raw: unknown): Record<string, string> {
  const rec = pickRecord(raw);
  if (!rec) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

/**
 * Normalizes API / mock rows into AgentLocation used by maps and lists.
 */
export function normalizeToAgentLocation(raw: unknown): AgentLocation | null {
  const o = pickRecord(raw);
  if (!o) return null;

  const id = String(o.id ?? o.agent_id ?? '');
  if (!id) return null;

  const nested = pickRecord(o.location);
  const lat = Number(
    o.latitude ?? o.lat ?? nested?.latitude ?? nested?.lat
  );
  const lng = Number(
    o.longitude ?? o.lng ?? o.lon ?? nested?.longitude ?? nested?.lng
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const agentTypeRaw = String(o.agent_type ?? o.type ?? 'retail').toLowerCase();
  const agent_type =
    agentTypeRaw === 'nampost' ||
    agentTypeRaw === 'bank_branch' ||
    agentTypeRaw === 'retail' ||
    agentTypeRaw === 'atm' ||
    agentTypeRaw === 'mobile_agent'
      ? (agentTypeRaw as AgentLocation['agent_type'])
      : 'retail';

  const distance_km = Number(o.distance_km ?? o.distance ?? 0);
  const ratingRaw = o.rating ?? o.score;
  const rating =
    typeof ratingRaw === 'number' && Number.isFinite(ratingRaw) ? ratingRaw : undefined;

  return {
    id,
    agent_code: String(o.agent_code ?? o.code ?? ''),
    agent_name: String(o.agent_name ?? o.name ?? 'Agent'),
    agent_type,
    latitude: lat,
    longitude: lng,
    address: o.address != null ? String(o.address) : nested?.address != null ? String(nested.address) : null,
    region: o.region != null ? String(o.region) : nested?.region != null ? String(nested.region) : null,
    ussd_code: o.ussd_code != null ? String(o.ussd_code) : null,
    supports_cashout: Boolean(o.supports_cashout ?? o.cashout),
    supports_voucher_redeem: Boolean(o.supports_voucher_redeem ?? o.supports_voucher ?? o.voucher),
    supports_ewallet: Boolean(o.supports_ewallet ?? o.ewallet),
    supports_namqr: Boolean(o.supports_namqr ?? o.namqr),
    pos_terminal_id: o.pos_terminal_id != null ? String(o.pos_terminal_id) : null,
    operating_hours: toHoursRecord(o.operating_hours),
    distance_km: Number.isFinite(distance_km) ? distance_km : 0,
    rating,
  };
}

function extractAgentsArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const o = pickRecord(body);
  if (!o) return [];
  if (Array.isArray(o.agents)) return o.agents;
  const data = pickRecord(o.data);
  if (data && Array.isArray(data.agents)) return data.agents;
  return [];
}

async function readAgentsCache(
  key: string,
  allowStale: boolean
): Promise<{ agents: AgentLocation[]; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgentsCachePayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.agents)) return null;
    const age = Date.now() - (parsed.savedAt ?? 0);
    if (!allowStale && age > NEAREST_AGENTS_CACHE_TTL_MS) return null;
    return { agents: parsed.agents, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

async function writeAgentsCache(key: string, agents: AgentLocation[]): Promise<void> {
  const payload: AgentsCachePayload = {
    v: 1,
    agents,
    savedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('writeAgentsCache failed', e);
  }
}

async function fetchNearestFromApi(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  service?: NearestAgentServiceFilter;
}): Promise<AgentLocation[]> {
  const query: Record<string, unknown> = {
    lat: params.latitude,
    lng: params.longitude,
    service: params.service ?? 'cashout',
    limit: params.limit ?? 50,
  };
  if (params.radius != null) query.radius = params.radius;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const body = await api.get<unknown>('/api/v1/agents/nearest', {
        params: query,
        retry: false,
      });
      const rows = extractAgentsArray(body);
      const agents = rows
        .map((row) => normalizeToAgentLocation(row))
        .filter((a): a is AgentLocation => a != null);
      return agents;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS - 1 && shouldRetryAfterFailure(e)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

/**
 * Nearest agents with network retries, JWT (api interceptors), 24h cache, offline stale fallback.
 */
export async function getNearestAgentsWithMeta(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  service?: NearestAgentServiceFilter;
}): Promise<NearestAgentsMetaResult> {
  const service = params.service ?? 'cashout';
  const limit = params.limit ?? 50;
  const key = cacheKey(params.latitude, params.longitude, service, limit);

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    const cached = await readAgentsCache(key, true);
    if (cached) {
      return {
        agents: cached.agents,
        fromCache: true,
        lastUpdated: cached.savedAt,
      };
    }
    return { agents: [], fromCache: false, lastUpdated: null };
  }

  try {
    const agents = await fetchNearestFromApi({ ...params, service, limit });
    await writeAgentsCache(key, agents);
    return { agents, fromCache: false, lastUpdated: Date.now() };
  } catch (e) {
    console.warn('getNearestAgentsWithMeta failed after retries', e);
    const stale = await readAgentsCache(key, true);
    if (stale) {
      return {
        agents: stale.agents,
        fromCache: true,
        lastUpdated: stale.savedAt,
      };
    }
    return { agents: [], fromCache: false, lastUpdated: null };
  }
}

/**
 * Find nearest agents (normalized to AgentLocation for maps/lists).
 */
export async function getNearestAgents(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  service?: NearestAgentServiceFilter;
}): Promise<AgentLocation[]> {
  const { agents } = await getNearestAgentsWithMeta(params);
  return agents;
}

/**
 * Get agent by code
 * GET /api/v1/agents/:agentCode
 */
export async function getAgentByCode(agentCode: string): Promise<Agent | null> {
  try {
    const response = await api.get<{ agent: Agent }>(`/api/v1/agents/${agentCode}`);
    return response.agent;
  } catch (error) {
    console.error('getAgentByCode error:', error);
    return null;
  }
}

/**
 * Get agents by region
 * GET /api/v1/agents/region/:region
 */
export async function getAgentsByRegion(region: string): Promise<Agent[]> {
  try {
    const response = await api.get<{ agents: Agent[] }>(`/api/v1/agents/region/${region}`, {
      retry: true,
    });

    return response.agents || [];
  } catch (error) {
    console.error('getAgentsByRegion error:', error);
    return [];
  }
}
