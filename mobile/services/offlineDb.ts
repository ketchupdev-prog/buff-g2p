/**
 * Offline Database Service
 * 
 * SQLite database for offline-first functionality.
 * Handles schema initialization, migrations, and data management.
 * 
 * Location: mobile/services/offlineDb.ts
 */

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('buffr_offline.db');
  await initializeSchema(db);
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase) {
  try {
    // Check current schema version
    const versionResult = await database.getAllAsync<{ version: number }>(
      `SELECT version FROM schema_version ORDER BY version DESC LIMIT 1`
    ).catch(() => []);
    
    const currentVersion = versionResult.length > 0 ? versionResult[0].version : 0;
    
    // Apply migrations
    if (currentVersion < 1) {
      console.log('Applying migration 1...');
      await applyMigration1(database);
    }
    
    console.log(`Database initialized at version ${currentVersion < 1 ? 1 : currentVersion}`);
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

async function applyMigration1(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    -- Version tracking table
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- User profile cache
    CREATE TABLE IF NOT EXISTS user_cache (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      photo_url TEXT,
      wallet_status TEXT DEFAULT 'active',
      last_proof_of_life TEXT,
      proof_of_life_due_date TEXT,
      buffr_id TEXT,
      synced_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Wallets cache
    CREATE TABLE IF NOT EXISTS wallet_cache (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'additional',
      balance REAL DEFAULT 0,
      icon TEXT,
      card_design_frame_id INTEGER,
      is_main INTEGER DEFAULT 0,
      synced_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_cache(user_id)
    );
    
    -- Transactions cache
    CREATE TABLE IF NOT EXISTS transaction_cache (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE,
      wallet_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      counterparty TEXT,
      description TEXT,
      reference TEXT,
      metadata TEXT,
      created_locally INTEGER DEFAULT 0,
      synced_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallet_cache(wallet_id)
    );
    
    -- Vouchers cache
    CREATE TABLE IF NOT EXISTS voucher_cache (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL UNIQUE,
      voucher_code TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'available',
      type TEXT,
      issued_by TEXT,
      expires_at TEXT,
      metadata TEXT,
      synced_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Sync queue
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      attempted_at TIMESTAMP,
      completed_at TIMESTAMP
    );
    
    -- Offline codes
    CREATE TABLE IF NOT EXISTS offline_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      transaction_id TEXT,
      wallet_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      expires_at TIMESTAMP NOT NULL,
      synced_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallet_cache(wallet_id)
    );
    
    -- Sync conflicts
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      local_version TEXT NOT NULL,
      server_version TEXT NOT NULL,
      resolution TEXT,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Analytics queue
    CREATE TABLE IF NOT EXISTS analytics_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      event_data TEXT,
      user_id TEXT,
      session_id TEXT,
      synced INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_wallet_cache_user ON wallet_cache(user_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_cache_wallet ON transaction_cache(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_cache_status ON transaction_cache(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_idempotency ON sync_queue(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_offline_codes_status ON offline_codes(status);
    CREATE INDEX IF NOT EXISTS idx_offline_codes_expires ON offline_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_queue_synced ON analytics_queue(synced);
    
    -- Record migration
    INSERT INTO schema_version (version) VALUES (1);
  `);
}

export async function clearOfflineData() {
  const database = await getDatabase();
  
  try {
    await database.execAsync(`
      DELETE FROM user_cache;
      DELETE FROM wallet_cache;
      DELETE FROM transaction_cache;
      DELETE FROM voucher_cache;
      DELETE FROM sync_queue;
      DELETE FROM offline_codes;
      DELETE FROM analytics_queue;
    `);
    console.log('Offline data cleared successfully');
  } catch (error) {
    console.error('Failed to clear offline data:', error);
    throw error;
  }
}

export async function vacuumDatabase() {
  const database = await getDatabase();
  
  try {
    await database.execAsync('VACUUM;');
    console.log('Database vacuumed successfully');
  } catch (error) {
    console.error('Failed to vacuum database:', error);
  }
}

// Helper function to get wallet balance from cache
export async function getWalletBalance(walletId: string): Promise<number> {
  const database = await getDatabase();
  
  try {
    const result = await database.getAllAsync<{ balance: number }>(
      `SELECT balance FROM wallet_cache WHERE wallet_id = ?`,
      [walletId]
    );
    
    return result.length > 0 ? result[0].balance : 0;
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
}

// Helper function to update wallet balance
export async function updateWalletBalance(walletId: string, amount: number): Promise<void> {
  const database = await getDatabase();
  
  try {
    await database.runAsync(
      `UPDATE wallet_cache SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE wallet_id = ?`,
      [amount, walletId]
    );
  } catch (error) {
    console.error('Failed to update wallet balance:', error);
    throw error;
  }
}
