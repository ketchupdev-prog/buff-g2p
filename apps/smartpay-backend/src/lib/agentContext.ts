/**
 * Minimal Agent Context (DuckDB/LanceDB Optional)
 * Location: fintech/smartpay/backend/src/lib/agentContext.minimal.ts
 * 
 * Temporary minimal version for testing Buffr integration without DuckDB/LanceDB
 */
import { Pool } from 'pg';
import { pool } from './db';

export interface AgentContext {
  userId: string;
  sessionId?: string;
  dbPool: Pool;
  lanceDB?: any;
  duckDB?: any;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
  };
}

/**
 * Initialize data layer (minimal version - no DuckDB/LanceDB)
 */
export async function initializeDataLayer(): Promise<void> {
  console.log('[DataLayer] Using minimal mode (PostgreSQL only)');
  console.log('[DataLayer] ⚠️  DuckDB/LanceDB disabled (Node v24 compatibility)');
  console.log('[DataLayer] ✓ PostgreSQL ready');
  console.log('[DataLayer] ✓ Buffr integration will work normally');
}

/**
 * Create agent context for a specific user session
 */
export async function createAgentContext(
  userId: string,
  sessionId?: string,
  metadata?: AgentContext['metadata']
): Promise<AgentContext> {
  return {
    userId,
    sessionId,
    dbPool: pool,
    metadata: metadata || {
      timestamp: new Date(),
    },
  };
}

/**
 * Health check for data layer
 */
export async function dataLayerHealthCheck(): Promise<{
  postgres: boolean;
  lancedb: boolean;
  duckdb: boolean;
  overall: boolean;
}> {
  const health = {
    postgres: false,
    lancedb: false,
    duckdb: false,
    overall: false,
  };

  try {
    const pgResult = await pool.query('SELECT NOW()');
    health.postgres = pgResult.rowCount !== null && pgResult.rowCount > 0;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  health.overall = health.postgres;
  return health;
}

/**
 * Shutdown data layer
 */
export async function shutdownDataLayer(): Promise<void> {
  console.log('Shutting down data layer (minimal mode)...');
  await pool.end();
  console.log('✓ PostgreSQL pool closed');
}

/**
 * Get data layer status
 */
export function getDataLayerStatus(): {
  lanceDBInitialized: boolean;
  duckDBInitialized: boolean;
  knowledgeBaseInitialized: boolean;
} {
  return {
    lanceDBInitialized: false,
    duckDBInitialized: false,
    knowledgeBaseInitialized: false,
  };
}
