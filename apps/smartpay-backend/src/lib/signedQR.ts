/**
 * NAMQR v5.0 Annexure I: Signed QR for verified transactions
 * Location: fintech/smartpay/backend/src/lib/signedQR.ts
 * Reference: NAMQR Standards v5.0 Annexure I, ETA 2019 §32
 */
import crypto from 'crypto';
import { pool } from './db';

export interface SignedQRInput {
  qrPayload: string;
  merchantId: string;
  agentCode?: string;
  terminalId?: string;
}

export interface SignedQRResult {
  signedPayload: string;
  signature: string;
  publicKeyId: string;
  timestamp: string;
  verified: boolean;
}

/**
 * Generate RSA key pair for QR signing (if not exists)
 */
export async function ensureSigningKeys(entityId: string): Promise<{ publicKey: string; privateKey: string; keyId: string }> {
  const existing = await pool.query(
    `SELECT key_id, public_key, private_key FROM signing_keys
     WHERE entity_id = $1 AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [entityId]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    const row = existing.rows[0] as { key_id: string; public_key: string; private_key: string };
    return {
      publicKey: row.public_key,
      privateKey: row.private_key,
      keyId: row.key_id,
    };
  }

  // Generate new RSA-2048 key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const keyId = `SK-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  await pool.query(
    `INSERT INTO signing_keys (key_id, entity_id, public_key, private_key, algorithm, is_active, created_at)
     VALUES ($1, $2, $3, $4, 'RSA-2048', true, NOW())`,
    [keyId, entityId, publicKey, privateKey]
  );

  return { publicKey, privateKey, keyId };
}

/**
 * Sign NAMQR payload with RSA-SHA256 (NAMQR Annexure I)
 */
export async function signNAMQRPayload(input: SignedQRInput): Promise<SignedQRResult> {
  const { qrPayload, merchantId, agentCode, terminalId } = input;

  // Get signing keys
  const keys = await ensureSigningKeys(merchantId);

  // Create signature payload (NAMQR Annexure I format)
  const timestamp = new Date().toISOString();
  const signingData = [
    qrPayload,
    merchantId,
    agentCode ?? '',
    terminalId ?? '',
    timestamp,
  ].join('||');

  // Sign with RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingData);
  sign.end();
  const signature = sign.sign(keys.privateKey, 'base64');

  // Construct signed payload (NAMQR Annexure I)
  // Format: {original_payload}|SIG|{signature}|KID|{key_id}|TS|{timestamp}
  const signedPayload = `${qrPayload}|SIG|${signature}|KID|${keys.keyId}|TS|${timestamp}`;

  // Log signature generation (ETA 2019 §32 digital evidence)
  await pool.query(
    `INSERT INTO qr_signature_log
       (merchant_id, agent_code, terminal_id, qr_payload, signature, key_id, timestamp, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [merchantId, agentCode ?? null, terminalId ?? null, qrPayload, signature, keys.keyId, timestamp]
  );

  return {
    signedPayload,
    signature,
    publicKeyId: keys.keyId,
    timestamp,
    verified: true,
  };
}

/**
 * Verify signed NAMQR payload (NAMQR Annexure I)
 */
export async function verifySignedNAMQRPayload(signedPayload: string): Promise<{ verified: boolean; error?: string; merchantId?: string }> {
  try {
    // Parse signed payload
    const parts = signedPayload.split('|');
    if (parts.length < 6) {
      return { verified: false, error: 'Invalid signed payload format' };
    }

    const qrPayload = parts[0];
    const signature = parts[2];
    const keyId = parts[4];
    const timestamp = parts[6];

    // Validate all required parts exist
    if (!signature || !keyId || !timestamp) {
      return { verified: false, error: 'Malformed signed QR data (missing signature, keyId, or timestamp)' };
    }

    // Check timestamp expiry (max 30 minutes)
    const timestampDate = new Date(timestamp);
    const now = new Date();
    const ageMinutes = (now.getTime() - timestampDate.getTime()) / (1000 * 60);
    if (ageMinutes > 30) {
      return { verified: false, error: 'Signed QR expired (>30 minutes old)' };
    }

    // Get public key
    const keyResult = await pool.query(
      `SELECT public_key, entity_id FROM signing_keys WHERE key_id = $1`,
      [keyId]
    );

    if (keyResult.rowCount === 0) {
      return { verified: false, error: 'Unknown signing key' };
    }

    const row = keyResult.rows[0];
    if (!row) {
      return { verified: false, error: 'Invalid signing key data' };
    }
    
    const publicKey = row.public_key as string;
    const merchantId = row.entity_id as string;

    // Reconstruct signing data
    const signingData = `${qrPayload}||${merchantId}|||${timestamp}`;

    // Verify signature with RSA-SHA256
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signingData);
    verify.end();
    const verified = verify.verify(publicKey, signature, 'base64');

    if (!verified) {
      return { verified: false, error: 'Signature verification failed' };
    }

    // Log verification (ETA 2019 §32 audit trail)
    await pool.query(
      `INSERT INTO qr_verification_log
         (key_id, merchant_id, qr_payload, signature, verification_result, verified_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [keyId, merchantId, qrPayload, signature, 'success']
    );

    return { verified: true, merchantId };
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error.message : 'Verification failed' };
  }
}

/**
 * Revoke signing key (for compromised keys)
 */
export async function revokeSigningKey(keyId: string, reason: string): Promise<void> {
  await pool.query(
    `UPDATE signing_keys
     SET is_active = false, revoked_at = NOW(), revocation_reason = $2
     WHERE key_id = $1`,
    [keyId, reason]
  );

  await pool.query(
    `INSERT INTO key_revocation_log (key_id, revoked_at, reason)
     VALUES ($1, NOW(), $2)`,
    [keyId, reason]
  );
}

/**
 * Get public key for verification (public endpoint)
 */
export async function getPublicKey(keyId: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT public_key FROM signing_keys
     WHERE key_id = $1 AND is_active = true`,
    [keyId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return (result.rows[0] as { public_key: string }).public_key;
}

/**
 * Generate signed QR data for cash-out operations
 */
export async function generateSignedQRData(data: {
  transactionId: string;
  userId: string;
  amount: number;
  type: string;
  agentCode?: string;
  atmId?: string;
  expiresAt: Date;
}): Promise<string> {
  const qrPayload = JSON.stringify({
    txnId: data.transactionId,
    userId: data.userId,
    amount: data.amount,
    type: data.type,
    agentCode: data.agentCode || 'any',
    atmId: data.atmId || 'any',
    expiresAt: data.expiresAt.toISOString()
  });

  const signedResult = await signNAMQRPayload({
    qrPayload,
    merchantId: 'smartpay-system',
    agentCode: data.agentCode,
    terminalId: data.atmId
  });

  return signedResult.signedPayload;
}
