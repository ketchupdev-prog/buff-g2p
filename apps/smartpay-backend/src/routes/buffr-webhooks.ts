/**
 * Buffr Connect Webhook Handler
 * 
 * Purpose: Receive and process webhook events from Buffr Connect
 * Location: backend/src/routes/buffr-webhooks.ts
 * 
 * Events Handled:
 * - transaction.completed - Transaction successfully completed
 * - transaction.failed - Transaction failed
 * - agent.balance_updated - Agent balance changed
 * - settlement.completed - Daily settlement processed
 * - voucher.issued - Portal/Ketchup issued voucher → persist for mobile redemption
 * - voucher.redeemed - G2P voucher redeemed
 * 
 * Security:
 * - Webhook signature verification
 * - HTTPS only (enforced by Vercel)
 * - Idempotency handling (prevent duplicate processing)
 * - Rate limiting
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, transaction } from '../lib/db';

const router = Router();
const isTestEnv = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === 'test';

// ================================
// Types
// ================================

interface WebhookEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: string;
  signature?: string;
}

interface TransactionEvent {
  id: string;
  type: 'cash-out' | 'voucher-redemption' | 'settlement';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  agent_id: string;
  customer_phone?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface AgentBalanceEvent {
  agent_id: string;
  previous_balance: number;
  new_balance: number;
  change: number;
  reason: string;
}

interface SettlementEvent {
  id: string;
  agent_id: string;
  amount: number;
  status: 'completed' | 'failed';
  settlement_date: string;
}

// ================================
// Webhook Signature Verification
// ================================

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
}

// ================================
// Idempotency Check
// ================================

let webhookTableReady = false;
const processedWebhooksInMemory = new Set<string>();

async function ensureWebhookTable(): Promise<void> {
  if (isTestEnv) return;
  if (webhookTableReady) return;
  await query(
    `CREATE TABLE IF NOT EXISTS buffr_webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )`
  );
  webhookTableReady = true;
}

async function markWebhookProcessing(webhookId: string, eventType: string, payload: unknown): Promise<boolean> {
  if (isTestEnv) {
    if (processedWebhooksInMemory.has(webhookId)) return false;
    processedWebhooksInMemory.add(webhookId);
    return true;
  }
  await ensureWebhookTable();
  const inserted = await query<{ inserted: boolean }>(
    `INSERT INTO buffr_webhook_events (event_id, event_type, payload)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING TRUE AS inserted`,
    [webhookId, eventType, JSON.stringify(payload ?? {})]
  );
  return inserted.rows[0]?.inserted === true;
}

async function markWebhookProcessed(webhookId: string): Promise<void> {
  if (isTestEnv) return;
  await ensureWebhookTable();
  await query(
    `UPDATE buffr_webhook_events
        SET processed_at = NOW()
      WHERE event_id = $1`,
    [webhookId]
  );
}

async function markWebhookFailed(webhookId: string): Promise<void> {
  if (isTestEnv) {
    processedWebhooksInMemory.delete(webhookId);
    return;
  }
  await ensureWebhookTable();
  await query(
    `DELETE FROM buffr_webhook_events
      WHERE event_id = $1
        AND processed_at IS NULL`,
    [webhookId]
  );
}

// ================================
// Event Handlers
// ================================

async function handleTransactionCompleted(data: TransactionEvent): Promise<void> {
  console.log('[Webhook] Transaction completed:', data.id);

  if (!isTestEnv) {
    await query(
      `UPDATE transactions
          SET status = 'completed',
              updated_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('buffr_event', 'transaction.completed')
        WHERE id = $1`,
      [data.id]
    );
  }

  // Example notification
  console.log(`[Notification] Agent ${data.agent_id} transaction ${data.id} completed: NAD ${data.amount}`);
}

async function handleTransactionFailed(data: TransactionEvent): Promise<void> {
  console.log('[Webhook] Transaction failed:', data.id);

  if (!isTestEnv) {
    await query(
      `UPDATE transactions
          SET status = 'failed',
              updated_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('buffr_event', 'transaction.failed', 'buffr_error', $2::jsonb)
        WHERE id = $1`,
      [data.id, JSON.stringify(data.error ?? null)]
    );
  }

  console.log(`[Alert] Transaction ${data.id} failed: ${data.error?.message}`);
}

async function handleAgentBalanceUpdated(data: AgentBalanceEvent): Promise<void> {
  console.log('[Webhook] Agent balance updated:', data.agent_id);

  if (!isTestEnv) {
    await query(
      `INSERT INTO buffr_webhook_events (event_id, event_type, payload, processed_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [
        `agent-balance-${data.agent_id}-${Date.now()}`,
        'agent.balance_observation',
        JSON.stringify({
          agent_id: data.agent_id,
          previous_balance: data.previous_balance,
          new_balance: data.new_balance,
          change: data.change,
          reason: data.reason
        })
      ]
    );
  }

  console.log(`[Balance] Agent ${data.agent_id}: ${data.previous_balance} → ${data.new_balance} (${data.change >= 0 ? '+' : ''}${data.change})`);
}

async function handleSettlementCompleted(data: SettlementEvent): Promise<void> {
  console.log('[Webhook] Settlement completed:', data.id);
  
  // TODO: Process settlement
  // - Update settlement records
  // - Generate settlement report
  // - Notify agent
  // - Trigger accounting workflow
  
  console.log(`[Settlement] Agent ${data.agent_id} settled: NAD ${data.amount}`);
}

// ================================
// Voucher issued (portal → SmartPay DB)
// ================================

interface VoucherIssuedPayload {
  voucher_id: string;
  voucher_code: string;
  user_id: string;
  amount: number;
  currency: string;
  issuer: string;
  voucher_type: string;
  issued_at: string | null;
  expires_at: string | null;
  redemption_method_allowed: string;
  metadata: string;
}

function parseVoucherIssuedPayload(raw: unknown): VoucherIssuedPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const inner = root.data;
  const src =
    inner && typeof inner === 'object' && inner !== null
      ? (inner as Record<string, unknown>)
      : root;

  const voucherId = String(src.voucher_id ?? src.voucherId ?? '').trim();
  const voucherCode = String(src.voucher_code ?? src.voucherCode ?? '').trim();
  const userId = String(src.user_id ?? src.userId ?? '').trim();
  const rawAmount = src.amount;

  if (!voucherId || !voucherCode || !userId || rawAmount === undefined || rawAmount === null) {
    return null;
  }

  const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const currency = String(src.currency ?? 'NAD').toUpperCase().slice(0, 3) || 'NAD';
  const issuer = String(src.issuer ?? 'buffr-connect').slice(0, 120);
  const voucherType = String(
    src.voucher_type ?? src.voucherType ?? 'government_grant'
  ).slice(0, 80);

  const issuedAt =
    typeof src.issued_at === 'string' && src.issued_at.length > 0 ? src.issued_at : null;
  const expiresAt =
    typeof src.expires_at === 'string' && src.expires_at.length > 0 ? src.expires_at : null;

  let methodsJson: string;
  if (Array.isArray(src.redemption_method_allowed)) {
    methodsJson = JSON.stringify(src.redemption_method_allowed);
  } else {
    methodsJson = JSON.stringify(['wallet', 'nampost', 'smartpay']);
  }

  const metadata = JSON.stringify({
    source: 'buffr_webhook',
    event: 'voucher.issued',
  });

  return {
    voucher_id: voucherId,
    voucher_code: voucherCode,
    user_id: userId,
    amount,
    currency,
    issuer,
    voucher_type: voucherType,
    issued_at: issuedAt,
    expires_at: expiresAt,
    redemption_method_allowed: methodsJson,
    metadata,
  };
}

/**
 * Persist a newly issued G2P voucher so the mobile app can list/redeem it.
 * Idempotency: duplicate webhook deliveries are deduped by event_id before this runs;
 * same voucher_id uses ON CONFLICT DO NOTHING.
 * Runs in Jest/test env when exercised (unlike transaction.* handlers that skip DB writes).
 */
