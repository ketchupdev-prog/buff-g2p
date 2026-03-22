/**
 * Export PostgreSQL data to Parquet format for DuckDB analytics
 * Location: fintech/smartpay/backend/scripts/exportToParquet.ts
 * Reference: PRD §4.6.2 - Data pipeline for analytics
 * 
 * Usage: npm run export:parquet
 * 
 * This script:
 * 1. Exports data from PostgreSQL to Parquet files
 * 2. Implements incremental export (only new/changed data)
 * 3. Stores files in backend/data/parquet/
 */

import * as path from 'path';
import * as fs from 'fs';
import { pool } from '../src/lib/db';
import * as duckdb from 'duckdb';

const PARQUET_DATA_DIR = path.join(__dirname, '../data/parquet');
const CHECKPOINT_FILE = path.join(PARQUET_DATA_DIR, '.export_checkpoint.json');

interface ExportCheckpoint {
  lastExportTime: string;
  tableCounts: Record<string, number>;
}

interface ExportConfig {
  tableName: string;
  parquetFile: string;
  query: string;
  incrementalColumn?: string;
}

/**
 * Ensure Parquet data directory exists
 */
function ensureParquetDir(): void {
  if (!fs.existsSync(PARQUET_DATA_DIR)) {
    fs.mkdirSync(PARQUET_DATA_DIR, { recursive: true });
    console.log(`✅ Created Parquet directory: ${PARQUET_DATA_DIR}`);
  }
}

/**
 * Load export checkpoint (for incremental exports)
 */
function loadCheckpoint(): ExportCheckpoint | null {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load checkpoint:', error);
      return null;
    }
  }
  return null;
}

/**
 * Save export checkpoint
 */
function saveCheckpoint(checkpoint: ExportCheckpoint): void {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    console.log('✅ Checkpoint saved');
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
  }
}

/**
 * Export a PostgreSQL table to Parquet using DuckDB
 */
async function exportTableToParquet(
  tableName: string,
  query: string,
  parquetFile: string,
  incrementalColumn?: string,
  lastExportTime?: string
): Promise<number> {
  const startTime = Date.now();
  const outputPath = path.join(PARQUET_DATA_DIR, parquetFile);
  
  console.log(`\n📊 Exporting ${tableName}...`);
  
  // Modify query for incremental export
  let finalQuery = query;
  if (incrementalColumn && lastExportTime) {
    finalQuery = `${query} WHERE ${incrementalColumn} > '${lastExportTime}'`;
    console.log(`   Using incremental export (since ${lastExportTime})`);
  }
  
  // Fetch data from PostgreSQL
  const result = await pool.query(finalQuery);
  const rowCount = result.rowCount || 0;
  
  if (rowCount === 0) {
    console.log(`   No new data to export`);
    return 0;
  }
  
  console.log(`   Fetched ${rowCount} rows from PostgreSQL`);
  
  // Write to Parquet using DuckDB
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(':memory:');
    const conn = db.connect();
    
    // Create a temporary table with the data
    const createTableSql = generateCreateTableSql(tableName, result.rows[0]);
    
    conn.run(createTableSql, (err) => {
      if (err) {
        console.error('Failed to create temp table:', err);
        reject(err);
        return;
      }
      
      // Insert data into temporary table
      const insertPromises = result.rows.map((row) => {
        return new Promise<void>((resolveInsert, rejectInsert) => {
          const columns = Object.keys(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const values = columns.map((col) => row[col]);
          
          const insertSql = `INSERT INTO temp_${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
          
          conn.run(insertSql, ...values, (err) => {
            if (err) {
              rejectInsert(err);
            } else {
              resolveInsert();
            }
          });
        });
      });
      
      Promise.all(insertPromises)
        .then(() => {
          // Export to Parquet
          const exportSql = `
            COPY temp_${tableName} TO '${outputPath}' (FORMAT PARQUET, COMPRESSION ZSTD);
          `;
          
          conn.run(exportSql, (err) => {
            if (err) {
              console.error('Failed to export to Parquet:', err);
              reject(err);
              return;
            }
            
            const duration = Date.now() - startTime;
            const fileSize = fs.statSync(outputPath).size;
            const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
            
            console.log(`   ✅ Exported ${rowCount} rows in ${duration}ms`);
            console.log(`   📦 File size: ${fileSizeMB} MB`);
            
            conn.close(() => {
              db.close(() => {
                resolve(rowCount);
              });
            });
          });
        })
        .catch(reject);
    });
  });
}

/**
 * Generate CREATE TABLE SQL from a sample row
 */
function generateCreateTableSql(tableName: string, sampleRow: any): string {
  const columns = Object.keys(sampleRow).map((col) => {
    const value = sampleRow[col];
    let type = 'VARCHAR';
    
    if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'BIGINT' : 'DOUBLE';
    } else if (typeof value === 'boolean') {
      type = 'BOOLEAN';
    } else if (value instanceof Date) {
      type = 'TIMESTAMP';
    } else if (typeof value === 'object' && value !== null) {
      type = 'JSON';
    }
    
    return `${col} ${type}`;
  });
  
  return `CREATE TABLE temp_${tableName} (${columns.join(', ')})`;
}

/**
 * Main export function
 */
async function exportAllTables(): Promise<void> {
  console.log('🚀 Starting Parquet export...\n');
  
  ensureParquetDir();
  
  const checkpoint = loadCheckpoint();
  const lastExportTime = checkpoint?.lastExportTime;
  
  const exportConfigs: ExportConfig[] = [
    {
      tableName: 'transactions',
      parquetFile: 'transactions.parquet',
      query: `
        SELECT 
          id, user_id, wallet_id, type, amount, 
          recipient, merchant_name, category, status,
          description, metadata, created_at, updated_at
        FROM transactions
      `,
      incrementalColumn: 'created_at',
    },
    {
      tableName: 'wallets',
      parquetFile: 'wallets.parquet',
      query: `
        SELECT 
          id, user_id, balance, currency, status,
          created_at, updated_at
        FROM wallets
      `,
      incrementalColumn: 'updated_at',
    },
    {
      tableName: 'users',
      parquetFile: 'users.parquet',
      query: `
        SELECT 
          id, phone_number, email, first_name, last_name,
          kyc_level, created_at, updated_at
        FROM users
      `,
      incrementalColumn: 'updated_at',
    },
    {
      tableName: 'grants',
      parquetFile: 'grants.parquet',
      query: `
        SELECT 
          id, user_id, wallet_id, program_name, amount,
          disbursement_date, status, created_at
        FROM grants
      `,
      incrementalColumn: 'created_at',
    },
  ];
  
  const tableCounts: Record<string, number> = {};
  
  for (const config of exportConfigs) {
    try {
      const count = await exportTableToParquet(
        config.tableName,
        config.query,
        config.parquetFile,
        config.incrementalColumn,
        lastExportTime
      );
      tableCounts[config.tableName] = count;
    } catch (error) {
      console.error(`❌ Failed to export ${config.tableName}:`, error);
    }
  }
  
  // Save checkpoint
  const newCheckpoint: ExportCheckpoint = {
    lastExportTime: new Date().toISOString(),
    tableCounts,
  };
  saveCheckpoint(newCheckpoint);
  
  console.log('\n✅ Export complete!');
  console.log('\nSummary:');
  Object.entries(tableCounts).forEach(([table, count]) => {
    console.log(`  ${table}: ${count} rows`);
  });
}

/**
 * Run export
 */
if (require.main === module) {
  exportAllTables()
    .then(() => {
      console.log('\n✅ All exports completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportAllTables, exportTableToParquet };
