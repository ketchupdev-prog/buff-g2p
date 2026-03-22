/**
 * Global Setup for Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/global-setup.ts
 * 
 * Purpose:
 * - Start backend server before all tests
 * - Verify database connection
 * - Ensure test environment is ready
 */

import { startBackendServer, verifyBackendHealth } from './test-servers';
import { initTestDatabase } from './test-database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

export default async function globalSetup() {
  console.log('\n🚀 Starting integration test environment...\n');

  try {
    console.log('📊 Connecting to test database...');
    await initTestDatabase();

    console.log('🖥️  Starting SmartPay Backend server...');
    await startBackendServer();

    const isHealthy = await verifyBackendHealth();
    if (!isHealthy) {
      throw new Error('Backend server health check failed');
    }

    console.log('\n✅ Integration test environment ready\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
