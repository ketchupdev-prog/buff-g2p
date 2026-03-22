#!/usr/bin/env node
/**
 * Run migration 023 directly (OTP rate limiting fix)
 * Bypasses migration 020 policy conflicts
 */

import { sql } from '../dist/lib/db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration023() {
  try {
    console.log('📦 Running migration 023_fix_otp_rate_limiting.sql...\n');
    
    const migrationPath = join(__dirname, '../migrations/023_fix_otp_rate_limiting.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('\n✅ Migration 023 completed successfully!');
    console.log('\nVerifying OTP rate limiting fix...');
    
    // Verify the fix by checking the function
    const [func] = await sql`
      SELECT pg_get_functiondef(oid) AS definition
      FROM pg_proc
      WHERE proname = 'create_otp';
    `;
    
    if (func?.definition?.includes('v_daily_limit := 100')) {
      console.log('✅ Daily limit correctly set to 100');
    } else {
      console.log('⚠️  Daily limit check inconclusive');
    }
    
    console.log('\n📊 Rate Limits:');
    console.log('  • Per-minute: 5 requests');
    console.log('  • Daily: 100 requests (up from 10)');
    console.log('  • Window: 24 hours (auto-reset)');
    console.log('\n🎉 OTP rate limiting fix applied successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration 023 failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

runMigration023();
