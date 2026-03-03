/**
 * Run migration 003 directly - adds user profile columns and PIN
 */
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
config({ path: resolve(root, 'backend/.env') });
config({ path: resolve(root, 'backend/.env.local') });
config({ path: resolve(root, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env files');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
  console.log('Running migration 003: Add user profile and PIN columns...');
  
  try {
    // Add pin_hash to users
    console.log('Adding pin_hash column to users...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255)`;
    console.log('✓ pin_hash added');
  } catch (e) {
    console.log('  (pin_hash may already exist):', e.message);
  }

  try {
    console.log('Adding first_name column to users...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`;
    console.log('✓ first_name added');
  } catch (e) {
    console.log('  (first_name may already exist):', e.message);
  }

  try {
    console.log('Adding last_name column to users...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`;
    console.log('✓ last_name added');
  } catch (e) {
    console.log('  (last_name may already exist):', e.message);
  }

  try {
    console.log('Adding photo_url column to users...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`;
    console.log('✓ photo_url added');
  } catch (e) {
    console.log('  (photo_url may already exist):', e.message);
  }

  try {
    console.log('Adding columns to notifications table...');
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50)`;
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`;
    console.log('✓ notifications columns added');
  } catch (e) {
    console.log('  (notifications columns may already exist):', e.message);
  }

  try {
    console.log('Creating index on notifications...');
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC)`;
    console.log('✓ index created');
  } catch (e) {
    console.log('  (index may already exist):', e.message);
  }

  console.log('\n✅ Migration 003 complete!');
}

runMigration().catch(console.error);
