/**
 * Optional Redis cache for agent location queries (falls back to in-memory TTL map).
 */
import Redis from 'ioredis';

let redisClient: Redis | null | undefined;
const memory = new Map<string, { value: string; expiresAt: number }>();

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis(url);
  return redisClient;
}

export async function agentsCacheGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (r) {
    return r.get(key);
  }
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function agentsCacheSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.setex(key, ttlSeconds, value);
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Test helper: clear in-memory cache between cases */
export function clearAgentsCacheMemory(): void {
  memory.clear();
}
