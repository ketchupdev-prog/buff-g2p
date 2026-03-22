/**
 * Offline Code Generator Service
 * 
 * Generates secure offline cash-out codes with cryptographic nonce.
 * Codes are queued for registration when device comes online.
 * 
 * Location: mobile/services/offlineCodeGenerator.ts
 */

import * as Crypto from 'expo-crypto';
import { getDatabase } from './offlineDb';

export interface OfflineCode {
  code: string;
  nonce: string;
  transactionId: string;
  walletId: string;
  amount: number;
  method: 'till' | 'agent' | 'merchant' | 'atm';
  expiresAt: Date;
}

/**
 * Generate secure offline cash-out code.
 * 
 * Format: OFFLINE-{NONCE}-{RANDOM}
 * Example: OFFLINE-A1B2C3-X7Y9Z4
 * 
 * @param walletId - Wallet ID to cash out from
 * @param amount - Amount to cash out
 * @param method - Cash-out method (till, agent, merchant, atm)
 * @returns Secure offline code with metadata
 */
export async function generateOfflineCode(
  walletId: string,
  amount: number,
  method: 'till' | 'agent' | 'merchant' | 'atm'
): Promise<OfflineCode> {
  const db = await getDatabase();
  
  // Generate cryptographically secure nonce (device-specific)
  const nonceBytes = await Crypto.getRandomBytesAsync(4);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .substring(0, 6);
  
  // Generate random code segment
  const randomBytes = await Crypto.getRandomBytesAsync(4);
  const random = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .substring(0, 6);
  
  const code = `OFFLINE-${nonce}-${random}`;
  const transactionId = `offline_${Date.now()}_${nonce}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  
  // Store in offline_codes table
  await db.runAsync(
    `INSERT INTO offline_codes (code, transaction_id, wallet_id, amount, method, nonce, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [code, transactionId, walletId, amount, method, nonce, expiresAt.toISOString()]
  );
  
  // Queue for registration when online
  await queueOfflineCodeRegistration({
    code,
    nonce,
    transactionId,
    walletId,
    amount,
    method,
    expiresAt
  });
  
  return {
    code,
    nonce,
    transactionId,
    walletId,
    amount,
    method,
    expiresAt
  };
}

/**
 * Queue offline code for registration with backend when online.
 * 
 * @param offlineCode - Offline code metadata
 */
async function queueOfflineCodeRegistration(offlineCode: OfflineCode): Promise<void> {
  const db = await getDatabase();
  const idempotencyKey = `offline_code_register_${offlineCode.nonce}_${offlineCode.code}`;
  
  await db.runAsync(
    `INSERT INTO sync_queue (operation_type, entity_type, entity_id, payload, idempotency_key, status)
     VALUES ('register_offline_code', 'offline_code', ?, ?, ?, 'pending')`,
    [
      offlineCode.code,
      JSON.stringify(offlineCode),
      idempotencyKey
    ]
  );
}

/**
 * Get all pending offline codes for a wallet.
 * 
 * @param walletId - Wallet ID
 * @returns Array of pending offline codes
 */
export async function getPendingOfflineCodes(walletId: string): Promise<OfflineCode[]> {
  const db = await getDatabase();
  
  const results = await db.getAllAsync<any>(
    `SELECT * FROM offline_codes 
     WHERE wallet_id = ? AND status = 'pending' AND expires_at > datetime('now')
     ORDER BY created_at DESC`,
    [walletId]
  );
  
  return results.map(row => ({
    code: row.code,
    nonce: row.nonce,
    transactionId: row.transaction_id,
    walletId: row.wallet_id,
    amount: row.amount,
    method: row.method,
    expiresAt: new Date(row.expires_at)
  }));
}

/**
 * Mark offline code as used.
 * 
 * @param code - Offline code
 */
export async function markOfflineCodeAsUsed(code: string): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    `UPDATE offline_codes SET status = 'used', synced_at = CURRENT_TIMESTAMP WHERE code = ?`,
    [code]
  );
}

/**
 * Clean up expired offline codes.
 */
export async function cleanupExpiredCodes(): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    `UPDATE offline_codes SET status = 'expired' 
     WHERE status = 'pending' AND expires_at < datetime('now')`
  );
  
  // Delete expired codes older than 7 days
  await db.runAsync(
    `DELETE FROM offline_codes 
     WHERE status IN ('used', 'expired') AND expires_at < datetime('now', '-7 days')`
  );
}
