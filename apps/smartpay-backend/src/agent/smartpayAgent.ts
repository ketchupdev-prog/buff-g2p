/**
 * Smartpay PydanticAI Agent Setup (TypeScript wrapper for Python agent)
 * Location: fintech/smartpay/backend/src/agent/smartpayAgent.ts
 * Reference: PRD §4.6.1, ai.pydantic.dev
 * 
 * Note: This is a TypeScript wrapper that communicates with Python PydanticAI agent
 */
import { pool } from '../lib/db';
import { LanceDBConnection } from '../lib/lancedb';
import { DuckDBConnection } from '../lib/duckdb';

export interface AgentDependencies {
  userId: string;
  dbPool: typeof pool;
  lanceDB: LanceDBConnection;
  duckDB: DuckDBConnection;
  sessionId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any, deps: AgentDependencies) => Promise<unknown>;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AgentRunOptions {
  userPrompt: string;
  messageHistory?: AgentMessage[];
  userId: string;
  sessionId?: string;
  stream?: boolean;
  lanceDB?: LanceDBConnection;
  duckDB?: DuckDBConnection;
}

export interface AgentRunResult {
  response: string;
  toolCalls?: Array<{ tool: string; input: unknown; output: unknown }>;
  messageHistory: AgentMessage[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Smartpay Agent Tool Registry
 * All tools registered with PydanticAI agent
 */
export const SMARTPAY_TOOLS: ToolDefinition[] = [
  {
    name: 'check_balance',
    description: 'Check wallet balance for a user',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'Wallet ID to check balance for' },
      },
      required: ['walletId'],
    },
    handler: async (input: { walletId: string }, deps) => {
      const result = await deps.dbPool.query(
        `SELECT balance, currency FROM wallets WHERE id = $1 AND user_id = $2`,
        [input.walletId, deps.userId]
      );
      if (result.rowCount === 0) {
        throw new Error('Wallet not found');
      }
      const row = result.rows[0] as { balance: number; currency: string };
      return {
        walletId: input.walletId,
        balance: row.balance,
        currency: row.currency,
        message: `Your balance is ${row.currency} ${row.balance.toFixed(2)}`,
      };
    },
  },
  
  {
    name: 'transaction_history',
    description: 'Get transaction history for a wallet',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'Wallet ID' },
        limit: { type: 'number', description: 'Number of transactions to return', default: 10 },
      },
      required: ['walletId'],
    },
    handler: async (input: { walletId: string; limit?: number }, deps) => {
      const limit = input.limit ?? 10;
      const result = await deps.dbPool.query(
        `SELECT id, type, amount, recipient, status, created_at
         FROM transactions
         WHERE wallet_id = $1 AND user_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [input.walletId, deps.userId, limit]
      );
      return {
        transactions: result.rows,
        count: result.rowCount ?? 0,
      };
    },
  },
  
  {
    name: 'send_money',
    description: 'Send money from one wallet to another',
    parameters: {
      type: 'object',
      properties: {
        fromWalletId: { type: 'string', description: 'Source wallet ID' },
        toRecipient: { type: 'string', description: 'Recipient phone or wallet ID' },
        amount: { type: 'number', description: 'Amount to send' },
        note: { type: 'string', description: 'Optional transaction note' },
      },
      required: ['fromWalletId', 'toRecipient', 'amount'],
    },
    handler: async (input: { fromWalletId: string; toRecipient: string; amount: number; note?: string }, deps) => {
      // Import compliance checks
      const { checkEmoneyLimits } = await import('../lib/emoneyLimits');
      const { calculateTransactionFee } = await import('../lib/feeCalculator');
      
      // Check e-money limits
      const limitCheck = await checkEmoneyLimits({
        userId: deps.userId,
        walletId: input.fromWalletId,
        amount: input.amount,
        type: 'send',
      });
      
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason ?? 'Transaction not allowed');
      }
      
      // Calculate fees
      const feeResult = await calculateTransactionFee({
        paymentStream: 'p2p',
        transactionType: 'send',
        channel: 'mobile',
        amount: input.amount,
      });
      
      return {
        status: 'pending_confirmation',
        amount: input.amount,
        fee: feeResult.finalFee,
        totalAmount: feeResult.totalAmount,
        recipient: input.toRecipient,
        message: `Ready to send ${input.amount.toFixed(2)} NAD (fee: ${feeResult.finalFee.toFixed(2)} NAD). Please confirm.`,
      };
    },
  },
  
  {
    name: 'generate_cashout_qr',
    description: 'Generate NAMQR QR code for agent or merchant cash-out',
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', description: 'Wallet ID to cash out from' },
        amount: { type: 'number', description: 'Amount to cash out' },
        method: { type: 'string', enum: ['agent', 'merchant'], description: 'Cash-out method' },
      },
      required: ['walletId', 'amount', 'method'],
    },
    handler: async (input: { walletId: string; amount: number; method: 'agent' | 'merchant' }, deps) => {
      const { generateCashoutQR } = await import('../lib/namqrCashout');
      
      const qrData = await generateCashoutQR(
        deps.userId,
        input.walletId,
        input.amount,
        input.method
      );
      
      return {
        tokenVaultId: qrData.tokenVaultId,
        qrString: qrData.qrString,
        expiresAt: qrData.expiresAt,
        instructions: `Show this QR code or the code ${qrData.tokenVaultId} to the ${input.method} to complete your N$${input.amount} cash-out. Code expires at ${qrData.expiresAt.toLocaleTimeString()}.`,
      };
    },
  },
  
  {
    name: 'find_nearest_agent',
    description: 'Find the nearest cash-out agent or NamPost branch based on user location',
    parameters: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'User latitude' },
        longitude: { type: 'number', description: 'User longitude' },
        service: { type: 'string', enum: ['cashout', 'voucher', 'ewallet', 'namqr'], default: 'cashout' },
        limit: { type: 'number', description: 'Number of agents to return', default: 5 },
      },
      required: ['latitude', 'longitude'],
    },
    handler: async (input: { latitude: number; longitude: number; service?: string; limit?: number }, deps) => {
      const service = input.service ?? 'cashout';
      const limit = input.limit ?? 5;
      
      const serviceFilter: Record<string, string> = {
        cashout: `'cashout' = ANY(services)`,
        voucher: `'voucher' = ANY(services)`,
        ewallet: `'ewallet' = ANY(services)`,
        namqr: `'namqr' = ANY(services)`,
      };

      const serviceClause = serviceFilter[service] ?? `'cashout' = ANY(services)`;

      const result = await deps.dbPool.query(
        `SELECT
           id, agent_code, name AS agent_name, type AS agent_type, address, region,
           operating_hours,
           'namqr' = ANY(services) AS supports_namqr,
           ST_Y(location::geometry) AS latitude,
           ST_X(location::geometry) AS longitude,
           (ST_Distance(
             location,
             ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
           ) / 1000.0) AS distance_km
         FROM agent_locations
         WHERE is_active = true AND ${serviceClause}
         ORDER BY distance_km ASC
         LIMIT $3`,
        [input.latitude, input.longitude, limit]
      );
      
      return {
        agents: result.rows,
        count: result.rowCount ?? 0,
        message: result.rowCount && result.rowCount > 0
          ? `Found ${result.rowCount} agents near you. The closest is ${(result.rows[0] as { agent_name: string; distance_km: number }).agent_name} (${(result.rows[0] as { distance_km: number }).distance_km.toFixed(1)} km away).`
          : 'No agents found near your location. Try a broader search area.',
      };
    },
  },
  
  {
    name: 'ussd_instructions',
    description: 'Get USSD instructions for offline banking',
    parameters: {
      type: 'object',
      properties: {
        bankCode: { type: 'string', enum: ['fnb', 'bank_windhoek', 'nedbank', 'standard_bank'] },
        action: { type: 'string', enum: ['balance', 'send_money', 'cashout', 'airtime', 'electricity'] },
      },
      required: ['action'],
    },
    handler: async (input: { bankCode?: string; action: string }) => {
      // USSD instructions implementation
      const bankCode = input.bankCode ?? 'fnb';
      const ussdCodes: Record<string, string> = {
        fnb: '*140*321#',
        bank_windhoek: '*140*295#',
        nedbank: '*140*001#',
        standard_bank: '*140*6626#',
      };
      
      const ussd = ussdCodes[bankCode] ?? '*140#';
      
      return {
        bankCode,
        ussd,
        action: input.action,
        instructions: `Dial ${ussd} on your phone → Select "${input.action.replace('_', ' ')}" → Follow the prompts.`,
        message: `📱 Offline Channel (USSD)\n\nDial ${ussd} on your phone to access banking services without internet. SMS charges may apply.`,
      };
    },
  },
  
  {
    name: 'search_knowledge',
    description: 'Search Smartpay knowledge base for help, FAQs, and policy information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Number of results', default: 3 },
      },
      required: ['query'],
    },
    handler: async (input: { query: string; limit?: number }, deps) => {
      try {
        const limit = input.limit ?? 3;
        const results = await deps.lanceDB.search(input.query, limit);
        
        if (results.length === 0) {
          return {
            results: [],
            message: `No relevant information found for: "${input.query}". Please try a different query or contact support.`,
          };
        }

        const formattedResults = results.map((result, index) => ({
          rank: index + 1,
          content: result.chunk.content,
          source: result.chunk.metadata.source,
          type: result.chunk.metadata.type,
          relevance: (result.score * 100).toFixed(1) + '%',
        }));

        return {
          results: formattedResults,
          count: results.length,
          message: `Found ${results.length} relevant result(s) for: "${input.query}"`,
          context: results.map(r => r.chunk.content).join('\n\n'),
        };
      } catch (error) {
        console.error('Knowledge search error:', error);
        return {
          results: [],
          error: 'Failed to search knowledge base',
          message: 'There was an error searching the knowledge base. Please try again.',
        };
      }
    },
  },
  
  {
    name: 'get_monthly_spending',
    description: 'Get monthly spending analytics for the user, broken down by category',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format (e.g., "2026-03")' },
        category: { type: 'string', description: 'Optional transaction category filter (e.g., "send", "cashout")' },
      },
      required: ['month'],
    },
    handler: async (input: { month: string; category?: string }, deps) => {
      try {
        const { getSpendingByCategory } = await import('../lib/analyticsQueries');
        
        // Get spending data for the specified month
        const results = await getSpendingByCategory(deps.userId, 'month', input.category);
        
        if (results.length === 0) {
          return {
            message: `You had no transactions${input.category ? ` in category "${input.category}"` : ''} during ${input.month}.`,
            data: { transactionCount: 0, totalAmount: 0, avgTransactionAmount: 0 },
          };
        }
        
        const totalAmount = results.reduce((sum, cat) => sum + cat.totalAmount, 0);
        const transactionCount = results.reduce((sum, cat) => sum + cat.transactionCount, 0);
        const avgTransactionAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
        
        const result = {
          transactionCount,
          totalAmount,
          avgTransactionAmount,
        };
        
        if (result.transactionCount === 0) {
          return {
            message: `You had no transactions${input.category ? ` in category "${input.category}"` : ''} during ${input.month}.`,
            data: result,
          };
        }

        return {
          message: `In ${input.month}${input.category ? ` for ${input.category} transactions` : ''}, you spent N$${result.totalAmount.toFixed(2)} across ${result.transactionCount} transaction(s). Average transaction: N$${result.avgTransactionAmount.toFixed(2)}.`,
          data: result,
        };
      } catch (error) {
        console.error('Monthly spending analytics error:', error);
        return {
          error: 'Failed to retrieve spending analytics',
          message: 'Unable to calculate monthly spending. Please try again.',
        };
      }
    },
  },
  
  {
    name: 'get_spending_breakdown',
    description: 'Get spending breakdown by category for a date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in ISO format' },
        endDate: { type: 'string', description: 'End date in ISO format' },
      },
      required: ['startDate', 'endDate'],
    },
    handler: async (input: { startDate: string; endDate: string }, deps) => {
      try {
        const { getSpendingByCategory } = await import('../lib/analyticsQueries');
        
        // Calculate period based on date range
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const period = daysDiff <= 7 ? 'week' : daysDiff <= 31 ? 'month' : daysDiff <= 93 ? 'quarter' : 'year';
        
        const results = await getSpendingByCategory(deps.userId, period);
        
        if (results.length === 0) {
          return {
            message: 'No spending data found for the specified period.',
            breakdown: [],
          };
        }

        const totalSpent = results.reduce((sum, cat) => sum + cat.totalAmount, 0);
        
        const breakdown = results.map(cat => ({
          category: cat.category,
          amount: cat.totalAmount,
          count: cat.transactionCount,
          percentage: ((cat.totalAmount / totalSpent) * 100).toFixed(1) + '%',
        }));

        return {
          message: `Spending breakdown from ${input.startDate} to ${input.endDate}:`,
          totalSpent: totalSpent.toFixed(2),
          breakdown,
        };
      } catch (error) {
        console.error('Spending breakdown error:', error);
        return {
          error: 'Failed to retrieve spending breakdown',
          message: 'Unable to calculate spending breakdown. Please try again.',
        };
      }
    },
  },
  
  {
    name: 'get_transaction_analytics',
    description: 'Get detailed transaction history with analytics for a date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in ISO format' },
        endDate: { type: 'string', description: 'End date in ISO format' },
        limit: { type: 'number', description: 'Maximum number of transactions to return', default: 20 },
      },
      required: ['startDate', 'endDate'],
    },
    handler: async (input: { startDate: string; endDate: string; limit?: number }, deps) => {
      try {
        const { getTransactionHistory } = await import('../lib/analyticsQueries');
        
        const { transactions } = await getTransactionHistory(deps.userId, {
          startDate: input.startDate,
          endDate: input.endDate,
          limit: input.limit ?? 20,
        });
        
        if (transactions.length === 0) {
          return {
            message: 'No transactions found for the specified period.',
            transactions: [],
          };
        }

        return {
          message: `Found ${transactions.length} transaction(s) from ${input.startDate} to ${input.endDate}`,
          transactions: transactions.map(t => ({
            id: t.transactionId,
            type: t.type,
            amount: `N$${t.amount.toFixed(2)}`,
            recipient: t.recipient,
            status: t.status,
            date: t.createdAt,
          })),
          count: transactions.length,
        };
      } catch (error) {
        console.error('Transaction analytics error:', error);
        return {
          error: 'Failed to retrieve transaction analytics',
          message: 'Unable to load transaction history. Please try again.',
        };
      }
    },
  },
  
  // === DUCKDB ANALYTICS TOOLS ===
  
  {
    name: 'monthly_withdrawals',
    description: 'Get monthly cash withdrawal summary - answers "How much did I withdraw in cash this month?"',
    parameters: {
      type: 'object',
      properties: {
        month: { 
          type: 'string', 
          description: 'Month in YYYY-MM format (defaults to current month)' 
        },
      },
    },
    handler: async (input: { month?: string }, deps) => {
      const { getMonthlyWithdrawals } = await import('../lib/analyticsQueries');
      const summary = await getMonthlyWithdrawals(deps.userId, input.month);
      
      const methodsList = summary.cashoutMethods
        .map((m) => `  • ${m.method}: NAD ${m.amount.toFixed(2)} (${m.count} transactions)`)
        .join('\n');
      
      return {
        ...summary,
        message: `💰 Cash Withdrawals for ${summary.month}:\n\nTotal: NAD ${summary.totalAmount.toFixed(2)}\nTransactions: ${summary.transactionCount}\nAverage: NAD ${summary.averageAmount.toFixed(2)}\n\nBreakdown by method:\n${methodsList || 'No withdrawals this month'}`,
      };
    },
  },
  
  {
    name: 'spending_by_category',
    description: 'Get spending breakdown by category - answers "What did I spend on groceries?" or general spending analysis',
    parameters: {
      type: 'object',
      properties: {
        period: { 
          type: 'string', 
          enum: ['week', 'month', 'quarter', 'year'],
          description: 'Time period to analyze',
          default: 'month'
        },
        category: {
          type: 'string',
          description: 'Specific category to analyze (e.g., "groceries", "transport")',
        },
      },
    },
    handler: async (input: { period?: 'week' | 'month' | 'quarter' | 'year'; category?: string }, deps) => {
      const { getSpendingByCategory } = await import('../lib/analyticsQueries');
      const spending = await getSpendingByCategory(
        deps.userId,
        input.period || 'month',
        input.category
      );
      
      if (spending.length === 0) {
        return {
          spending: [],
          message: `No spending found for the specified ${input.period || 'month'}.`,
        };
      }
      
      const categoryList = spending.map((cat) => {
        const merchants = cat.topMerchants
          .map((m) => `    - ${m.merchant}: NAD ${m.amount.toFixed(2)}`)
          .join('\n');
        
        return `📊 ${cat.category.toUpperCase()}\n  Total: NAD ${cat.totalAmount.toFixed(2)} (${cat.percentage}%)\n  Transactions: ${cat.transactionCount}\n  Top merchants:\n${merchants || '    No merchant data'}`;
      }).join('\n\n');
      
      const totalSpent = spending.reduce((sum, cat) => sum + cat.totalAmount, 0);
      
      return {
        spending,
        totalSpent,
        message: `💳 Spending Analysis (${input.period || 'month'}):\n\nTotal Spent: NAD ${totalSpent.toFixed(2)}\n\n${categoryList}`,
      };
    },
  },
  
  {
    name: 'grant_payments',
    description: 'Get grant payment history - answers "Show my last grant payment"',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of grants to return', default: 10 },
      },
    },
    handler: async (input: { limit?: number }, deps) => {
      const { getGrantPayments } = await import('../lib/analyticsQueries');
      const grants = await getGrantPayments(deps.userId, input.limit || 10);
      
      if (grants.length === 0) {
        return {
          grants: [],
          message: 'No grant payments found for your account.',
        };
      }
      
      const grantList = grants.map((grant) => {
        const date = new Date(grant.disbursementDate).toLocaleDateString();
        return `  • ${grant.programName}\n    Amount: NAD ${grant.amount.toFixed(2)}\n    Date: ${date}\n    Status: ${grant.status}`;
      }).join('\n\n');
      
      const lastGrant = grants[0];
      
      if (!lastGrant) {
        return {
          grants,
          lastGrant: null,
          message: `💰 No grant payments found.`,
        };
      }
      
      return {
        grants,
        lastGrant,
        message: `💰 Grant Payments:\n\n${grantList}\n\nMost recent: ${lastGrant.programName} - NAD ${lastGrant.amount.toFixed(2)} on ${new Date(lastGrant.disbursementDate).toLocaleDateString()}`,
      };
    },
  },
  
  {
    name: 'spending_trends',
    description: 'Analyze spending trends over time (daily, weekly, or monthly)',
    parameters: {
      type: 'object',
      properties: {
        period: { 
          type: 'string', 
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Trend aggregation period',
          default: 'weekly'
        },
        weeks: { 
          type: 'number', 
          description: 'Number of weeks to analyze',
          default: 12 
        },
      },
    },
    handler: async (input: { period?: 'daily' | 'weekly' | 'monthly'; weeks?: number }, deps) => {
      const { getSpendingTrends } = await import('../lib/analyticsQueries');
      const trends = await getSpendingTrends(
        deps.userId,
        input.period || 'weekly',
        input.weeks || 12
      );
      
      if (trends.length === 0) {
        return {
          trends: [],
          message: 'No spending data available for the specified period.',
        };
      }
      
      const trendList = trends.slice(-8).map((t) => {
        const date = new Date(t.period).toLocaleDateString();
        return `  ${date}: NAD ${t.amount.toFixed(2)} (${t.count} transactions)`;
      }).join('\n');
      
      const totalSpent = trends.reduce((sum, t) => sum + t.amount, 0);
      const avgSpent = totalSpent / trends.length;
      
      return {
        trends,
        totalSpent,
        avgSpent,
        message: `📈 Spending Trends (${input.period || 'weekly'}):\n\nTotal: NAD ${totalSpent.toFixed(2)}\nAverage per period: NAD ${avgSpent.toFixed(2)}\n\nRecent periods:\n${trendList}`,
      };
    },
  },
  
  {
    name: 'fraud_detection',
    description: 'Detect unusual transaction patterns that may indicate fraud',
    parameters: {
      type: 'object',
      properties: {
        windowDays: { 
          type: 'number', 
          description: 'Days to analyze',
          default: 7 
        },
      },
    },
    handler: async (input: { windowDays?: number }, deps) => {
      const { detectUnusualPatterns } = await import('../lib/analyticsQueries');
      const analysis = await detectUnusualPatterns(deps.userId, input.windowDays || 7);
      
      const riskLevel = analysis.riskScore < 30 ? 'Low' : analysis.riskScore < 60 ? 'Medium' : 'High';
      const riskEmoji = analysis.riskScore < 30 ? '✅' : analysis.riskScore < 60 ? '⚠️' : '🚨';
      
      return {
        ...analysis,
        riskLevel,
        message: `${riskEmoji} Fraud Detection Analysis (${input.windowDays || 7} days):\n\nRisk Level: ${riskLevel} (Score: ${analysis.riskScore}/100)\n\nFindings:\n  • Rapid transactions: ${analysis.rapidTransactions}\n  • Unusual amounts: ${analysis.unusualAmounts}\n  • New recipients: ${analysis.newRecipients}\n\n${analysis.riskScore >= 60 ? '⚠️  HIGH RISK: Please review recent transactions carefully.' : analysis.riskScore >= 30 ? 'Some unusual patterns detected. Monitor your account.' : 'No significant unusual patterns detected.'}`,
      };
    },
  },
  
  // === EDUCATIONAL / KNOWLEDGE BASE TOOLS ===
  
  {
    name: 'search_knowledge_base',
    description: 'Search financial literacy knowledge base for educational content, FAQs, and help articles about wallets, loans, vouchers, proof-of-life, fees, and banking concepts',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'Search query (e.g., "How do loans work?", "What is a wallet?")' 
        },
        limit: { 
          type: 'number', 
          description: 'Number of results to return',
          default: 3 
        },
      },
      required: ['query'],
    },
    handler: async (input: { query: string; limit?: number }, deps) => {
      try {
        const limit = input.limit ?? 3;
        const results = await deps.lanceDB.search(input.query, limit);
        
        if (results.length === 0) {
          return {
            results: [],
            message: `I couldn't find specific educational content for "${input.query}". Try asking about wallets, loans, cash-out, proof of life, fees, or open banking.`,
          };
        }

        const formattedResults = results.map((result, index) => ({
          rank: index + 1,
          title: extractTitle(result.chunk.content),
          content: result.chunk.content,
          relevance: (result.score * 100).toFixed(1) + '%',
          source: result.chunk.metadata.source,
          tags: result.chunk.metadata.tags,
        }));

        return {
          results: formattedResults,
          count: results.length,
          message: `Found ${results.length} educational resource(s) about "${input.query}". Here's what I found:`,
        };
      } catch (error) {
        console.error('Knowledge base search error:', error);
        return {
          results: [],
          error: 'Failed to search knowledge base',
          message: 'I had trouble searching the knowledge base. Please try again or ask your question differently.',
        };
      }
    },
  },
  
  {
    name: 'explain_financial_concept',
    description: 'Get detailed explanations of financial concepts like wallets, loans, vouchers, proof-of-life, open banking, NAMQR, transaction limits, fees, etc. Provides simple, accessible explanations suitable for all literacy levels',
    parameters: {
      type: 'object',
      properties: {
        concept: { 
          type: 'string', 
          description: 'Financial concept to explain (e.g., "wallet", "cashout", "loan", "proof of life")' 
        },
        detail_level: {
          type: 'string',
          enum: ['basic', 'intermediate', 'advanced'],
          description: 'Level of detail for the explanation',
          default: 'basic',
        },
      },
      required: ['concept'],
    },
    handler: async (input: { concept: string; detail_level?: 'basic' | 'intermediate' | 'advanced' }, deps) => {
      try {
        // Map common queries to topic search terms
        const conceptMap: Record<string, string> = {
          'wallet': 'digital wallet basics',
          'wallets': 'digital wallet basics',
          'cashout': 'cash out safely withdraw',
          'cash out': 'cash out safely withdraw',
          'withdraw': 'cash out safely withdraw',
          'loan': 'voucher-backed loans',
          'loans': 'voucher-backed loans',
          'borrow': 'voucher-backed loans',
          'proof of life': 'proof of life verification',
          'verification': 'proof of life verification',
          'fees': 'transaction fees charges',
          'charges': 'transaction fees charges',
          'open banking': 'open banking explained',
          'obs': 'open banking explained',
        };

        const searchQuery = conceptMap[input.concept.toLowerCase()] || input.concept;
        const results = await deps.lanceDB.search(searchQuery, 1);

        if (results.length === 0) {
          return {
            message: `I don't have specific educational content about "${input.concept}" yet. Try asking about: wallets, cash-out, loans, proof of life, fees, or open banking.`,
            suggestions: ['What is a wallet?', 'How do I cash out?', 'How do loans work?', 'What is proof of life?'],
          };
        }

        const firstResult = results[0];
        if (!firstResult) {
          return {
            error: 'No explanation found',
            suggestions: ['Try asking about wallets', 'Learn about loans', 'Understanding transactions'],
          };
        }
        
        const content = firstResult.chunk.content;
        const title = extractTitle(content);
        const detailLevel = input.detail_level ?? 'basic';

        return {
          title,
          explanation: content,
          level: detailLevel,
          relevance: firstResult.score,
          source: firstResult.chunk.metadata.source,
          tags: firstResult.chunk.metadata.tags,
          message: `Here's an explanation of ${title}. Would you like me to explain any related topics?`,
        };
      } catch (error) {
        console.error('Error explaining concept:', error);
        return {
          error: 'Failed to retrieve explanation',
          message: 'I had trouble getting that explanation. Please try again.',
        };
      }
    },
  },
];

