/**
 * DuckDB Analytics Engine for Smartpay
 * Location: fintech/smartpay/backend/src/lib/duckdb.ts
 * Reference: PRD §4.6.2 - High-performance SQL for analytical queries
 *
 * Purpose:
 * - In-memory analytical database for fast queries
 * - Query Parquet exports and LanceDB datasets
 * - Optional: loads native module; if unavailable (e.g. Node 24 no prebuild), runs in stub mode so server still starts.
 * - Use Node 20 LTS for full DuckDB support (prebuilt binaries).
 */

import * as path from 'path';
import * as fs from 'fs';

const PARQUET_DATA_DIR = path.join(__dirname, '../../data/parquet');
const DUCKDB_PATH = ':memory:';

export interface DuckDBConnection {
  db: unknown;
  connection: unknown;
  initialized: boolean;
  /** When true, native module failed to load; all queries return empty. */
  _stub?: boolean;
}

let dbInstance: DuckDBConnection | null = null;

/** Create a no-op connection so the server can start without the DuckDB native addon. */
function createStubConnection(): DuckDBConnection {
  const noop = (cb?: (err?: Error) => void) => (cb ? setImmediate(() => cb()) : undefined);
  return {
    db: {},
    connection: {
      run: (_s: string, cb?: (err?: Error) => void) => noop(cb),
      all: (_s: string, ..._args: unknown[]) => {
        const cb = typeof _args[_args.length - 1] === 'function' ? _args.pop() : undefined;
        if (cb) setImmediate(() => (cb as (err: null, result: unknown[]) => void)(null, []));
      },
      close: (cb?: (err?: Error) => void) => noop(cb),
      prepare: (_s: string, cb: (err?: Error, stmt?: unknown) => void) =>
        setImmediate(() => cb(undefined, { all: (_: unknown, c: (err: null, r: unknown[]) => void) => setImmediate(() => c(null, [])), finalize: () => {} })),
    },
    initialized: true,
    _stub: true,
  };
}

/**
 * Initialize DuckDB instance with Parquet support.
 * If the native module fails to load (e.g. Node 24 without prebuild), returns a stub so the server still starts.
 */
export async function initDuckDB(): Promise<DuckDBConnection> {
  if (dbInstance && dbInstance.initialized) {
    return dbInstance;
  }

  try {
    const duckdb = await import('duckdb');
    return new Promise((resolve, reject) => {
      const db = new duckdb.Database(DUCKDB_PATH, (err: Error | null) => {
        if (err) {
          console.warn('DuckDB init failed, using stub:', err.message);
          dbInstance = createStubConnection();
          resolve(dbInstance);
          return;
        }

        const connection = db.connect();

        connection.run('INSTALL parquet; LOAD parquet;', (err: Error | null) => {
          if (err) console.warn('Parquet extension note:', err.message);
        });

        connection.run(
          `SET threads TO 4; SET memory_limit = '1GB'; SET temp_directory = '/tmp/duckdb';`,
          (err: Error | null) => {
            if (err) console.warn('DuckDB configuration warning:', err.message);
          }
        );

        console.log('✅ DuckDB initialized successfully');
        dbInstance = {
          db,
          connection,
          initialized: true,
        };
        resolve(dbInstance);
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('DuckDB native module not available (use Node 20 LTS for full support):', msg);
    dbInstance = createStubConnection();
    return dbInstance;
  }
}

function isStub(instance: DuckDBConnection): boolean {
  return Boolean(instance._stub);
}

type ConnectionLike = {
  all: (sql: string, ...args: unknown[]) => void;
  prepare: (sql: string, cb: (err?: Error, stmt?: { all: (...a: unknown[]) => void; finalize: () => void }) => void) => void;
};

/**
 * Execute a query on DuckDB
 */
export async function queryDuckDB<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const instance = await initDuckDB();
  if (isStub(instance)) return [];

  const connection = instance.connection as ConnectionLike;
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const args = params ? [...params] : [];
    const cb = (err: Error | null, result?: T[]) => {
      const duration = Date.now() - startTime;
      if (err) {
        console.error('DuckDB query error:', err);
        reject(err);
        return;
      }
      if (duration > 500) console.warn(`⚠️  Slow DuckDB query (${duration}ms):`, sql.substring(0, 100));
      else console.log(`✅ DuckDB query completed in ${duration}ms`);
      resolve((result ?? []) as T[]);
    };
    args.push(cb);
    connection.all(sql, ...args);
  });
}

/**
 * Execute a prepared statement for better performance and security
 */
export async function queryDuckDBPrepared<T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<T[]> {
  const instance = await initDuckDB();
  if (isStub(instance)) return [];

  const connection = instance.connection as ConnectionLike;
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    connection.prepare(sql, (err, stmt) => {
      if (err) {
        console.error('DuckDB prepare error:', err);
        reject(err);
        return;
      }
      if (!stmt) {
        reject(new Error('DuckDB prepare returned no statement'));
        return;
      }
      stmt.all(...params, (err: Error | null, result?: T[]) => {
        const duration = Date.now() - startTime;
        if (err) {
          console.error('DuckDB execute error:', err);
          reject(err);
          return;
        }
        if (duration > 500) console.warn(`⚠️  Slow DuckDB query (${duration}ms)`);
        else console.log(`✅ DuckDB query completed in ${duration}ms`);
        stmt.finalize();
        resolve((result ?? []) as T[]);
      });
    });
  });
}

