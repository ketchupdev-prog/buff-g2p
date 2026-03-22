# Integration Test Execution Guide

Complete guide for running SmartPay Mobile's real integration tests with actual APIs, database, and webhooks.

---

## Prerequisites

### 1. Environment Setup

#### Database Setup
```bash
# Create test database (if not exists)
createdb smartpay_test

# Or connect to Neon test database
# Update TEST_DATABASE_URL in .env.test with your Neon connection string
```

#### Environment File
Copy `.env.test` and verify all values:
```bash
# Required variables:
TEST_BACKEND_URL=http://localhost:4000
TEST_DATABASE_URL=postgresql://localhost:5432/smartpay_test
JWT_SECRET=test-jwt-secret-key-for-integration-tests
BUFFR_WEBHOOK_SECRET=test-webhook-secret-hmac-key-12345
```

#### Install Dependencies
```bash
npm install
# Installs: pg, dotenv, uuid, axios, jest, ts-jest
```

---

## Running Tests

### Quick Start - Run All Tests
```bash
npm run test:integration
```

### Run Specific Test Suite
```bash
# Voucher flow
npm run test:integration -- real-voucher-flow.integration.test.ts

# Send money
npm run test:integration -- real-send-money.integration.test.ts

# Open Banking
npm run test:integration -- real-open-banking.integration.test.ts

# Webhooks
npm run test:integration -- real-webhook.integration.test.ts

# Cash-out
npm run test:integration -- real-cash-out.integration.test.ts

# Wallets
npm run test:integration -- real-wallets.integration.test.ts

# Transactions
npm run test:integration -- real-transactions.integration.test.ts

# Authentication
npm run test:integration -- real-auth.integration.test.ts

# Groups
npm run test:integration -- real-groups.integration.test.ts

# KYC
npm run test:integration -- real-kyc.integration.test.ts

# Notifications
npm run test:integration -- real-notifications.integration.test.ts

# Profile
npm run test:integration -- real-profile.integration.test.ts
```

### Run with Coverage
```bash
npm run test:integration:coverage
```

### Watch Mode (for development)
```bash
npm run test:integration:watch
```

---

## Test Execution Flow

### What Happens When You Run Tests

```
┌─────────────────────────────────────┐
│  1. Global Setup                    │
│  - Load .env.test                   │
│  - Connect to test database         │
│  - Start SmartPay Backend server    │
│  - Wait for server health check     │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Run Each Test Suite             │
│  (Sequential, one at a time)        │
│                                     │
│  For each test:                     │
│  - Setup: Create test data in DB    │
│  - Execute: Call real APIs          │
│  - Assert: Verify DB + responses    │
│  - Cleanup: Delete test data        │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Global Teardown                 │
│  - Final cleanup of test data       │
│  - Close database connection        │
│  - Stop backend server              │
└─────────────────────────────────────┘
```

### Sequential Execution
Tests run **one at a time** (maxWorkers: 1) to prevent database conflicts. This ensures:
- No race conditions on shared test data
- Predictable database state
- Reliable test results

---

## Troubleshooting

### Backend Server Not Starting

**Symptom**: Tests fail immediately with connection refused
```
Error: connect ECONNREFUSED 127.0.0.1:4000
```

**Solution**:
1. Check if port 4000 is already in use:
   ```bash
   lsof -i :4000
   ```

2. Kill existing process if needed:
   ```bash
   kill -9 <PID>
   ```

3. Manually start backend:
   ```bash
   cd ../smartpay-backend
   npm run dev
   ```

4. Wait for "Server listening on port 4000" message

---

### Database Connection Errors

**Symptom**: Tests fail with database connection errors
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
1. Verify PostgreSQL is running:
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. Check test database exists:
   ```bash
   psql -U postgres -l | grep smartpay_test
   ```

3. Create if missing:
   ```bash
   createdb smartpay_test
   ```

4. Verify connection string in `.env.test`:
   ```bash
   TEST_DATABASE_URL=postgresql://localhost:5432/smartpay_test
   ```

For **Neon database**:
- Ensure you have correct connection string from Neon Console
- Check if IP is allowed in Neon security settings
- Verify SSL requirements (append `?sslmode=require` if needed)

