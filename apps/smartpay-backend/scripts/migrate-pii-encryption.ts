/**
 * PII Data Migration Script - PSD-12 §11 Compliance
 * 
 * Encrypts existing plaintext PII data and populates encrypted columns.
 * 
 * This script:
 * 1. Reads all existing plaintext PII from database
 * 2. Encrypts each field using the encryption service
 * 3. Generates searchable hashes for phone/email
 * 4. Writes encrypted data to new columns
 * 5. Validates encryption (decrypt = original)
 * 6. Reports progress and any errors
 * 
 * IMPORTANT: 
 * - Run migration 050_encrypt_pii_columns.sql BEFORE running this script
 * - This script does NOT drop plaintext columns (for safety)
 * - Verify encrypted data before dropping plaintext columns
 * - Can be run multiple times (idempotent)
 * 
 * Usage:
 *   npm run migrate  # First run migration 050
 *   tsx scripts/migrate-pii-encryption.ts
 * 
 * Location: fintech/apps/smartpay-backend/scripts/migrate-pii-encryption.ts
 */

import '../src/preload-env';
import { pool, sql } from '../lib/db';
import {
  encryptPhone,
  hashPhone,
  encryptEmail,
  hashEmail,
  decryptPhone,
  decryptEmail,
  validateEncryptionKeys,
} from '../src/security/encryption-service';

interface MigrationStats {
  table: string;
  total: number;
  encrypted: number;
  validated: number;
  skipped: number;
  errors: number;
}

const stats: MigrationStats[] = [];

/**
 * Validate encryption keys before starting
 */
async function validateKeys(): Promise<void> {
  console.log('🔑 Validating encryption keys...\n');
  
  try {
    validateEncryptionKeys();
    console.log('✅ All encryption keys validated\n');
  } catch (error) {
    console.error('❌ Encryption key validation failed:');
    console.error(error instanceof Error ? error.message : error);
    console.error('\nGenerate missing keys with: openssl rand -base64 32\n');
    process.exit(1);
  }
}

/**
 * Encrypt users table PII
 */
async function encryptUsersTable(): Promise<MigrationStats> {
  console.log('📊 Encrypting users table...\n');
  
  const tableStat: MigrationStats = {
    table: 'users',
    total: 0,
    encrypted: 0,
    validated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Get all users with plaintext PII
    const users = await sql<Array<{
      id: string;
      phone: string | null;
      email: string | null;
      phone_encrypted: string | null;
      email_encrypted: string | null;
    }>>`
      SELECT id, phone, email, phone_encrypted, email_encrypted
      FROM users
      ORDER BY created_at ASC
    `;

    tableStat.total = users.length;
    console.log(`Found ${users.length} users\n`);

    let progress = 0;
    const batchSize = 100;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          // Skip if already encrypted
          if (user.phone_encrypted && user.email_encrypted) {
            tableStat.skipped++;
            continue;
          }

          const updates: any = {};

          // Encrypt phone if present
          if (user.phone && !user.phone_encrypted) {
            updates.phone_encrypted = encryptPhone(user.phone);
            updates.phone_hash = hashPhone(user.phone);

            // Validate encryption
            const decrypted = decryptPhone(updates.phone_encrypted);
            if (decrypted !== user.phone) {
              throw new Error(`Phone encryption validation failed for user ${user.id}`);
            }
          }

          // Encrypt email if present
          if (user.email && !user.email_encrypted) {
            updates.email_encrypted = encryptEmail(user.email);
            updates.email_hash = hashEmail(user.email);

            // Validate encryption
            const decrypted = decryptEmail(updates.email_encrypted);
            if (decrypted !== user.email) {
              throw new Error(`Email encryption validation failed for user ${user.id}`);
            }
          }

          // Update database
          if (Object.keys(updates).length > 0) {
            await pool.query(
              `UPDATE users 
               SET phone_encrypted = COALESCE($1, phone_encrypted),
                   phone_hash = COALESCE($2, phone_hash),
                   email_encrypted = COALESCE($3, email_encrypted),
                   email_hash = COALESCE($4, email_hash),
                   updated_at = NOW()
               WHERE id = $5`,
              [
                updates.phone_encrypted || null,
                updates.phone_hash || null,
                updates.email_encrypted || null,
                updates.email_hash || null,
                user.id,
              ]
            );

            tableStat.encrypted++;
            tableStat.validated++;
          }
        } catch (error) {
          console.error(`❌ Error encrypting user ${user.id}:`, error);
          tableStat.errors++;
        }

        progress++;
        if (progress % 100 === 0) {
          console.log(`Progress: ${progress}/${users.length} (${Math.round((progress / users.length) * 100)}%)`);
        }
      }
    }

    console.log('\n✅ Users table encryption complete\n');
  } catch (error) {
    console.error('❌ Fatal error encrypting users table:', error);
    throw error;
  }

  return tableStat;
}

/**
 * Encrypt otp_codes table PII
 */