/**
 * Create views from Parquet files for easy querying
 */
export async function createParquetViews(): Promise<void> {
  const instance = await initDuckDB();
  if (isStub(instance)) return;

  if (!fs.existsSync(PARQUET_DATA_DIR)) {
    console.warn(`⚠️  Parquet data directory does not exist: ${PARQUET_DATA_DIR}`);
    return;
  }

  const parquetFiles = [
    { name: 'transactions', file: 'transactions.parquet' },
    { name: 'wallets', file: 'wallets.parquet' },
    { name: 'users', file: 'users.parquet' },
    { name: 'grants', file: 'grants.parquet' },
  ];

  const connection = instance.connection as { run: (sql: string, cb: (err?: Error) => void) => void };
  for (const { name, file } of parquetFiles) {
    const filePath = path.join(PARQUET_DATA_DIR, file);
    if (fs.existsSync(filePath)) {
      const sql = `CREATE OR REPLACE VIEW ${name} AS SELECT * FROM read_parquet('${filePath}');`;
      try {
        await new Promise<void>((resolve, reject) => {
          connection.run(sql, (err) => (err ? reject(err) : resolve()));
        });
        console.log(`✅ Created view: ${name}`);
      } catch (error) {
        console.error(`Error creating view ${name}:`, error);
      }
    } else {
      console.warn(`⚠️  Parquet file not found: ${filePath}`);
    }
  }
}

/**
 * Query multiple Parquet files with joins
 */
export async function queryParquetFiles(sql: string): Promise<unknown[]> {
  await createParquetViews();
  return queryDuckDB(sql);
}

/**
 * Get DuckDB statistics for monitoring
 */
export async function getDuckDBStats(): Promise<{ memoryUsage: string; tempFiles: number; activeQueries: number }> {
  const instance = await initDuckDB();
  if (isStub(instance)) {
    return { memoryUsage: 'N/A (stub)', tempFiles: 0, activeQueries: 0 };
  }

  const connection = instance.connection as { all: (sql: string, cb: (err: Error | null, result?: unknown[]) => void) => void };
  return new Promise((resolve, reject) => {
    connection.all('PRAGMA database_size;', (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        memoryUsage: (result?.[0] as { memory_usage?: string })?.memory_usage || 'unknown',
        tempFiles: 0,
        activeQueries: 0,
      });
    });
  });
}

/**
 * Close DuckDB connection (call on server shutdown)
 */
export async function closeDuckDB(): Promise<void> {
  if (!dbInstance || isStub(dbInstance)) {
    dbInstance = null;
    return;
  }
  const conn = dbInstance.connection as { close: (cb: (err?: Error) => void) => void };
  const d = dbInstance.db as { close: (cb: (err?: Error) => void) => void };
  return new Promise((resolve, reject) => {
    conn.close((err) => {
      if (err) {
        console.error('Error closing DuckDB connection:', err);
        reject(err);
        return;
      }
      d.close((err) => {
        if (err) {
          console.error('Error closing DuckDB database:', err);
          reject(err);
          return;
        }
        console.log('✅ DuckDB connection closed');
        dbInstance = null;
        resolve();
      });
    });
  });
}

/**
 * Health check for DuckDB
 */
export async function healthCheckDuckDB(): Promise<boolean> {
  try {
    const result = await queryDuckDB<{ health: number }>('SELECT 1 as health;');
    const firstRow = result[0];
    return result.length > 0 && firstRow?.health === 1 && !dbInstance?._stub;
  } catch {
    return false;
  }
}