---

### Test Data Not Cleaned Up

**Symptom**: Tests fail on second run due to duplicate data
```
Error: duplicate key value violates unique constraint
```

**Solution**:
1. Run manual cleanup script:
   ```bash
   node __tests__/integration/setup/cleanup.js
   ```

2. Or manually delete test data:
   ```sql
   -- Connect to database
   psql postgresql://localhost:5432/smartpay_test
   
   -- Delete recent test data
   DELETE FROM transactions WHERE created_at > NOW() - INTERVAL '1 hour';
   DELETE FROM vouchers WHERE created_at > NOW() - INTERVAL '1 hour';
   DELETE FROM wallets WHERE created_at > NOW() - INTERVAL '1 hour';
   DELETE FROM users WHERE phone LIKE '+26481%' AND created_at > NOW() - INTERVAL '1 hour';
   ```

---

### Tests Hanging or Timing Out

**Symptom**: Tests run but never complete
```
Jest did not exit one second after the test run has completed
```

**Solution**:
1. Check for open database connections:
   ```typescript
   // Ensure all tests call cleanupTestData() in afterEach
   afterEach(async () => {
     await cleanupTestData();
   });
   ```

2. Force exit enabled in config:
   ```javascript
   // jest.integration.config.js
   forceExit: true,
   detectOpenHandles: true,
   ```

3. Increase timeout for slow tests:
   ```typescript
   it('should complete slow operation', async () => {
     // test code
   }, 60000); // 60 second timeout
   ```

---

### HMAC Signature Validation Errors

**Symptom**: Webhook tests fail with invalid signature
```
Error: Invalid webhook signature
```

**Solution**:
1. Verify webhook secret matches in:
   - `.env.test`: `BUFFR_WEBHOOK_SECRET`
   - Test code: `generateWebhookSignature()` function

2. Check signature generation:
   ```typescript
   import crypto from 'crypto';
   
   const signature = crypto
     .createHmac('sha256', process.env.BUFFR_WEBHOOK_SECRET!)
     .update(JSON.stringify(payload))
     .digest('hex');
   ```

3. Ensure payload is stringified consistently

---

### Rate Limiting Issues

**Symptom**: Tests fail with 429 Too Many Requests
```
Error: Rate limit exceeded
```

**Solution**:
1. Increase rate limits in `.env.test`:
   ```
   RATE_LIMIT_MAX_REQUESTS=1000
   RATE_LIMIT_WINDOW_MS=60000
   ```

2. Add delays between tests if needed:
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 1000));
   ```

3. Disable rate limiting for tests:
   ```
   RATE_LIMIT_ENABLED=false
   ```

---

## Performance Tips

### Run Subset of Tests
```bash
# Run only wallet tests
npm run test:integration -- real-wallets

# Run only first 5 tests
npm run test:integration -- --maxWorkers=1 --bail=5
```

### Skip Slow Tests During Development
```typescript
describe.skip('Slow test suite', () => {
  // These tests will be skipped
});

it.skip('should do slow operation', async () => {
  // This test will be skipped
});
```

### Parallel Execution (Advanced)
```bash
# Run tests in parallel (use with caution)
# Only if tests are completely isolated
npm run test:integration -- --maxWorkers=4
```

⚠️ **Warning**: Parallel execution may cause race conditions. Only use if you've verified tests are fully isolated.

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: smartpay_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          psql postgresql://postgres:postgres@localhost:5432/smartpay_test -c "SELECT 1"
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/smartpay_test
          JWT_SECRET: test-jwt-secret
          BUFFR_WEBHOOK_SECRET: test-webhook-secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/integration/lcov.info
```

---

## Debugging Tips

### Enable Verbose Logging
```bash
# Run with verbose output
npm run test:integration -- --verbose

# Show all console.log statements
npm run test:integration -- --silent=false
```

### Debug Single Test
```bash
# Run only one test by name
npm run test:integration -- -t "should redeem voucher"
```