async function encryptOtpCodesTable(): Promise<MigrationStats> {
  console.log('📊 Encrypting otp_codes table...\n');
  
  const tableStat: MigrationStats = {
    table: 'otp_codes',
    total: 0,
    encrypted: 0,
    validated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Get all OTP codes with plaintext phones
    const otpCodes = await sql<Array<{
      id: string;
      phone: string;
      phone_encrypted: string | null;
    }>>`
      SELECT id, phone, phone_encrypted
      FROM otp_codes
      WHERE expires_at > NOW()
      ORDER BY created_at DESC
    `;

    tableStat.total = otpCodes.length;
    console.log(`Found ${otpCodes.length} active OTP codes\n`);

    for (const otp of otpCodes) {
      try {
        // Skip if already encrypted
        if (otp.phone_encrypted) {
          tableStat.skipped++;
          continue;
        }

        // Encrypt phone
        const phone_encrypted = encryptPhone(otp.phone);
        const phone_hash = hashPhone(otp.phone);

        // Validate
        const decrypted = decryptPhone(phone_encrypted);
        if (decrypted !== otp.phone) {
          throw new Error(`Phone encryption validation failed for OTP ${otp.id}`);
        }

        // Update database
        await pool.query(
          `UPDATE otp_codes 
           SET phone_encrypted = $1,
               phone_hash = $2
           WHERE id = $3`,
          [phone_encrypted, phone_hash, otp.id]
        );

        tableStat.encrypted++;
        tableStat.validated++;
      } catch (error) {
        console.error(`❌ Error encrypting OTP ${otp.id}:`, error);
        tableStat.errors++;
      }
    }

    console.log('✅ OTP codes table encryption complete\n');
  } catch (error) {
    console.error('❌ Fatal error encrypting otp_codes table:', error);
    throw error;
  }

  return tableStat;
}

/**
 * Encrypt agent_locations table (if exists)
 */
async function encryptAgentLocationsTable(): Promise<MigrationStats> {
  const tableStat: MigrationStats = {
    table: 'agent_locations',
    total: 0,
    encrypted: 0,
    validated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Check if table exists
    const tableExists = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'agent_locations'
      )`
    );

    if (!tableExists.rows[0]?.exists) {
      console.log('⏭️  Skipping agent_locations (table does not exist)\n');
      return tableStat;
    }

    console.log('📊 Encrypting agent_locations table...\n');

    // Check if contact_phone column exists
    const columnExists = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_locations' AND column_name = 'contact_phone'
      )`
    );

    if (!columnExists.rows[0]?.exists) {
      console.log('⏭️  Skipping agent_locations (no contact_phone column)\n');
      return tableStat;
    }

    // Get all agent locations with contact phones
    const locations = await pool.query(
      `SELECT id, contact_phone, contact_phone_encrypted
       FROM agent_locations
       WHERE contact_phone IS NOT NULL`
    );

    tableStat.total = locations.rows.length;
    console.log(`Found ${locations.rows.length} agent locations with contact phones\n`);

    for (const location of locations.rows) {
      try {
        // Skip if already encrypted
        if (location.contact_phone_encrypted) {
          tableStat.skipped++;
          continue;
        }

        // Encrypt phone
        const encrypted = encryptPhone(location.contact_phone);

        // Validate
        const decrypted = decryptPhone(encrypted);
        if (decrypted !== location.contact_phone) {
          throw new Error(`Phone encryption validation failed for location ${location.id}`);
        }

        // Update database
        await pool.query(
          `UPDATE agent_locations 
           SET contact_phone_encrypted = $1
           WHERE id = $2`,
          [encrypted, location.id]
        );

        tableStat.encrypted++;
        tableStat.validated++;
      } catch (error) {
        console.error(`❌ Error encrypting location ${location.id}:`, error);
        tableStat.errors++;
      }
    }

    console.log('✅ Agent locations table encryption complete\n');
  } catch (error) {
    console.error('⚠️  Error encrypting agent_locations table:', error);
    // Don't throw - this table is optional
  }

  return tableStat;
}

/**
 * Print final report
 */
function printReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PII ENCRYPTION MIGRATION REPORT');
  console.log('='.repeat(80) + '\n');

  for (const stat of stats) {
    console.log(`Table: ${stat.table}`);
    console.log(`  Total records: ${stat.total}`);
    console.log(`  Encrypted: ${stat.encrypted}`);
    console.log(`  Validated: ${stat.validated}`);
    console.log(`  Skipped (already encrypted): ${stat.skipped}`);
    console.log(`  Errors: ${stat.errors}`);
    console.log();
  }

  const totalEncrypted = stats.reduce((sum, s) => sum + s.encrypted, 0);
  const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);

  console.log('Summary:');
  console.log(`  Total records encrypted: ${totalEncrypted}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log();

  if (totalErrors > 0) {
    console.log('⚠️  Some records failed to encrypt. Review errors above.');
    console.log('   You can re-run this script to retry failed records.\n');
  } else {
    console.log('✅ All PII data encrypted successfully!\n');
    console.log('Next steps:');
    console.log('  1. Verify encrypted data in database');
    console.log('  2. Update application code to use encrypted columns');
    console.log('  3. Test application thoroughly');
    console.log('  4. After 30 days of verification, consider dropping plaintext columns\n');
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔐 PII ENCRYPTION DATA MIGRATION (PSD-12 §11 Compliance)');
  console.log('='.repeat(80) + '\n');

  try {
    // Validate keys first
    await validateKeys();

    // Encrypt each table
    stats.push(await encryptUsersTable());
    stats.push(await encryptOtpCodesTable());
    stats.push(await encryptAgentLocationsTable());

    // Print report
    printReport();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();