/**
 * Helper function to extract title from content
 */
function extractTitle(content: string): string {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || 'Untitled';
  return firstLine.replace(/^#+\s*/, '');
}

/**
 * Run Smartpay agent (calls Python PydanticAI agent via HTTP)
 */
export async function runSmartpayAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const { userPrompt, messageHistory = [], userId, sessionId, lanceDB, duckDB } = options;
  
  // Prepare dependencies with data layer connections
  if (!lanceDB || !duckDB) {
    throw new Error('Data layer not initialized. LanceDB and DuckDB connections required.');
  }
  
  const deps: AgentDependencies = {
    userId,
    dbPool: pool,
    lanceDB,
    duckDB,
    sessionId,
  };
  
  // For now, simulate agent response (replace with actual Python PydanticAI call)
  const response = await simulateAgentResponse(userPrompt, messageHistory, deps);
  
  return {
    response: response.text,
    toolCalls: response.toolCalls,
    messageHistory: [
      ...messageHistory,
      { role: 'user', content: userPrompt, timestamp: new Date() },
      { role: 'assistant', content: response.text, timestamp: new Date() },
    ],
  };
}

/**
 * Simulate agent response (replace with actual PydanticAI call)
 */
async function simulateAgentResponse(
  userPrompt: string,
  _messageHistory: AgentMessage[],
  deps: AgentDependencies
): Promise<{ text: string; toolCalls?: Array<{ tool: string; input: unknown; output: unknown }> }> {
  // Simple intent detection
  const lowerPrompt = userPrompt.toLowerCase();
  
  if (lowerPrompt.includes('balance')) {
    // Simulate check_balance tool call
    const walletResult = await deps.dbPool.query(
      `SELECT id, balance, currency FROM wallets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [deps.userId]
    );
    
    if (walletResult.rowCount && walletResult.rowCount > 0) {
      const wallet = walletResult.rows[0] as { id: string; balance: number; currency: string };
      return {
        text: `Your current balance is ${wallet.currency} ${wallet.balance.toFixed(2)}.`,
        toolCalls: [{
          tool: 'check_balance',
          input: { walletId: wallet.id },
          output: { balance: wallet.balance, currency: wallet.currency },
        }],
      };
    }
  }
  
  if (lowerPrompt.includes('agent') || lowerPrompt.includes('cash out')) {
    return {
      text: `I can help you find the nearest cash-out agent. To do this, I need your location. Please share your location or provide latitude and longitude coordinates.`,
    };
  }
  
  if (lowerPrompt.includes('ussd') || lowerPrompt.includes('offline')) {
    return {
      text: `📱 **Offline Channel (USSD)**\n\nTo access Smartpay services offline, dial *140# on your phone. Most Namibian banks support USSD banking.\n\nAvailable services:\n• Balance check\n• Send money\n• Cash out\n• Airtime purchase\n\nUSSD works without internet connection. SMS charges may apply.`,
    };
  }
  
  // Default response
  return {
    text: `I'm Smartpay Assistant. I can help you with:\n\n• Check your balance\n• Send money\n• Generate cash-out QR codes\n• Find nearest agents\n• Get USSD instructions for offline banking\n\nWhat would you like to do?`,
  };
}
