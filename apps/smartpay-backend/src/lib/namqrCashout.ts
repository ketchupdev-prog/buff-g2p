/**
 * NAMQR v5.0: QR code generation for cash-out transactions
 * Location: fintech/smartpay/backend/src/lib/namqrCashout.ts
 * Reference: NAMQR Standards v5.0 §4.6-4.12
 */
import crypto from 'crypto';
import { pool } from './db';

export interface NAMQRCashoutInput {
  tokenVaultId: string;
  payeeName: string;
  payeeCity: string;
  amount: number;
  currency: string;
  transactionRef: string;
  expiresAt: Date;
  merchantCategoryCode: string;
}

interface NAMQRPayload {
  [tag: string]: string;
}

/**
 * Generate NAMQR v5.0 compliant QR payload for cash-out
 * Reference: NAMQR Standards v5.0 §4.10 (Table 1)
 */
export function generateNAMQRCashoutPayload(input: NAMQRCashoutInput): NAMQRPayload {
  const payload: NAMQRPayload = {
    '00': '01', // Tag 00: Payload Format Indicator (NAMQR v5.0)
    '01': '14', // Tag 01: Point of initiation - 14 = Dynamic payer-presented (Request to Pay)
    '52': input.merchantCategoryCode, // Tag 52: Merchant Category Code
    '53': '516', // Tag 53: NAD currency code (ISO 4217)
    '54': input.amount.toFixed(2), // Tag 54: Transaction amount
    '58': 'NA', // Tag 58: Country code (ISO 3166-1 alpha-2)
    '59': input.payeeName.slice(0, 25), // Tag 59: Payee name (max 25 chars)
    '60': input.payeeCity.slice(0, 15), // Tag 60: Payee city (max 15 chars)
    '65': input.tokenVaultId, // Tag 65: Token Vault Unique Identifier (NAMQR §4.6)
  };

  // Tag 80: Globally unique identifier + initiation mode
  payload['80'] = encodeNAMQRTemplateTag({
    '00': 'na.com.smartpay.cashout',
    '01': '18', // Initiation mode 18 = ATM/agent QR
  });

  // Tag 82: Expiry (NAMQR §4.7)
  payload['82'] = encodeNAMQRTemplateTag({
    '00': 'na.com.smartpay',
    '02': formatNAMQRExpiry(input.expiresAt),
  });

  // Tag 27: Transaction reference
  payload['27'] = encodeNAMQRTemplateTag({
    '00': 'na.com.smartpay.ipp',
    '01': input.transactionRef,
  });

  // Tag 63: CRC-16 (must be last, per NAMQR §4.9)
  payload['63'] = calculateCRC16(payload);

  return payload;
}

/**
 * Encode NAMQR template tag (nested TLV)
 */
function encodeNAMQRTemplateTag(subTags: Record<string, string>): string {
  return Object.entries(subTags)
    .map(([tag, value]) => `${tag}${String(value.length).padStart(2, '0')}${value}`)
    .join('');
}

/**
 * Format expiry date for NAMQR Tag 82
 * Format: YYYYMMDDHHmm (ISO DateTime without separators)
 */
function formatNAMQRExpiry(date: Date): string {
  return date.toISOString().replace('T', '').replace(/[-:]/g, '').slice(0, 12);
}

/**
 * Calculate CRC-16/CCITT for NAMQR payload
 * Reference: NAMQR Standards v5.0 §4.9
 * Polynomial: 0x1021, Initial value: 0xFFFF
 */
function calculateCRC16(payload: NAMQRPayload): string {
  const data = Object.entries(payload)
    .filter(([tag]) => tag !== '63')
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tag, value]) => `${tag}${String(value.length).padStart(2, '0')}${value}`)
    .join('');

  const tagLength = '6304'; // Tag 63 + length 04
  const fullData = data + tagLength;
  let crc = 0xffff;

  for (let i = 0; i < fullData.length; i++) {
    crc ^= fullData.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate cryptographically secure Token Vault ID (NAMQR §4.6)
 * Format: XXXX-XXXX-XXXX-XXXX (alphanumeric, excluding confusing chars)
 * SECURITY: Uses crypto.randomInt instead of Math.random for true randomness
 */
function generateTokenVaultId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tokenVaultId = '';
  for (let i = 0; i < 16; i++) {
    // SECURITY: crypto.randomInt provides cryptographically secure random values
    tokenVaultId += chars[crypto.randomInt(0, chars.length)];
    if ((i + 1) % 4 === 0 && i < 15) tokenVaultId += '-';
  }
  return tokenVaultId;
}

/**
 * Generate cash-out QR code and store in token vault
 */
export async function generateCashoutQR(
  userId: string,
  walletId: string,
  amount: number,
  method: 'agent' | 'merchant'
): Promise<{ tokenVaultId: string; qrPayload: NAMQRPayload; qrString: string; expiresAt: Date }> {
  const tokenVaultId = generateTokenVaultId();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const transactionRef = crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();

  // Store in token vault
  await pool.query(
    `INSERT INTO token_vault
       (token_vault_id, namqr_payload, status, max_usage, expires_at, created_by)
     VALUES ($1, $2, 'active', 1, $3, $4)`,
    [
      tokenVaultId,
      JSON.stringify({ userId, walletId, amount, method, transactionRef }),
      expiresAt.toISOString(),
      userId,
    ]
  );

  const qrPayload = generateNAMQRCashoutPayload({
    tokenVaultId,
    payeeName: 'Smartpay Agent',
    payeeCity: 'Windhoek',
    amount,
    currency: 'NAD',
    transactionRef,
    expiresAt,
    merchantCategoryCode: '0000',
  });

  // Convert payload to QR string (TLV format)
  const qrString = Object.entries(qrPayload)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tag, value]) => `${tag}${String(value.length).padStart(2, '0')}${value}`)
    .join('');

  return { tokenVaultId, qrPayload, qrString, expiresAt };
}

/**
 * Validate NAMQR payload structure
 */
export function validateNAMQRPayload(qrString: string): { valid: boolean; error?: string } {
  try {
    if (qrString.length < 10) {
      return { valid: false, error: 'Payload too short' };
    }

    // Check Payload Format Indicator (Tag 00)
    if (!qrString.startsWith('0002')) {
      return { valid: false, error: 'Invalid payload format indicator' };
    }

    // Extract Tag 00 value
    const pfi = qrString.slice(4, 6);
    if (pfi !== '01') {
      return { valid: false, error: `Unsupported payload format version: ${pfi}` };
    }

    // Check CRC-16 (Tag 63) exists at end
    const crcIndex = qrString.lastIndexOf('6304');
    if (crcIndex === -1) {
      return { valid: false, error: 'Missing CRC-16 checksum' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid QR payload structure' };
  }
}
