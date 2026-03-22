/**
 * Test Database Helpers
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/test-database.ts
 * 
 * Purpose:
 * - Connect to real test database
 * - Create test data in setup
 * - Clean up test data in teardown
 * - Provide helpers for test users, wallets, vouchers
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/smartpay_test';

let testPool: Pool | null = null;
const testDataRegistry: {
  users: string[];
  wallets: string[];
  vouchers: string[];
  transactions: string[];
  groups: string[];
  consents: string[];
} = {
  users: [],
  wallets: [],
  vouchers: [],
  transactions: [],
  groups: [],
  consents: [],
};

/**
 * Initialize test database connection
 */
export async function initTestDatabase(): Promise<Pool> {
  if (testPool) return testPool;

  testPool = new Pool({
    connectionString: TEST_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  testPool.on('error', (err) => {
    console.error('[TestDB] Unexpected error on idle client:', err);
  });

  const isHealthy = await verifyDatabaseConnection();
  if (!isHealthy) {
    throw new Error('Test database connection failed');
  }

  console.log('✅ Test database connected');
  return testPool;
}

/**
 * Verify database connection
 */
async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    if (!testPool) return false;
    const result = await testPool.query('SELECT NOW()');
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('[TestDB] Health check failed:', error);
    return false;
  }
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
    console.log('✅ Test database connection closed');
  }
}

/**
 * Get test database pool
 */
export function getTestPool(): Pool {
  if (!testPool) {
    throw new Error('Test database not initialized. Call initTestDatabase() first.');
  }
  return testPool;
}

/**
 * Create test user in database
 */
export async function createTestUser(params?: {
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  smartpayId?: string;
}): Promise<{
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  smartpayId: string;
}> {
  const pool = getTestPool();
  const userId = uuidv4();
  const testPhone = params?.phone || `+264${Math.floor(Math.random() * 900000000 + 100000000)}`;
  const smartpayId = params?.smartpayId || `SP${String(testPhone).replace(/\D/g, '').slice(-8)}`;

  await pool.query(
    `INSERT INTO users (id, phone, email, first_name, last_name, smartpay_id, wallet_status, kyc_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', 'pending', NOW())`,
    [
      userId,
      testPhone,
      params?.email || null,
      params?.firstName || 'Test',
      params?.lastName || 'User',
      smartpayId,
    ]
  );

  testDataRegistry.users.push(userId);

  return {
    id: userId,
    phone: testPhone,
    email: params?.email || null,
    firstName: params?.firstName || 'Test',
    lastName: params?.lastName || 'User',
    smartpayId,
  };
}

/**
 * Create test wallet for user
 */
export async function createTestWallet(params: {
  userId: string;
  balance?: number;
  currency?: string;
  name?: string;
  isDefault?: boolean;
}): Promise<{
  id: string;
  userId: string;
  balance: number;
  currency: string;
  name: string;
}> {
  const pool = getTestPool();
  const walletId = uuidv4();
  const balance = params.balance ?? 1000;
  const currency = params.currency || 'NAD';
  const name = params.name || 'Test Wallet';

  await pool.query(
    `INSERT INTO wallets (id, user_id, balance, currency, name, status, is_default, created_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW())`,
    [walletId, params.userId, balance, currency, name, params.isDefault ?? true]
  );

  testDataRegistry.wallets.push(walletId);

  return {
    id: walletId,
    userId: params.userId,
    balance,
    currency,
    name,
  };
}

/**
 * Create test voucher for user
 */
export async function createTestVoucher(params: {
  userId: string;
  amount?: number;
  currency?: string;
  status?: 'pending' | 'redeemed' | 'expired';
  voucherType?: string;
  issuer?: string;
  expiresAt?: Date;
}): Promise<{
  id: string;
  voucherCode: string;
  amount: number;
  currency: string;
  status: string;
}> {
  const pool = getTestPool();
  const voucherId = uuidv4();
  const voucherCode = generateVoucherCode();
  const amount = params.amount ?? 500;
  const currency = params.currency || 'NAD';
  const status = params.status || 'pending';
  const expiresAt = params.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO vouchers 
      (id, user_id, voucher_code, amount, currency, status, voucher_type, issuer, issued_at, expires_at, redemption_method_allowed, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW())`,
    [
      voucherId,
      params.userId,
      voucherCode,
      amount,
      currency,
      status,
      params.voucherType || 'government_grant',
      params.issuer || 'test-issuer',
      expiresAt,
      JSON.stringify(['wallet', 'nampost', 'smartpay']),
    ]
  );

  testDataRegistry.vouchers.push(voucherId);

  return {
    id: voucherId,
    voucherCode,
    amount,
    currency,
    status,
  };
}

/**
 * Generate 12-digit voucher code
 */
function generateVoucherCode(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  return digits.join('');
}

/**
 * Create test transaction
 */
export async function createTestTransaction(params: {
  userId: string;
  type: string;
  amount: number;
  status?: string;
  walletId?: string;
  currency?: string;
}): Promise<{
  id: string;
  type: string;
  amount: number;
  status: string;
}> {
  const pool = getTestPool();
  const transactionId = uuidv4();

  await pool.query(
    `INSERT INTO transactions 
      (id, type, status, amount, fee, currency, destination_user_id, destination_wallet_id, description, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      transactionId,
      params.type,
      params.status || 'completed',
      params.amount,
      0,
      params.currency || 'NAD',
      params.userId,
      params.walletId || null,
      `Test transaction: ${params.type}`,
    ]
  );

  testDataRegistry.transactions.push(transactionId);

  return {
    id: transactionId,
    type: params.type,
    amount: params.amount,
    status: params.status || 'completed',
  };
}

