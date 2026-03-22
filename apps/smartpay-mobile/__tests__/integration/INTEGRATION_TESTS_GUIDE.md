# SmartPay Mobile Integration Tests - Complete Guide

## Philosophy: No Mocks, Real Everything

These integration tests use **REAL** implementations:
- ✅ Real HTTP calls to SmartPay Backend (localhost:4000)
- ✅ Real PostgreSQL database (Neon)
- ✅ Real webhook processing with HMAC signatures
- ✅ Real transaction creation and balance updates
- ✅ Real portal integration (Ketchup Portals)
- ❌ NO mocked fetch
- ❌ NO mocked services
- ❌ NO mocked database

## Quick Start

### 1. Setup Test Database

```bash
# Create test database
createdb smartpay_test

# Run migrations
cd ../smartpay-backend
npm run migrate
```

### 2. Configure Environment

```bash
# Copy test environment file
cp .env.test .env.test.local

# Edit and set your test database URL
nano .env.test.local
```

Required variables:
```env
TEST_DATABASE_URL=postgresql://localhost:5432/smartpay_test
JWT_SECRET=your-test-jwt-secret
BUFFR_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- real-send-money.integration.test.ts

# Run with coverage
npm run test:integration:coverage

# Run in watch mode
npm run test:integration:watch
```

## Test Architecture

### Directory Structure

```
__tests__/integration/
├── setup/
│   ├── test-database.ts         # Database helpers
│   ├── test-servers.ts          # Server management
│   ├── api-client.ts            # HTTP client helpers
│   ├── types.ts                 # TypeScript types
│   ├── jest.setup.ts            # Jest configuration
│   ├── global-setup.ts          # Start servers
│   ├── global-teardown.ts       # Stop servers
│   └── cleanup.js               # Manual cleanup script
├── real-auth.integration.test.ts
├── real-voucher-flow.integration.test.ts
├── real-send-money.integration.test.ts
├── real-cash-out.integration.test.ts
├── real-webhook.integration.test.ts
├── real-open-banking.integration.test.ts
├── real-wallets.integration.test.ts
├── real-transactions.integration.test.ts
└── real-groups.integration.test.ts
```

### Test Lifecycle

```
┌─────────────────────────────────────────┐
│ Global Setup (once)                     │
│ - Start backend server                  │
│ - Connect to database                   │
│ - Verify health                         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Before All (per suite)                  │
│ - Initialize database connection        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Test 1                                  │
│ - Setup: Create test data               │
│ - Execute: Call real APIs               │
│ - Assert: Verify DB + responses         │
│ - Cleanup: Delete test data             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Test 2                                  │
│ - Setup: Create test data               │
│ - Execute: Call real APIs               │
│ - Assert: Verify DB + responses         │
│ - Cleanup: Delete test data             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ After All (per suite)                   │
│ - Final cleanup                         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Global Teardown (once)                  │
│ - Stop backend server                   │
│ - Close database connections            │
└─────────────────────────────────────────┘
```

## Database Helpers Reference

### Test Data Creation

```typescript
// Create test user
const user = await createTestUser({
  phone: '+264811234567',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  smartpayId: 'SP12345678', // Optional, auto-generated
});

// Create wallet with balance
const wallet = await createTestWallet({
  userId: user.id,
  balance: 1000,
  currency: 'NAD',
  name: 'Test Wallet',
  isDefault: true,
});

// Create voucher
const voucher = await createTestVoucher({
  userId: user.id,
  amount: 500,
  currency: 'NAD',
  status: 'pending',
  voucherType: 'government_grant',
  issuer: 'test-issuer',
});

// Create transaction
const transaction = await createTestTransaction({
  userId: user.id,
  walletId: wallet.id,
  type: 'p2p_transfer',
  amount: 100,
  status: 'completed',
});

// Create group
const group = await createTestGroup({
  name: 'Test Group',
  createdBy: user.id,
  members: [member1.id, member2.id],
});
```

### Test Data Queries

```typescript
// Get wallet balance
const balance = await getWalletBalance(walletId);

// Get transaction
const tx = await getTransaction(transactionId);

// Get voucher by ID
const voucher = await getVoucher(voucherId);

// Get voucher by code
const voucher = await getVoucherByCode('123456789012');
```

### Authentication

