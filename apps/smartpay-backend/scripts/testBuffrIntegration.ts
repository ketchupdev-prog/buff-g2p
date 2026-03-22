/**
 * Buffr Integration Test Script
 * 
 * Purpose: Comprehensive testing of Buffr Connect integration
 * Location: backend/scripts/testBuffrIntegration.ts
 * 
 * Run: npm run test:buffr
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { getBuffrClient } from '../src/services/buffr/client';
import { getBuffrCashOutService } from '../src/services/buffr/cashOut';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test_token';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ================================
// Test Functions
// ================================

async function testHealthCheck() {
  log('blue', '\n📊 Test 1: Health Check');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/buffr/health`);
    
    if (response.data.success) {
      log('green', '✅ Health check passed');
      console.log('   Status:', response.data.data?.status);
      console.log('   Integration:', response.data.smartpay_integration);
      return true;
    } else {
      log('red', '❌ Health check failed');
      return false;
    }
  } catch (error) {
    log('red', '❌ Health check error:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function testBuffrClient() {
  log('blue', '\n📊 Test 2: Buffr Client Direct');
  try {
    const client = getBuffrClient();
    log('green', '✅ Buffr client initialized');
    
    const health = await client.healthCheck();
    if (health.success) {
      log('green', '✅ Buffr API connection verified');
      return true;
    } else {
      log('yellow', '⚠️  Buffr API returned error');
      console.log('   Error:', health.error);
      return false;
    }
  } catch (error) {
    log('red', '❌ Buffr client error:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function testCashOutService() {
  log('blue', '\n📊 Test 3: Cash-Out Service');
  try {
    const service = getBuffrCashOutService();
    log('green', '✅ Cash-out service initialized');
    
    // Test validation
    const validation = service['validateCashOutRequest']({
      agentId: 'test_agent_001',
      customerPhone: '+26481234567',
      amount: 500,
    });
    
    if (validation.valid) {
      log('green', '✅ Request validation works');
      return true;
    } else {
      log('red', '❌ Validation failed:' + validation.error);
      return false;
    }
  } catch (error) {
    log('red', '❌ Cash-out service error:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function testCashOutEndpoint() {
  log('blue', '\n📊 Test 4: Cash-Out API Endpoint');
  log('yellow', '⚠️  Requires valid JWT token to test fully');
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/buffr/cash-out`,
      {
        agentId: 'test_agent_001',
        customerPhone: '+26481234567',
        amount: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Accept any status for testing
      }
    );
    
    if (response.status === 401) {
      log('yellow', '⚠️  Authentication required (expected in test mode)');
      log('green', '✅ Endpoint is protected correctly');
      return true;
    } else if (response.status === 200 && response.data.success) {
      log('green', '✅ Cash-out endpoint works!');
      console.log('   Transaction ID:', response.data.transaction?.id);
      return true;
    } else {
      log('yellow', `⚠️  Unexpected response: ${response.status}`);
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    log('red', '❌ Cash-out endpoint error:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function testWebhookEndpoint() {
  log('blue', '\n📊 Test 5: Webhook Endpoint');
  
  try {
    // Test webhook health check
    const healthResponse = await axios.get(`${BACKEND_URL}/api/buffr/webhooks/health`);
    
    if (healthResponse.data.success) {
      log('green', '✅ Webhook endpoint accessible');
      console.log('   Webhook secret configured:', healthResponse.data.webhook_secret_configured);
      
      // Test webhook call (will fail signature but endpoint should respond)
      const webhookResponse = await axios.post(
        `${BACKEND_URL}/api/buffr/webhooks`,
        { test: 'data' },
        {
          headers: {
            'X-Buffr-Signature': 'test_signature',
            'X-Buffr-Event-Id': 'test_event_' + Date.now(),
            'X-Buffr-Event-Type': 'transaction.completed',
          },
          validateStatus: () => true,
        }
      );
      
      if (webhookResponse.status === 401) {
        log('green', '✅ Webhook signature verification works');
        return true;
      } else {
        log('yellow', '⚠️  Unexpected webhook response');
        return false;
      }
    } else {
      log('red', '❌ Webhook health check failed');
      return false;
    }
  } catch (error) {
    log('red', '❌ Webhook test error:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

async function testConfiguration() {
  log('blue', '\n📊 Test 6: Configuration');
  
  const checks = {
    BUFFR_API_KEY: !!process.env.BUFFR_API_KEY,
    BUFFR_API_URL: !!process.env.BUFFR_API_URL,
    BUFFR_WEBHOOK_SECRET: !!process.env.BUFFR_WEBHOOK_SECRET,
  };
  
  let allPassed = true;
  
  for (const [key, value] of Object.entries(checks)) {
    if (value) {
      log('green', `✅ ${key} configured`);
    } else {
      log('red', `❌ ${key} missing`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// ================================
// Main Test Runner
// ================================

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🧪 Buffr Connect Integration Test Suite           ║
║                                                       ║
║   Testing Smartpay → Buffr integration               ║
║   Backend: ${BACKEND_URL}                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  const tests = [
    { name: 'Configuration', fn: testConfiguration },
    { name: 'Backend Health', fn: testHealthCheck },
    { name: 'Buffr Client', fn: testBuffrClient },
    { name: 'Cash-Out Service', fn: testCashOutService },
    { name: 'Cash-Out Endpoint', fn: testCashOutEndpoint },
    { name: 'Webhook Endpoint', fn: testWebhookEndpoint },
  ];

  const results = [];
  
  for (const test of tests) {
    const passed = await test.fn();
    results.push({ name: test.name, passed });
  }

  // Summary
  console.log('\n' + '='.repeat(55));
  log('blue', '\n📊 TEST SUMMARY\n');
  
  let passedCount = 0;
  for (const result of results) {
    if (result.passed) {
      log('green', `✅ ${result.name}`);
      passedCount++;
    } else {
      log('red', `❌ ${result.name}`);
    }
  }
  
  console.log('\n' + '='.repeat(55));
  log('blue', `\n${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    log('green', '\n🎉 All tests passed! Integration is ready.\n');
  } else {
    log('yellow', '\n⚠️  Some tests failed. Check configuration and backend.\n');
  }
}

// Run tests
runTests().catch((error) => {
  log('red', '\n❌ Test suite error:');
  console.error(error);
  process.exit(1);
});
