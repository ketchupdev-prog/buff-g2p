/**
 * Buffr Connect Integration Test Script
 * Location: fintech/smartpay/backend/scripts/testBuffrConnect.ts
 *
 * Verifies Smartpay backend can reach Buffr Connect (health + optional sandbox).
 * Run Buffr Connect first: cd buffr-connect/buffrconnect && npm run dev
 * Set in backend/.env: BUFFR_CONNECT_BASE_URL=http://localhost:3000 (or BUFFR_API_BASE)
 *
 * Usage: npm run test:buffr-connect
 */

import * as path from 'path';
// Load backend .env so BUFFR_CONNECT_BASE_URL / BUFFR_API_BASE are set
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

import {
  isBuffrConnectConfigured,
  healthCheck,
  getSandboxUsers,
} from '../src/lib/buffrConnectClient';

async function main(): Promise<void> {
  console.log('\n🔗 Smartpay → Buffr Connect integration test\n');

  if (!isBuffrConnectConfigured()) {
    console.log('⚠️  Buffr Connect not configured.');
    console.log('   Set BUFFR_CONNECT_BASE_URL or BUFFR_API_BASE in backend/.env');
    console.log('   Example: BUFFR_CONNECT_BASE_URL=http://localhost:3000');
    console.log('   Then start Buffr Connect: cd buffr-connect/buffrconnect && npm run dev\n');
    process.exit(1);
  }

  const base = process.env.BUFFR_CONNECT_BASE_URL || process.env.BUFFR_API_BASE;
  console.log(`   Base URL: ${base}\n`);

  let passed = 0;
  let failed = 0;

  // 1. Health check (no auth)
  const health = await healthCheck();
  if (health?.status === 'healthy') {
    console.log('✅ GET /api/health – Buffr Connect is reachable');
    passed++;
  } else {
    console.log('❌ GET /api/health – failed or unhealthy');
    failed++;
  }

  // 2. Sandbox users (optional; Buffr Connect allows optional auth for sandbox)
  const sandbox = await getSandboxUsers({
    apiKey: process.env.BUFFR_API_KEY,
  });
  const sandboxOk =
    sandbox &&
    ((sandbox as any).success === true &&
      ((sandbox as any).data != null || (sandbox as any).meta?.total_users != null));
  if (sandboxOk) {
    const total = (sandbox as any).meta?.total_users ?? 0;
    console.log(`✅ GET /api/sandbox/users – sandbox available (total_users: ${total})`);
    passed++;
  } else {
    console.log('⚠️  GET /api/sandbox/users – skipped or requires auth (optional)');
  }

  console.log('');
  if (failed > 0) {
    console.log(`Result: ${passed} passed, ${failed} failed. Ensure Buffr Connect is running.\n`);
    process.exit(1);
  }
  console.log(`Result: ${passed} check(s) passed. Smartpay can test Buffr Connect.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