/**
 * Create test group
 */
export async function createTestGroup(params: {
  name: string;
  createdBy: string;
  members?: string[];
}): Promise<{
  id: string;
  name: string;
  createdBy: string;
}> {
  const pool = getTestPool();
  const groupId = uuidv4();

  await pool.query(
    `INSERT INTO groups (id, name, created_by, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [groupId, params.name, params.createdBy]
  );

  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role, joined_at)
     VALUES ($1, $2, 'admin', NOW())`,
    [groupId, params.createdBy]
  );

  if (params.members) {
    for (const memberId of params.members) {
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())`,
        [groupId, memberId]
      );
    }
  }

  testDataRegistry.groups.push(groupId);

  return {
    id: groupId,
    name: params.name,
    createdBy: params.createdBy,
  };
}

/**
 * Get user wallet balance
 */
export async function getWalletBalance(walletId: string): Promise<number> {
  const pool = getTestPool();
  const result = await pool.query<{ balance: string }>(
    'SELECT balance FROM wallets WHERE id = $1',
    [walletId]
  );

  if (result.rowCount === 0) {
    throw new Error(`Wallet ${walletId} not found`);
  }

  return parseFloat(result.rows[0].balance);
}

/**
 * Get transaction by ID
 */
export async function getTransaction(transactionId: string): Promise<{
  id: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  currency: string;
} | null> {
  const pool = getTestPool();
  const result = await pool.query(
    `SELECT id, type, status, amount, fee, currency FROM transactions WHERE id = $1`,
    [transactionId]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    amount: parseFloat(row.amount),
    fee: parseFloat(row.fee),
    currency: row.currency,
  };
}

/**
 * Get voucher by ID
 */
export async function getVoucher(voucherId: string): Promise<{
  id: string;
  status: string;
  amount: number;
  redeemedAt: Date | null;
} | null> {
  const pool = getTestPool();
  const result = await pool.query(
    `SELECT id, status, amount, redeemed_at FROM vouchers WHERE id = $1`,
    [voucherId]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    status: row.status,
    amount: parseFloat(row.amount),
    redeemedAt: row.redeemed_at,
  };
}

/**
 * Get voucher by code
 */
export async function getVoucherByCode(voucherCode: string): Promise<{
  id: string;
  status: string;
  amount: number;
  userId: string;
} | null> {
  const pool = getTestPool();
  const result = await pool.query(
    `SELECT id, status, amount, user_id FROM vouchers WHERE voucher_code = $1`,
    [voucherCode]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    status: row.status,
    amount: parseFloat(row.amount),
    userId: row.user_id,
  };
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(): Promise<void> {
  const pool = getTestPool();

  try {
    await pool.query('BEGIN');

    if (testDataRegistry.transactions.length > 0) {
      await pool.query(
        `DELETE FROM transactions WHERE id = ANY($1::uuid[])`,
        [testDataRegistry.transactions]
      );
      console.log(`  ✓ Deleted ${testDataRegistry.transactions.length} test transactions`);
    }

    if (testDataRegistry.vouchers.length > 0) {
      await pool.query(
        `DELETE FROM vouchers WHERE id = ANY($1::uuid[])`,
        [testDataRegistry.vouchers]
      );
      console.log(`  ✓ Deleted ${testDataRegistry.vouchers.length} test vouchers`);
    }

    if (testDataRegistry.groups.length > 0) {
      await pool.query(
        `DELETE FROM group_members WHERE group_id = ANY($1::uuid[])`,
        [testDataRegistry.groups]
      );
      await pool.query(
        `DELETE FROM groups WHERE id = ANY($1::uuid[])`,
        [testDataRegistry.groups]
      );
      console.log(`  ✓ Deleted ${testDataRegistry.groups.length} test groups`);
    }

    if (testDataRegistry.wallets.length > 0) {
      await pool.query(
        `DELETE FROM wallets WHERE id = ANY($1::uuid[])`,
        [testDataRegistry.wallets]
      );
      console.log(`  ✓ Deleted ${testDataRegistry.wallets.length} test wallets`);
    }

    if (testDataRegistry.users.length > 0) {
      await pool.query(
        `DELETE FROM users WHERE id = ANY($1::uuid[])`,
        [testDataRegistry.users]
      );
      console.log(`  ✓ Deleted ${testDataRegistry.users.length} test users`);
    }

    await pool.query('COMMIT');

    testDataRegistry.users = [];
    testDataRegistry.wallets = [];
    testDataRegistry.vouchers = [];
    testDataRegistry.transactions = [];
    testDataRegistry.groups = [];
    testDataRegistry.consents = [];

    console.log('✅ Test data cleanup complete');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('[TestDB] Cleanup error:', error);
    throw error;
  }
}

/**
 * Generate JWT token for test user (matches backend JWT generation)
 */
export function generateTestToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Execute transaction with rollback capability
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getTestPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
  conditionFn: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

/**
 * Get test data registry (for debugging)
 */
export function getTestDataRegistry() {
  return { ...testDataRegistry };
}
