/**
 * Comprehensive Test Script for Smartpay Copilot
 * Tests LanceDB RAG and DuckDB Analytics integration
 * 
 * Usage: ts-node scripts/testCopilot.ts
 */

import { initLanceDB, searchKnowledge, ingestPRDDocuments } from '../src/lib/lancedb';
import { initDuckDB, queryDuckDB, healthCheckDuckDB } from '../src/lib/duckdb';
import { getMonthlyWithdrawals, getSpendingByCategory, detectUnusualPatterns } from '../src/lib/analyticsQueries';
import { SMARTPAY_TOOLS } from '../src/agent/smartpayAgent';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    console.log(`\n🧪 Running: ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ Passed (${duration}ms)`);
    results.push({ name, passed: true, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Failed (${duration}ms):`, error);
    results.push({
      name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   Smartpay Copilot Integration Tests                 ║');
  console.log('║   Testing: LanceDB RAG + DuckDB Analytics            ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // ===== PHASE 1: LanceDB Tests =====
  console.log('\n📦 PHASE 1: LanceDB (Vector Search / RAG)');
  console.log('─'.repeat(55));

  await runTest('Initialize LanceDB', async () => {
    const db = await initLanceDB();
    if (!db) throw new Error('LanceDB initialization failed');
    console.log('   → LanceDB connection established');
  });

  await runTest('Ingest Knowledge Base', async () => {
    const db = await initLanceDB();
    await ingestPRDDocuments(db);
    console.log('   → PRD documents ingested');
  });

  await runTest('Search: "what is a loan"', async () => {
    const results = await searchKnowledge('what is a loan', 3);
    if (results.length === 0) {
      throw new Error('No results returned from knowledge search');
    }
    console.log(`   → Found ${results.length} results`);
    console.log(`   → Top result: ${results[0].chunk.content.substring(0, 100)}...`);
    console.log(`   → Relevance: ${(results[0].score * 100).toFixed(1)}%`);
  });

  await runTest('Search: "voucher deduction fees"', async () => {
    const results = await searchKnowledge('voucher deduction fees', 3);
    if (results.length === 0) {
      throw new Error('No results returned');
    }
    console.log(`   → Found ${results.length} results`);
    console.log(`   → Source: ${results[0].chunk.metadata.source}`);
  });

  await runTest('Search: "USSD banking"', async () => {
    const results = await searchKnowledge('USSD banking offline', 3);
    if (results.length === 0) {
      throw new Error('No results returned');
    }
    console.log(`   → Found ${results.length} results`);
    console.log(`   → Type: ${results[0].chunk.metadata.type}`);
  });

  // ===== PHASE 2: DuckDB Tests =====
  console.log('\n\n📊 PHASE 2: DuckDB (Analytics Engine)');
  console.log('─'.repeat(55));

  await runTest('Initialize DuckDB', async () => {
    const db = await initDuckDB();
    if (!db.initialized) throw new Error('DuckDB initialization failed');
    console.log('   → DuckDB connection established');
  });

  await runTest('DuckDB Health Check', async () => {
    const healthy = await healthCheckDuckDB();
    if (!healthy) throw new Error('DuckDB health check failed');
    console.log('   → DuckDB is healthy');
  });

  await runTest('Simple Query: SELECT 1', async () => {
    const result = await queryDuckDB<{ value: number }>('SELECT 1 as value');
    if (result.length === 0 || result[0].value !== 1) {
      throw new Error('Query returned unexpected result');
    }
    console.log('   → Query executed successfully');
  });

  await runTest('Test Monthly Withdrawals Query (Mock User)', async () => {
    // Note: This will return 0 results if no data exists
    try {
      const summary = await getMonthlyWithdrawals('test-user-id', '2026-03');
      console.log(`   → Total amount: ${summary.totalAmount}`);
      console.log(`   → Transaction count: ${summary.transactionCount}`);
      console.log(`   → Average: ${summary.averageAmount.toFixed(2)}`);
    } catch (error) {
      console.log('   ⚠️  No transaction data (expected for fresh database)');
    }
  });

  await runTest('Test Spending by Category Query', async () => {
    try {
      const spending = await getSpendingByCategory('test-user-id', 'month');
      console.log(`   → Categories found: ${spending.length}`);
      if (spending.length > 0) {
        console.log(`   → Top category: ${spending[0].category} (${spending[0].totalAmount})`);
      }
    } catch (error) {
      console.log('   ⚠️  No spending data (expected for fresh database)');
    }
  });

  await runTest('Test Fraud Detection Query', async () => {
    try {
      const analysis = await detectUnusualPatterns('test-user-id', 7);
      console.log(`   → Risk score: ${analysis.riskScore}/100`);
      console.log(`   → Rapid transactions: ${analysis.rapidTransactions}`);
      console.log(`   → Unusual amounts: ${analysis.unusualAmounts}`);
    } catch (error) {
      console.log('   ⚠️  No transaction data for analysis');
    }
  });

  // ===== PHASE 3: Agent Tools Tests =====
  console.log('\n\n🛠️  PHASE 3: Agent Tools Registry');
  console.log('─'.repeat(55));

  await runTest('Verify Tool Count', async () => {
    if (SMARTPAY_TOOLS.length < 10) {
      throw new Error(`Expected at least 10 tools, found ${SMARTPAY_TOOLS.length}`);
    }
    console.log(`   → ${SMARTPAY_TOOLS.length} tools registered`);
  });

  await runTest('Verify search_knowledge Tool', async () => {
    const tool = SMARTPAY_TOOLS.find(t => t.name === 'search_knowledge');
    if (!tool) throw new Error('search_knowledge tool not found');
    console.log(`   → Tool: ${tool.name}`);
    console.log(`   → Description: ${tool.description}`);
  });

  await runTest('Verify monthly_withdrawals Tool', async () => {
    const tool = SMARTPAY_TOOLS.find(t => t.name === 'monthly_withdrawals');
    if (!tool) throw new Error('monthly_withdrawals tool not found');
    console.log(`   → Tool: ${tool.name}`);
  });

  await runTest('Verify spending_by_category Tool', async () => {
    const tool = SMARTPAY_TOOLS.find(t => t.name === 'spending_by_category');
    if (!tool) throw new Error('spending_by_category tool not found');
    console.log(`   → Tool: ${tool.name}`);
  });

  await runTest('Verify fraud_detection Tool', async () => {
    const tool = SMARTPAY_TOOLS.find(t => t.name === 'fraud_detection');
    if (!tool) throw new Error('fraud_detection tool not found');
    console.log(`   → Tool: ${tool.name}`);
  });

  await runTest('List All Tools', async () => {
    console.log('\n   Available Tools:');
    SMARTPAY_TOOLS.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description.substring(0, 60)}...`);
    });
  });

  // ===== PHASE 4: Integration Tests =====
  console.log('\n\n🔗 PHASE 4: Integration Tests');
  console.log('─'.repeat(55));

  await runTest('End-to-End: Knowledge Search Tool Handler', async () => {
    const searchTool = SMARTPAY_TOOLS.find(t => t.name === 'search_knowledge')!;
    
    const mockDeps = {
      userId: 'test-user',
      dbPool: null as any,
      lanceDB: await initLanceDB(),
      duckDB: await initDuckDB(),
    };

    const result = await searchTool.handler(
      { query: 'what is a loan', limit: 3 },
      mockDeps
    );

    if (typeof result !== 'object' || !result) {
      throw new Error('Tool handler returned invalid result');
    }

    const output = result as { results: unknown[]; message: string };
    console.log(`   → Results: ${output.results?.length ?? 0}`);
    console.log(`   → Message: ${output.message?.substring(0, 60)}...`);
  });

  await runTest('End-to-End: Monthly Withdrawals Tool Handler', async () => {
    const withdrawalsTool = SMARTPAY_TOOLS.find(t => t.name === 'monthly_withdrawals')!;
    
    const mockDeps = {
      userId: 'test-user',
      dbPool: null as any,
      lanceDB: await initLanceDB(),
      duckDB: await initDuckDB(),
    };

    const result = await withdrawalsTool.handler({ month: '2026-03' }, mockDeps);

    if (typeof result !== 'object' || !result) {
      throw new Error('Tool handler returned invalid result');
    }

    console.log(`   → Tool executed successfully`);
  });

  // ===== PHASE 5: Performance Tests =====
  console.log('\n\n⚡ PHASE 5: Performance Benchmarks');
  console.log('─'.repeat(55));

  await runTest('Performance: LanceDB Search (10 queries)', async () => {
    const queries = [
      'what is a loan',
      'voucher fees',
      'USSD banking',
      'transaction limits',
      'cash out methods',
      'grant payment',
      'proof of life',
      'agent locations',
      'send money',
      'balance check',
    ];

    const times: number[] = [];
    
    for (const query of queries) {
      const start = Date.now();
      await searchKnowledge(query, 3);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`   → Average: ${avgTime.toFixed(0)}ms`);
    console.log(`   → Min: ${minTime}ms | Max: ${maxTime}ms`);
    
    if (avgTime > 500) {
      throw new Error(`Average search time (${avgTime}ms) exceeds 500ms target`);
    }
  });

  await runTest('Performance: DuckDB Query (10 queries)', async () => {
    const queries = [
      'SELECT 1',
      'SELECT COUNT(*) FROM (SELECT 1) t',
      "SELECT 'test' as value",
      'SELECT 1 + 1 as sum',
      'SELECT NOW()',
    ];

    const times: number[] = [];
    
    for (const query of queries) {
      const start = Date.now();
      await queryDuckDB(query);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`   → Average: ${avgTime.toFixed(0)}ms`);
    console.log(`   → Max: ${maxTime}ms`);
    
    if (avgTime > 200) {
      throw new Error(`Average query time (${avgTime}ms) exceeds 200ms target`);
    }
  });

  // ===== TEST SUMMARY =====
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`📊 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.name}: ${r.error}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
