/**
 * Manual Cleanup Script for Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/cleanup.js
 * 
 * Run this script to manually clean up test data:
 * node __tests__/integration/setup/cleanup.js
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ No database URL configured');
  process.exit(1);
}

async function cleanup() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🧹 Starting manual cleanup...\n');

    await pool.query('BEGIN');

    const tables = [
      'transactions',
      'vouchers',
      'group_split_shares',
      'group_splits',
      'group_members',
      'groups',
      'obs_consents',
      'wallets',
      'otp_codes',
      'users',
      'buffr_webhook_events',
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(
          `DELETE FROM ${table} 
           WHERE created_at > NOW() - INTERVAL '1 day' 
             AND (phone LIKE '+26481%' OR phone LIKE '+26482%' OR phone LIKE '+26483%' OR true)`
        );
        console.log(`  ✓ Cleaned ${table}: ${result.rowCount || 0} rows deleted`);
      } catch (error) {
        console.log(`  ⚠️  Table ${table} not found or error: ${error.message}`);
      }
    }

    await pool.query('COMMIT');

    console.log('\n✅ Manual cleanup complete\n');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanup().catch((error) => {
  console.error(error);
  process.exit(1);
});
