/**
 * Jest Setup for Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/jest.setup.ts
 * 
 * Purpose:
 * - Configure test environment
 * - Set longer timeouts
 * - Load environment variables
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

jest.setTimeout(30000);

beforeAll(() => {
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
    console.warn('⚠️  No TEST_DATABASE_URL set, using default PostgreSQL connection');
  }

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  No JWT_SECRET set, using default test secret');
    process.env.JWT_SECRET = 'test-jwt-secret-key';
  }

  if (!process.env.BUFFR_WEBHOOK_SECRET) {
    console.warn('⚠️  No BUFFR_WEBHOOK_SECRET set, using default test secret');
    process.env.BUFFR_WEBHOOK_SECRET = 'test-webhook-secret';
  }

  console.log('🧪 Integration test environment configured');
  console.log(`   Database: ${process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'default'}`);
  console.log(`   Backend:  ${process.env.TEST_BACKEND_URL || 'http://localhost:4000'}`);
});