### Inspect Database State
```bash
# While tests are running (in another terminal)
psql postgresql://localhost:5432/smartpay_test

# Check users
SELECT id, phone, first_name, created_at FROM users ORDER BY created_at DESC LIMIT 10;

# Check wallets
SELECT id, user_id, balance, currency FROM wallets ORDER BY created_at DESC LIMIT 10;

# Check transactions
SELECT id, type, amount, status FROM transactions ORDER BY created_at DESC LIMIT 10;
```

### Check Backend Logs
```bash
# Backend logs are in test-servers.ts output
# Or check backend terminal directly if manually started
cd ../smartpay-backend
tail -f logs/app.log
```

---

## Test Data Management

### View Test Data
```sql
-- Connect to test database
psql postgresql://localhost:5432/smartpay_test

-- View recent test users
SELECT id, phone, first_name, smartpay_id, created_at 
FROM users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- View recent test transactions
SELECT id, type, amount, status, created_at
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Manual Cleanup
```bash
# Run cleanup script
node __tests__/integration/setup/cleanup.js

# Or via SQL
psql postgresql://localhost:5432/smartpay_test -f __tests__/integration/setup/cleanup.sql
```

---

## Common Test Patterns

### Create Test User with Wallet
```typescript
const testUser = await createTestUser({
  phone: '+264811234567',
  firstName: 'Test',
  lastName: 'User',
});

const testWallet = await createTestWallet({
  userId: testUser.id,
  balance: 10000,
  currency: 'NAD',
});
```

### Make Authenticated API Call
```typescript
const token = generateTestToken(testUser.id);

const response = await axios.get(`${BACKEND_URL}/api/v1/wallets`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Verify Database State
```typescript
const pool = getTestPool();
const result = await pool.query(
  'SELECT balance FROM wallets WHERE id = $1',
  [walletId]
);

expect(result.rows[0].balance).toBe(expectedBalance);
```

### Test Webhook with HMAC
```typescript
import crypto from 'crypto';

const payload = { type: 'test', data: {} };
const signature = crypto
  .createHmac('sha256', process.env.BUFFR_WEBHOOK_SECRET!)
  .update(JSON.stringify(payload))
  .digest('hex');

const response = await axios.post(
  `${BACKEND_URL}/api/webhooks/ketchup`,
  payload,
  {
    headers: {
      'x-webhook-signature': signature,
    },
  }
);
```

---

## Best Practices

### ✅ Do
- Always clean up test data in `afterEach`
- Use unique identifiers for concurrent safety
- Test both success and error scenarios
- Verify database state after operations
- Use real HTTP calls and database queries
- Test authentication and authorization
- Test rate limiting
- Test idempotency for webhooks

### ❌ Don't
- Mock fetch or database calls
- Leave test data in database
- Use hardcoded IDs that might conflict
- Skip error handling tests
- Run tests in parallel without isolation
- Commit secrets to `.env.test`

---

## Success Metrics

All tests should:
- ✅ Pass consistently on multiple runs
- ✅ Complete within timeout (30s per test)
- ✅ Clean up all test data
- ✅ Not interfere with each other
- ✅ Work with real backend and database
- ✅ Verify database state changes
- ✅ Test error scenarios
- ✅ Validate security (JWT, HMAC)

---

## FAQ

**Q: How long do tests take?**
A: Full suite: ~5-10 minutes. Individual suites: 30-60 seconds.

**Q: Can I run tests in parallel?**
A: Not recommended. Tests share database and may conflict. Use `maxWorkers: 1`.

**Q: What if backend is already running?**
A: Tests will detect and reuse existing server. Stop it first for clean state.

**Q: How do I add a new test?**
A: Follow patterns in existing test files. Use setup helpers from `test-database.ts`.

**Q: What database should I use?**
A: Separate test database. Never run tests on production or development database.

**Q: Do tests reset database schema?**
A: No. Tests only clean up data rows. Run migrations separately if schema changes.

---

## Support

For issues or questions:
1. Check this guide first
2. Review `INTEGRATION_TESTS_GUIDE.md` for detailed patterns
3. Inspect test helper functions in `setup/test-database.ts`
4. Check backend logs for API errors
5. Query test database to verify state

---

**Last Updated**: 2026-03-21
