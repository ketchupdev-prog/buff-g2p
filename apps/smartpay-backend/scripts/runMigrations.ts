/**
 * Database Migration Runner
 * Runs SQL from the monorepo canonical folder: fintech/database/migrations
 * (single source of truth; avoids drift vs apps/smartpay-backend/migrations).
 * Location: apps/smartpay-backend/scripts/runMigrations.ts
 */
import '../src/preload-env';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool, sql } from '../src/lib/db';

/** Canonical migrations directory (numeric *.sql only; subfolders skipped). */
const MIGRATIONS_DIR = join(__dirname, '../../../database/migrations');
/** App-specific migrations (PostGIS agent locations, etc.) — run after canonical. */
const APP_MIGRATIONS_DIR = join(__dirname, '../migrations');

async function listSqlFiles(dir: string): Promise<string[]> {
  try {
    const names = await readdir(dir);
    return names.filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return [];
  }
}

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  try {
    // Create migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const canonicalFiles = await listSqlFiles(MIGRATIONS_DIR);
    const appFiles = await listSqlFiles(APP_MIGRATIONS_DIR);
    const onlyFilter = process.env.MIGRATION_ONLY?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const migrationJobs = [
      ...canonicalFiles.map((name) => ({ name, dir: MIGRATIONS_DIR })),
      ...appFiles.map((name) => ({ name, dir: APP_MIGRATIONS_DIR })),
    ].filter((job) => !onlyFilter?.length || onlyFilter.includes(job.name));

    if (onlyFilter?.length) {
      console.log(`MIGRATION_ONLY filter active: ${onlyFilter.join(', ')}\n`);
    }

    console.log(`Found ${migrationJobs.length} migration file(s)\n`);

    // Get already executed migrations
    const executed = await sql`SELECT name FROM migrations ORDER BY id`;
    const executedNames = new Set(executed.map((row: any) => row.name));

    // Run pending migrations
    let applied = 0;
    
    for (const { name: file, dir } of migrationJobs) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶️  Executing ${file}...`);
      
      const filePath = join(dir, file);
      const migrationSQL = await readFile(filePath, 'utf-8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute migration SQL (local file; not user input).
        await client.query(migrationSQL);
        
        // Record migration in the migrations table
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        
        await client.query('COMMIT');
        console.log(`✅ Applied ${file}\n`);
        applied++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply ${file}:`);
        console.error(error);
        console.error('⚠️  Transaction rolled back - database state preserved');
        process.exit(1);
      } finally {
        client.release();
      }
    }

    if (applied === 0) {
      console.log('✅ All migrations up to date!\n');
    } else {
      console.log(`✅ Successfully applied ${applied} migration(s)!\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