async function handleVoucherIssued(rawBody: unknown): Promise<void> {
  const parsed = parseVoucherIssuedPayload(rawBody);
  if (!parsed) {
    console.error('[Webhook] voucher.issued: invalid or incomplete payload');
    throw new Error('Invalid voucher.issued payload');
  }

  await transaction(async (client) => {
    const userCheck = await client.query(`SELECT 1 FROM users WHERE id = $1 LIMIT 1`, [
      parsed.user_id,
    ]);
    if (userCheck.rowCount === 0) {
      throw new Error(`voucher.issued: user not found (${parsed.user_id})`);
    }

    await client.query(
      `INSERT INTO vouchers (
        id, user_id, voucher_code, amount, currency, status,
        voucher_type, issuer, issued_at, expires_at, redemption_method_allowed, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::numeric, $5, 'pending',
        $6, $7, COALESCE($8::timestamptz, NOW()), COALESCE($9::timestamptz, NOW() + INTERVAL '90 days'),
        $10::jsonb, $11::jsonb, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING`,
      [
        parsed.voucher_id,
        parsed.user_id,
        parsed.voucher_code,
        parsed.amount,
        parsed.currency,
        parsed.voucher_type,
        parsed.issuer,
        parsed.issued_at,
        parsed.expires_at,
        parsed.redemption_method_allowed,
        parsed.metadata,
      ]
    );
  });

  console.log(
    `[Webhook] voucher.issued persisted: code=${parsed.voucher_code} user=${parsed.user_id} amount=${parsed.amount} ${parsed.currency}`
  );
}

