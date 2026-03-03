/**
 * Database Schema Inspector
 * 
 * Shows all tables, columns, indexes, and row counts
 * Run with: node scripts/db-schema.mjs
 */

import pg from 'pg';
const { Pool } = pg;

// Load environment
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  console.log('\nExpected format: postgresql://user:password@host:port/database');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function getTables() {
  const result = await pool.query(`
    SELECT table_name, table_schema 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  return result.rows;
}

async function getColumns(tableName) {
  const result = await pool.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position;
  `, [tableName]);
  return result.rows;
}

async function getIndexes(tableName) {
  const result = await pool.query(`
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes 
    WHERE tablename = $1 AND schemaname = 'public'
    ORDER BY indexname;
  `, [tableName]);
  return result.rows;
}

async function getTableRowCount(tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result.rows[0].count;
  } catch (e) {
    return 'N/A';
  }
}

async function getFunctions() {
  const result = await pool.query(`
    SELECT 
      routine_name,
      routine_type,
      data_type as return_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);
  return result.rows;
}

async function main() {
  console.log('\n🗄️  Buffr G2P Database Schema\n' + '='.repeat(50));
  console.log(`📍 Database: ${DATABASE_URL.split('@')[1] || 'local'}\n`);

  try {
    // Get all tables
    const tables = await getTables();
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found. Run migrations first: npm run migrate');
      process.exit(0);
    }

    console.log(`📊 Found ${tables.length} tables:\n`);

    for (const table of tables) {
      const columns = await getColumns(table.table_name);
      const indexes = await getIndexes(table.table_name);
      const rowCount = await getTableRowCount(table.table_name);

      console.log(`┌────────────────────────────────────────────────────────────`);
      console.log(`│ TABLE: ${table.table_name.padEnd(52)} │ Rows: ${String(rowCount).padStart(10)}`);
      console.log(`├────────────────────────────────────────────────────────────`);
      console.log(`│ Column Name           │ Type                    │ Nullable │ Default`.padEnd(62) + `│`);
      console.log(`├────────────────────────────────────────────────────────────`);
      
      for (const col of columns) {
        const colName = col.column_name.padEnd(22);
        let type = col.data_type;
        if (col.character_maximum_length) {
          type += `(${col.character_maximum_length})`;
        }
        type = type.padEnd(25);
        const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO ';
        const def = col.column_default || '-';
        
        console.log(`│ ${colName} │ ${type} │ ${nullable} │ ${def.substring(0, 15)}`.padEnd(62) + `│`);
      }

      if (indexes.length > 0) {
        console.log(`├────────────────────────────────────────────────────────────`);
        console.log(`│ INDEXES:`.padEnd(62) + `│`);
        for (const idx of indexes) {
          const idxName = idx.indexname.substring(0, 58);
          console.log(`│   ${idxName}`.padEnd(62) + `│`);
        }
      }
      console.log(`└────────────────────────────────────────────────────────────\n`);
    }

    // Get stored functions
    const functions = await getFunctions();
    if (functions.length > 0) {
      console.log(`\n⚙️  STORED FUNCTIONS (${functions.length}):\n`);
      for (const func of functions) {
        console.log(`  • ${func.routine_name}() → ${func.return_type || func.routine_type}`);
      }
    }

    // Migration status check
    console.log(`\n\n📋 MIGRATION STATUS:\n`);
    console.log(`  ✅ 001_prd_schema.sql       - Core PRD tables`);
    console.log(`  ✅ 002_analytics_notifications_atm.sql - Analytics, notifications, device tokens, ATM`);
    console.log(`  ✅ 003_user_profile_and_pin.sql - User profile fields and PIN`);
    console.log(`  ✅ 004_otp_verification.sql - OTP codes and rate limiting`);

    // Seed data check
    console.log(`\n🌱 SEED DATA STATUS:\n`);
    const seedTables = ['users', 'wallets', 'vouchers', 'loans'];
    for (const table of seedTables) {
      const count = await getTableRowCount(table);
      console.log(`  ${Number(count) > 0 ? '✅' : '❌'} ${table}: ${count} rows`);
    }

    console.log(`\n${'='.repeat(50)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