```typescript
// Generate JWT token for user
const token = generateTestToken(user.id);

// Use token in API calls
const response = await axios.get(`${BACKEND_URL}/api/v1/wallets`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Webhooks

```typescript
// Generate HMAC signature
const payloadString = JSON.stringify(payload);
const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

// Send webhook with signature
await axios.post(
  `${BACKEND_URL}/api/buffr/webhooks`,
  payload,
  {
    headers: {
      'X-Buffr-Signature': signature,
      'X-Buffr-Event-Id': `event-${Date.now()}`,
      'X-Buffr-Event-Type': 'voucher.issued',
    },
  }
);
```

### Cleanup

```typescript
// Automatic cleanup after each test
afterEach(async () => {
  await cleanupTestData();
});

// Manual cleanup if needed
await cleanupTestData();
```

## API Client Helpers

Use `TestApiClient` to reduce boilerplate:

```typescript
import { createTestApiClient } from './setup/api-client';

it('should send money using API client', async () => {
  const sender = await createTestUser();
  const recipient = await createTestUser();
  await createTestWallet({ userId: sender.id, balance: 1000 });
  
  const token = generateTestToken(sender.id);
  const client = createTestApiClient(token);

  const response = await client.sendMoney({
    amount: 200,
    beneficiaryPhone: recipient.phone,
    sourceWalletId: wallet.id,
  });

  expect(response.success).toBe(true);
});
```

Available methods:
- `client.sendMoney()`
- `client.getWallets()`
- `client.getWallet(walletId)`
- `client.createWallet()`
- `client.getVouchers()`
- `client.redeemVoucher()`
- `client.cashOutToAgent()`
- `client.cashOutToBank()`
- `client.getTransactions()`
- `client.createGroup()`
- `client.createSplit()`
- `client.paySplit()`

## Test Patterns

### Pattern 1: Complete Flow Test

Test entire user journey from start to finish:

```typescript
it('should complete full voucher redemption flow', async () => {
  // 1. Setup: Create test user and wallet
  const user = await createTestUser({ phone: '+264811234567' });
  const wallet = await createTestWallet({ userId: user.id, balance: 100 });
  
  // 2. Webhook: Simulate voucher issuance from Ketchup
  const voucherId = crypto.randomUUID();
  const voucherCode = '123456789012';
  const webhookPayload = { /* ... */ };
  const signature = generateWebhookSignature(JSON.stringify(webhookPayload), WEBHOOK_SECRET);
  
  await axios.post(`${BACKEND_URL}/api/buffr/webhooks`, webhookPayload, {
    headers: {
      'X-Buffr-Signature': signature,
      'X-Buffr-Event-Id': `event-${Date.now()}`,
      'X-Buffr-Event-Type': 'voucher.issued',
    },
  });
  
  // 3. Wait: Ensure webhook processed
  await waitForCondition(async () => {
    const v = await getVoucherByCode(voucherCode);
    return v !== null;
  }, 5000);
  
  // 4. Mobile: List vouchers
  const token = generateTestToken(user.id);
  const listResponse = await axios.get(`${BACKEND_URL}/api/v1/vouchers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  expect(listResponse.data.data.vouchers).toHaveLength(1);
  
  // 5. Mobile: Redeem voucher
  const redeemResponse = await axios.post(
    `${BACKEND_URL}/api/v1/vouchers/redeem`,
    { voucherCode },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  expect(redeemResponse.data.success).toBe(true);
  
  // 6. Verify: Check wallet balance updated
  const finalBalance = await getWalletBalance(wallet.id);
  expect(finalBalance).toBe(100 + 1000); // Initial + voucher amount
  
  // 7. Verify: Check voucher status changed
  const finalVoucher = await getVoucherByCode(voucherCode);
  expect(finalVoucher!.status).toBe('redeemed');
});
```

### Pattern 2: Error Handling Test

Verify error responses and database consistency:

```typescript
it('should reject invalid operation and maintain database consistency', async () => {
  const user = await createTestUser();
  const wallet = await createTestWallet({ userId: user.id, balance: 50 });
  
  const initialBalance = await getWalletBalance(wallet.id);
  const token = generateTestToken(user.id);
  
  try {
    await axios.post(
      `${BACKEND_URL}/api/v1/send-money`,
      {
        amount: 100, // More than balance
        beneficiaryPhone: '+264811111111',
        sourceWalletId: wallet.id,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fail('Should have rejected insufficient balance');
  } catch (error: any) {
    expect(error.response.status).toBe(422);
    expect(error.response.data.error.message).toContain('Insufficient');
  }
  
  const finalBalance = await getWalletBalance(wallet.id);
  expect(finalBalance).toBe(initialBalance); // Balance unchanged
});
```

### Pattern 3: Webhook Processing Test

Test webhook with signature verification:

```typescript
it('should process webhook with valid signature', async () => {
  const payload = {
    type: 'transaction.completed',
    data: { id: 'tx-123', status: 'completed' },
    timestamp: new Date().toISOString(),
  };
  
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);
  
  const response = await axios.post(
    `${BACKEND_URL}/api/buffr/webhooks`,
    payload,
    {
      headers: {
        'X-Buffr-Signature': signature,
        'X-Buffr-Event-Id': `event-${Date.now()}`,
        'X-Buffr-Event-Type': 'transaction.completed',
      },
    }
  );
  
  expect(response.status).toBe(200);
  expect(response.data.success).toBe(true);
});
```

### Pattern 4: Async Operation with Polling

Wait for async operations to complete:

```typescript
it('should complete async operation', async () => {
  // Trigger operation
  const response = await axios.post(/* ... */);
  const transactionId = response.data.data.transactionId;
  
  // Poll until completed
  const isCompleted = await waitForCondition(async () => {
    const tx = await getTransaction(transactionId);
    return tx !== null && tx.status === 'completed';
  }, 5000); // 5 second timeout
  
  expect(isCompleted).toBe(true);
  
  // Verify final state
  const transaction = await getTransaction(transactionId);
  expect(transaction!.amount).toBe(100);
});
```

### Pattern 5: Concurrent Operations Test

Test race conditions and database consistency:

```typescript
it('should handle concurrent operations', async () => {
  const user = await createTestUser();
  const wallet = await createTestWallet({ userId: user.id, balance: 1000 });
  const token = generateTestToken(user.id);
  
  // Execute multiple operations simultaneously
  const operations = [
    axios.post(`${BACKEND_URL}/api/v1/send-money`, { amount: 300, ... }, { headers: { Authorization: `Bearer ${token}` } }),
    axios.post(`${BACKEND_URL}/api/v1/send-money`, { amount: 400, ... }, { headers: { Authorization: `Bearer ${token}` } }),
    axios.post(`${BACKEND_URL}/api/v1/send-money`, { amount: 500, ... }, { headers: { Authorization: `Bearer ${token}` } }),
  ];
  
  const results = await Promise.allSettled(operations);
  
  // Some should succeed, some should fail (insufficient balance)
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;
  
  expect(successCount).toBeGreaterThanOrEqual(1);
  expect(successCount + failureCount).toBe(3);
  
  // Verify final balance is consistent
  const finalBalance = await getWalletBalance(wallet.id);
  expect(finalBalance).toBeGreaterThanOrEqual(0);
  expect(finalBalance).toBeLessThanOrEqual(1000);
});
```

## Writing New Tests

### Step 1: Import Required Helpers

```typescript
import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  createTestWallet,
  generateTestToken,
  getWalletBalance,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();
```

### Step 2: Setup and Teardown

```typescript
describe('My New Integration Test', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData(); // Clean after each test
  });
});
```

### Step 3: Write Test

```typescript
it('should do something with real APIs', async () => {
  // 1. Create test data
  const user = await createTestUser();
  const wallet = await createTestWallet({ userId: user.id, balance: 1000 });
  
  // 2. Generate auth token
  const token = generateTestToken(user.id);
  
  // 3. Call real API
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/some-endpoint`,
    { data: 'test' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  // 4. Assert API response
  expect(response.status).toBe(200);
  expect(response.data.success).toBe(true);
  
  // 5. Verify database state
  const finalBalance = await getWalletBalance(wallet.id);
  expect(finalBalance).toBe(/* expected value */);
});
```

## Common Test Scenarios

### Testing Send Money

```typescript
it('should complete send money with balance update', async () => {
  const sender = await createTestUser({ phone: '+264811111111' });
  const senderWallet = await createTestWallet({ userId: sender.id, balance: 1000 });
  
  const recipient = await createTestUser({ phone: '+264822222222' });
  await createTestWallet({ userId: recipient.id, balance: 0 });
  
  const token = generateTestToken(sender.id);
  
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/send-money`,
    {
      amount: 200,
      beneficiaryPhone: recipient.phone,
      sourceWalletId: senderWallet.id,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  expect(response.status).toBe(200);
  
  const senderBalance = await getWalletBalance(senderWallet.id);
  expect(senderBalance).toBeLessThan(1000); // Deducted amount + fee
});
```

### Testing Voucher Redemption

```typescript
it('should redeem voucher and credit wallet', async () => {
  const user = await createTestUser();
  const wallet = await createTestWallet({ userId: user.id, balance: 100 });
  const voucher = await createTestVoucher({ userId: user.id, amount: 500 });
  
  const token = generateTestToken(user.id);
  
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/vouchers/redeem`,
    { voucherCode: voucher.voucherCode },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  expect(response.status).toBe(200);
  expect(response.data.data.newBalance).toBe(600);
  
  const finalBalance = await getWalletBalance(wallet.id);
  expect(finalBalance).toBe(600);
});
```

### Testing Webhooks

```typescript
it('should process webhook with HMAC signature', async () => {
  const user = await createTestUser();
  const voucherId = crypto.randomUUID();
  
  const payload = {
    id: voucherId,
    type: 'voucher_issuance',
    data: {
      voucher_id: voucherId,
      user_id: user.id,
      amount: 1000,
    },
    timestamp: new Date().toISOString(),
  };
  
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);
  
  const response = await axios.post(
    `${BACKEND_URL}/api/buffr/webhooks`,
    payload,
    {
      headers: {
        'X-Buffr-Signature': signature,
        'X-Buffr-Event-Id': `event-${Date.now()}`,
        'X-Buffr-Event-Type': 'voucher.issued',
      },
    }
  );
  
  expect(response.status).toBe(200);
  
  // Verify webhook processed
  const isProcessed = await waitForCondition(async () => {
    const v = await getVoucherByCode(payload.data.voucher_code);
    return v !== null;
  }, 5000);
  
  expect(isProcessed).toBe(true);
});
```

### Testing Cash-Out

```typescript
it('should cash out to agent', async () => {
  const user = await createTestUser();
  const wallet = await createTestWallet({ userId: user.id, balance: 2000 });
  
  const token = generateTestToken(user.id);
  const initialBalance = await getWalletBalance(wallet.id);
  
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/cash-out/agent`,
    {
      walletId: wallet.id,
      amount: 500,
      agentCode: 'AG-WDH-001',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  expect(response.status).toBe(200);
  expect(response.data.data.qrCode).toBeDefined();
  
  const finalBalance = await getWalletBalance(wallet.id);
  const fee = 500 * 0.02; // 2% cash-out fee
  expect(finalBalance).toBe(initialBalance - 500 - fee);
});
```

## Debugging Tests

### Enable Verbose Output

```bash
npm run test:integration -- --verbose
```

### Run Single Test

```bash
npm run test:integration -- -t "should redeem voucher"
```

### Inspect Database During Test

Add breakpoint and run:
```typescript
it('should test something', async () => {
  const user = await createTestUser();
  const wallet = await createTestWallet({ userId: user.id });
  
  // Add debugger here to inspect database
  debugger;
  
  // Continue test...
});
```

Then connect to database:
```bash
psql smartpay_test
SELECT * FROM users WHERE phone LIKE '+26481%';
SELECT * FROM wallets WHERE user_id = 'user-id-here';
```

### Check Webhook Events

```sql
SELECT 
  event_id,
  event_type,
  received_at,
  processed_at,
  payload->>'status' as status
FROM buffr_webhook_events
ORDER BY received_at DESC
LIMIT 10;
```

### View Transaction History

```sql
SELECT 
  id,
  type,
  status,
  amount,
  fee,
  created_at
FROM transactions
WHERE destination_user_id = 'user-id-here'
ORDER BY created_at DESC;
```

## Troubleshooting

### Issue: Tests Timeout

**Solution:**
- Increase timeout: `jest.setTimeout(60000)`
- Check backend server is running: `curl http://localhost:4000/health`
- Verify database queries: enable `ENABLE_QUERY_LOGGING=true`

### Issue: Database Connection Failed

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep smartpay_test

# Create database if missing
createdb smartpay_test

# Run migrations
cd ../smartpay-backend
npm run migrate
```

### Issue: Backend Server Won't Start

**Solution:**
```bash
# Check port availability
lsof -i :4000
kill -9 <PID>

# Start backend manually
cd ../smartpay-backend
npm run dev

# Check logs for errors
```

### Issue: Cleanup Failures

**Solution:**
```bash
# Manual cleanup script
npm run test:cleanup

# Or directly in database
psql smartpay_test -c "DELETE FROM transactions WHERE created_at > NOW() - INTERVAL '1 hour';"
psql smartpay_test -c "DELETE FROM vouchers WHERE created_at > NOW() - INTERVAL '1 hour';"
psql smartpay_test -c "DELETE FROM wallets WHERE created_at > NOW() - INTERVAL '1 hour';"
psql smartpay_test -c "DELETE FROM users WHERE created_at > NOW() - INTERVAL '1 hour';"
```

### Issue: Rate Limiting Interfering

**Solution:**
- Increase rate limits in `.env.test`:
  ```env
  RATE_LIMIT_MAX_REQUESTS=1000
  RATE_LIMIT_WINDOW_MS=60000
  ```
- Or disable for tests:
  ```env
  RATE_LIMIT_ENABLED=false
  ```

## Best Practices

### ✅ Test Isolation

Each test should be completely independent:
```typescript
it('test 1', async () => {
  const user1 = await createTestUser(); // Unique user
  // ... test logic ...
});

it('test 2', async () => {
  const user2 = await createTestUser(); // Different unique user
  // ... test logic ...
});
```

### ✅ Unique Identifiers

Use timestamps or UUIDs to avoid conflicts:
```typescript
const uniquePhone = `+26481${Date.now().toString().slice(-8)}`;
const eventId = `event-${Date.now()}-${Math.random()}`;
```

### ✅ Cleanup After Each Test

```typescript
afterEach(async () => {
  await cleanupTestData(); // Always cleanup
});
```

### ✅ Verify Both API and Database

```typescript
// Verify API response
expect(response.data.success).toBe(true);

// Verify database state
const dbRecord = await getWalletBalance(walletId);
expect(dbRecord).toBe(expectedValue);
```

### ✅ Test Error Cases

```typescript
it('should handle error gracefully', async () => {
  try {
    await axios.post(/* invalid request */);
    fail('Should have thrown error');
  } catch (error: any) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.success).toBe(false);
  }
});
```

## Performance Considerations

- Tests run **sequentially** (`maxWorkers: 1`) to avoid database conflicts
- Each test typically takes 1-5 seconds
- Full suite takes 2-5 minutes
- Use `waitForCondition` with reasonable timeouts (5s max)
- Clean up test data promptly to keep database lean

## Security Testing

All tests verify:
- ✅ JWT authentication required
- ✅ HMAC signature validation on webhooks
- ✅ Idempotency protection
- ✅ Rate limiting enforcement
- ✅ Authorization (user can only access their data)
- ✅ Input validation (amounts, phone numbers, codes)

## Coverage Reporting

```bash
# Generate coverage report
npm run test:integration:coverage

# View HTML report
open coverage/integration/lcov-report/index.html
```

Target coverage:
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

## CI/CD Integration

These tests are designed to run in CI/CD pipelines with:
- PostgreSQL service container
- Environment variables from secrets
- Parallel job isolation
- Failure notifications

See `README.md` for GitHub Actions example.

## Next Steps

1. **Run the tests:**
   ```bash
   npm run test:integration
   ```

2. **Fix any failures:**
   - Check database migrations are current
   - Verify environment variables
   - Ensure backend server starts correctly

3. **Add more tests:**
   - Use existing patterns as templates
   - Test new features as they're added
   - Maintain high coverage

4. **Monitor in CI:**
   - Add to GitHub Actions
   - Set up failure notifications
   - Track test execution time

## Support

For issues or questions:
1. Check this guide
2. Review test patterns in existing files
3. Check backend logs for API errors
4. Inspect database state for data issues
5. Verify environment configuration