async function handleVoucherRedeemed(data: TransactionEvent): Promise<void> {
  console.log('[Webhook] Voucher redeemed:', data.id);

  if (!isTestEnv) {
    await transaction(async (client) => {
      await client.query(
        `UPDATE transactions
            SET status = 'completed',
                updated_at = NOW(),
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('buffr_event', 'voucher.redeemed')
          WHERE id = $1`,
        [data.id]
      );

      const voucherId = (data as TransactionEvent & { voucher_id?: string }).voucher_id;
      if (voucherId) {
        await client.query(
          `UPDATE vouchers
              SET status = 'redeemed',
                  redeemed_at = NOW(),
                  updated_at = NOW()
            WHERE id = $1`,
          [voucherId]
        );
      }
    });
  }

  console.log(`[G2P] Voucher redeemed by agent ${data.agent_id}: NAD ${data.amount}`);
}

// ================================
// Main Webhook Endpoint
// ================================

/**
 * POST /api/buffr/webhooks
 * Receive webhook events from Buffr Connect
 * 
 * Security:
 * - Signature verification
 * - Idempotency check
 * - Rate limiting (via middleware)
 * 
 * Headers:
 * - X-Buffr-Signature: HMAC-SHA256 signature
 * - X-Buffr-Event-Id: Unique event ID
 * - X-Buffr-Event-Type: Event type
 */
router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    // Step 1: Extract headers
    const signature = req.headers['x-buffr-signature'] as string;
    const eventId = req.headers['x-buffr-event-id'] as string;
    const eventType = req.headers['x-buffr-event-type'] as string;

    if (!signature || !eventId || !eventType) {
      console.error('[Webhook] Missing required headers');
      return res.status(400).json({
        success: false,
        error: 'Missing required webhook headers',
      });
    }

    // Step 2: Verify signature
    const webhookSecret = process.env.BUFFR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook] BUFFR_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook verification not configured',
      });
    }

    const payload = JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(payload, signature, webhookSecret);

    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    // Step 3: Check idempotency in durable store
    const isFirstDelivery = await markWebhookProcessing(eventId, eventType, req.body);
    if (!isFirstDelivery) {
      console.log(`[Webhook] Event ${eventId} already processed, skipping`);
      return res.status(200).json({
        success: true,
        message: 'Event already processed',
      });
    }

    // Step 4: Route to appropriate handler
    const event: WebhookEvent = {
      id: eventId,
      type: eventType,
      data: req.body,
      timestamp: new Date().toISOString(),
      signature,
    };

    console.log(`[Webhook] Processing event: ${eventType} (ID: ${eventId})`);

    switch (eventType) {
      case 'transaction.completed':
        await handleTransactionCompleted(event.data as TransactionEvent);
        break;

      case 'transaction.failed':
        await handleTransactionFailed(event.data as TransactionEvent);
        break;

      case 'agent.balance_updated':
        await handleAgentBalanceUpdated(event.data as AgentBalanceEvent);
        break;

      case 'settlement.completed':
        await handleSettlementCompleted(event.data as SettlementEvent);
        break;

      case 'voucher.redeemed':
        await handleVoucherRedeemed(event.data as TransactionEvent);
        break;

      case 'voucher.issued':
        await handleVoucherIssued(event.data);
        break;

      default:
        console.warn(`[Webhook] Unknown event type: ${eventType}`);
        // Don't fail for unknown events (future-proof)
    }

    // Step 5: Mark processed + acknowledge receipt
    await markWebhookProcessed(eventId);
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      event_id: eventId,
    });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    const eventId = req.headers['x-buffr-event-id'] as string | undefined;
    if (eventId) {
      await markWebhookFailed(eventId).catch((cleanupError) => {
        console.error('[Webhook] failed to clear unprocessed marker:', cleanupError);
      });
    }
    
    // Return 500 so Buffr retries
    return res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

/**
 * GET /api/buffr/webhooks/health
 * Health check for webhook endpoint
 */
router.get('/webhooks/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    webhook_secret_configured: !!process.env.BUFFR_WEBHOOK_SECRET,
    timestamp: new Date().toISOString(),
  });
});

export default router;
