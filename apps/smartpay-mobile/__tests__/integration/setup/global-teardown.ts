/**
 * Global Teardown for Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/global-teardown.ts
 * 
 * Purpose:
 * - Stop backend server after all tests
 * - Close database connections
 * - Clean up test environment
 */

import { stopBackendServer } from './test-servers';
import { closeTestDatabase, cleanupTestData } from './test-database';

export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up integration test environment...\n');

  try {
    console.log('🗑️  Cleaning up test data...');
    await cleanupTestData();

    console.log('🔌 Closing database connection...');
    await closeTestDatabase();

    console.log('🛑 Stopping backend server...');
    stopBackendServer();

    console.log('\n✅ Integration test environment cleaned up\n');
  } catch (error) {
    console.error('❌ Global teardown error:', error);
  }
}
