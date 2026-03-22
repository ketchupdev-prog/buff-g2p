/**
 * Secure Code Generation Utility
 * Location: backend/src/lib/secureCodeGenerator.ts
 * 
 * Provides cryptographically secure code generation with collision detection
 * to prevent race conditions and predictable code attacks.
 * 
 * SECURITY: Uses crypto.randomInt instead of Math.random for true randomness
 */

import crypto from 'crypto';
import { PoolClient } from 'pg';

export interface SecureCodeOptions {
  length: number; // Code length (e.g., 6 for 6-digit PIN)
  format: 'numeric' | 'alphanumeric' | 'hex';
  checkUniqueness?: boolean; // Default: false
  tableName?: string; // Required if checkUniqueness = true
  columnPath?: string; // JSON path (e.g., "metadata->>'offlineCode'") or column name
  client?: PoolClient; // Required if checkUniqueness = true
  maxAttempts?: number; // Default: 5
}

/**
 * Generate a cryptographically secure random code
 * 
 * @param options - Code generation options
 * @returns Secure random code
 * 
 * @example
 * // 6-digit numeric PIN
 * const pin = await generateSecureCode({
 *   length: 6,
 *   format: 'numeric'
 * });
 * 
 * @example
 * // 8-character alphanumeric with uniqueness check
 * const code = await generateSecureCode({
 *   length: 8,
 *   format: 'alphanumeric',
 *   checkUniqueness: true,
 *   tableName: 'transactions',
 *   columnPath: "metadata->>'collectionCode'",
 *   client: dbClient
 * });
 */
export async function generateSecureCode(options: SecureCodeOptions): Promise<string> {
  const {
    length,
    format,
    checkUniqueness = false,
    tableName,
    columnPath,
    client,
    maxAttempts = 5
  } = options;

  // Validation
  if (checkUniqueness && (!tableName || !columnPath || !client)) {
    throw new Error('tableName, columnPath, and client are required when checkUniqueness is true');
  }

  let attempts = 0;

  while (attempts < maxAttempts) {
    let code: string;

    // Generate code based on format
    switch (format) {
      case 'numeric': {
        // Generate N-digit numeric code
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length);
        code = crypto.randomInt(min, max).toString();
        break;
      }

      case 'alphanumeric': {
        // Generate alphanumeric code (A-Z, 0-9)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const bytes = crypto.randomBytes(length);
        code = Array.from(bytes)
          .map(byte => chars[byte % chars.length])
          .join('');
        break;
      }

      case 'hex': {
        // Generate hex code
        code = crypto.randomBytes(Math.ceil(length / 2))
          .toString('hex')
          .slice(0, length)
          .toUpperCase();
        break;
      }

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Check uniqueness if requested
    if (checkUniqueness && client) {
      const query = `
        SELECT 1 FROM ${tableName}
        WHERE ${columnPath} = $1
          AND created_at > NOW() - INTERVAL '24 hours'
          AND status = 'pending'
        LIMIT 1
      `;

      const result = await client.query(query, [code]);

      if (result.rowCount === 0) {
        // Code is unique!
        return code;
      }

      // Collision detected, retry
      attempts++;
      continue;
    }

    // No uniqueness check required, return immediately
    return code;
  }

  throw new Error(`Failed to generate unique code after ${maxAttempts} attempts. Please try again.`);
}

/**
 * Generate a 6-digit numeric PIN (e.g., for till cash-out, ATM, SMS OTP)
 * Common use case wrapper
 */
export async function generate6DigitPIN(
  checkUniqueness: boolean = false,
  client?: PoolClient,
  tableName?: string,
  columnPath?: string
): Promise<string> {
  return generateSecureCode({
    length: 6,
    format: 'numeric',
    checkUniqueness,
    client,
    tableName,
    columnPath
  });
}

/**
 * Generate an 8-character alphanumeric code (e.g., for NamPost voucher collection)
 * Common use case wrapper
 */
export async function generate8CharCode(
  checkUniqueness: boolean = false,
  client?: PoolClient,
  tableName?: string,
  columnPath?: string
): Promise<string> {
  return generateSecureCode({
    length: 8,
    format: 'alphanumeric',
    checkUniqueness,
    client,
    tableName,
    columnPath
  });
}
