/**
 * Jest Setup for Backend Tests
 * Location: fintech/smartpay/backend/jest.setup.js
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/smartpay_test';
process.env.PORT = '4001';

// BuffrConnect Test Configuration
process.env.BUFFR_API_KEY = 'test-api-key-abc123';
process.env.BUFFR_API_URL = 'https://sandbox.api.buffr.test';
process.env.BUFFR_WEBHOOK_SECRET = 'test-webhook-secret-xyz789';
process.env.BUFFR_SANDBOX_MODE = 'true';

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Close database connections and clean up resources
  try {
    const { pool } = require('./src/lib/db');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  } catch (error) {
    // Pool might not be initialized in all tests
  }
  
  // Allow pending timers to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clear any remaining timers
  jest.clearAllTimers();
});
