/**
 * Agent Context Manager for Smartpay Copilot
 * Location: fintech/smartpay/backend/src/lib/agentContext.ts
 * Reference: PRD §4.6, Dependency injection for agent tools
 * 
 * Manages connections to data layer (LanceDB, DuckDB, PostgreSQL) and
 * provides them to agent tools via dependency injection.
 */
import { Pool } from 'pg';
import { pool } from './db';
import { initLanceDB, LanceDBConnection, ingestPRDDocuments } from './lancedb';
import { initDuckDB, DuckDBConnection } from './duckdb';

export interface AgentContext {
  userId: string;
  sessionId?: string;
  dbPool: Pool;
  lanceDB: LanceDBConnection;
  duckDB: DuckDBConnection;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
  };
}

let globalLanceDB: LanceDBConnection | null = null;
let globalDuckDB: DuckDBConnection | null = null;
let isKnowledgeBaseInitialized = false;

/**
 * Initialize global data layer connections (call once at server startup)
 */
export async function initializeDataLayer(): Promise<void> {
  try {
    console.log('Initializing data layer...');

    // Initialize LanceDB
    if (!globalLanceDB) {
      globalLanceDB = await initLanceDB();
      console.log('✓ LanceDB initialized');
      
      // Ingest initial knowledge base (only once)
      if (!isKnowledgeBaseInitialized) {
        await ingestPRDDocuments(globalLanceDB);
        isKnowledgeBaseInitialized = true;
        console.log('✓ Knowledge base initialized');
      }
    }

    // Initialize DuckDB
    if (!globalDuckDB) {
      globalDuckDB = await initDuckDB();
      console.log('✓ DuckDB initialized');
    }

    console.log('Data layer initialization complete');
  } catch (error) {
    console.error('Failed to initialize data layer:', error);
    throw error;
  }
}

/**
 * Create agent context for a specific user session
 */
export async function createAgentContext(
  userId: string,
  sessionId?: string,
  metadata?: AgentContext['metadata']
): Promise<AgentContext> {
  // Ensure data layer is initialized
  if (!globalLanceDB || !globalDuckDB) {
    await initializeDataLayer();
  }

  return {
    userId,
    sessionId,
    dbPool: pool,
    lanceDB: globalLanceDB!,
    duckDB: globalDuckDB!,
    metadata: metadata || {
      timestamp: new Date(),
    },
  };
}

/**
 * Health check for all data layer connections
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
    // Check PostgreSQL
    const pgResult = await pool.query('SELECT NOW()');
    health.postgres = pgResult.rowCount !== null && pgResult.rowCount > 0;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  try {
    // Check LanceDB (attempt search)
    if (globalLanceDB) {
      const results = await globalLanceDB.search('health check', 1);
      health.lancedb = true;
    }
  } catch (error) {
    console.error('LanceDB health check failed:', error);
  }

  try {
    // Check DuckDB (false when native module failed and we're using stub)
    if (globalDuckDB && !(globalDuckDB as { _stub?: boolean })._stub) {
      await new Promise<void>((resolve) => {
        (globalDuckDB!.connection as { all: (s: string, cb: (err: Error | null) => void) => void }).all(
          'SELECT 1',
          (err) => {
            health.duckdb = !err;
            resolve();
          }
        );
      });
    }
  } catch (error) {
    console.error('DuckDB health check failed:', error);
  }

  health.overall = health.postgres && (health.lancedb || health.duckdb);

  return health;
}

/**
 * Shutdown data layer connections gracefully
 */
export async function shutdownDataLayer(): Promise<void> {
  console.log('Shutting down data layer...');

  if (globalDuckDB) {
    try {
      const conn = globalDuckDB.connection as { close: () => void };
      const db = globalDuckDB.db as { close: () => void };
      if (conn?.close) conn.close();
      if (db?.close) db.close();
      globalDuckDB = null;
      console.log('✓ DuckDB closed');
    } catch (error) {
      console.error('Error closing DuckDB:', error);
    }
  }

  if (globalLanceDB) {
    globalLanceDB = null;
    console.log('✓ LanceDB closed');
  }

  // PostgreSQL pool cleanup
  await pool.end();
  console.log('✓ PostgreSQL pool closed');

  console.log('Data layer shutdown complete');
}

/**
 * Get current data layer status
 */
export function getDataLayerStatus(): {
  lanceDBInitialized: boolean;
  duckDBInitialized: boolean;
  knowledgeBaseInitialized: boolean;
} {
  return {
    lanceDBInitialized: globalLanceDB !== null,
    duckDBInitialized: globalDuckDB !== null,
    knowledgeBaseInitialized: isKnowledgeBaseInitialized,
  };
}

/**
 * Force re-initialization of knowledge base
 * (useful for updates or testing)
 */
export async function reinitializeKnowledgeBase(): Promise<void> {
  if (!globalLanceDB) {
    await initializeDataLayer();
  }

  await ingestPRDDocuments(globalLanceDB!);
  isKnowledgeBaseInitialized = true;
  console.log('Knowledge base re-initialized');
}
