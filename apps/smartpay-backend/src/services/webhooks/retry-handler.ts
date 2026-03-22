/**
 * Webhook Retry Handler with Exponential Backoff
 * 
 * Purpose: Reliable webhook processing with automatic retry logic
 * 
 * Features:
 * - Exponential backoff (1min, 5min, 30min, 2h, 24h)
 * - Maximum 5 retry attempts
 * - Dead letter queue for failed webhooks
 * - Webhook signature verification (HMAC-SHA256)
 * - Idempotency (duplicate webhook detection)
 * - Performance monitoring (processing duration)
 * 
 * Standards:
 * - PSD-12: Audit trail for all webhook processing
 * - ISO 27001: Secure webhook handling
 */

import crypto from 'crypto';
import { query } from '../../lib/db';

interface WebhookEvent {
  eventId: string;
  eventType: string;
  source: string;
  payload: unknown;
  signature?: string;
}

interface WebhookProcessingResult {
  success: boolean;
  error?: string;
  processingDurationMs: number;
}

interface RetryConfig {
  maxAttempts: number;
  retryDelays: number[]; // in milliseconds
}

const RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  retryDelays: [
    1 * 60 * 1000,      // 1 minute
    5 * 60 * 1000,      // 5 minutes
    30 * 60 * 1000,     // 30 minutes
    2 * 60 * 60 * 1000, // 2 hours
    24 * 60 * 60 * 1000 // 24 hours
  ],
};

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch (error) {
    console.error('[Webhook Retry] Signature verification error:', error);
    return false;
  }
}

/**
 * Check if webhook event already exists (idempotency check)
 */
export async function isWebhookDuplicate(eventId: string): Promise<boolean> {
  try {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM webhook_delivery_log WHERE event_id = $1`,
      [eventId]
    );
    
    const count = parseInt(result?.rows?.[0]?.count ?? '0', 10);
    return count > 0;
  } catch (error) {
    console.error('[Webhook Retry] Duplicate check failed:', error);
    // Fail open - allow webhook processing
    return false;
  }
}

/**
 * Log webhook event to database
 */
export async function logWebhookEvent(
  event: WebhookEvent,
  status: 'received' | 'processing' | 'completed' | 'failed' | 'retry_scheduled',
  result?: WebhookProcessingResult
): Promise<string> {
  try {
    const existingResult = await query<{ id: string }>(
      `SELECT id FROM webhook_delivery_log WHERE event_id = $1`,
      [event.eventId]
    );
    
    if (existingResult.rows.length > 0) {
      // Update existing record
      const logId = existingResult.rows[0].id;
      
      await query(
        `UPDATE webhook_delivery_log 
         SET status = $2,
             last_error = $3,
             error_details = $4::jsonb,
             processing_duration_ms = $5,
             processed_at = CASE WHEN $2 = 'processing' THEN NOW() ELSE processed_at END,
             completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
             updated_at = NOW()
         WHERE id = $1`,
        [
          logId,
          status,
          result?.error || null,
          result?.error ? JSON.stringify({ error: result.error }) : null,
          result?.processingDurationMs || null,
        ]
      );
      
      return logId;
    } else {
      // Insert new record
      const insertResult = await query<{ id: string }>(
        `INSERT INTO webhook_delivery_log (
          event_id,
          event_type,
          source,
          payload,
          signature,
          status,
          last_error,
          error_details,
          processing_duration_ms
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9)
        RETURNING id`,
        [
          event.eventId,
          event.eventType,
          event.source,
          JSON.stringify(event.payload),
          event.signature || null,
          status,
          result?.error || null,
          result?.error ? JSON.stringify({ error: result.error }) : null,
          result?.processingDurationMs || null,
        ]
      );
      
      const inserted = insertResult.rows?.[0];
      if (!inserted?.id) {
        throw new Error('Webhook log insert did not return id');
      }
      return inserted.id;
    }
  } catch (error) {
    console.error('[Webhook Retry] Failed to log webhook event:', error);
    throw error;
  }
}

/**
 * Schedule webhook retry
 */
export async function scheduleWebhookRetry(
  logId: string,
  attemptCount: number
): Promise<void> {
  try {
    const retryDelayMs = RETRY_CONFIG.retryDelays[Math.min(attemptCount, RETRY_CONFIG.retryDelays.length - 1)];
    const nextRetryAt = new Date(Date.now() + retryDelayMs);
    
    await query(
      `UPDATE webhook_delivery_log 
       SET status = 'retry_scheduled',
           attempt_count = $2,
           next_retry_at = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [logId, attemptCount + 1, nextRetryAt.toISOString()]
    );
    
    console.log(`[Webhook Retry] Scheduled retry ${attemptCount + 1}/${RETRY_CONFIG.maxAttempts} in ${retryDelayMs / 1000}s`);
  } catch (error) {
    console.error('[Webhook Retry] Failed to schedule retry:', error);
  }
}

/**
 * Move webhook to dead letter queue
 */
export async function moveToDeadLetterQueue(logId: string, finalError: string): Promise<void> {
  try {
    await query(
      `UPDATE webhook_delivery_log 
       SET status = 'failed',
           last_error = $2,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [logId, finalError]
    );
    
    console.log(`[Webhook Retry] Moved to dead letter queue after max retries: ${logId}`);
  } catch (error) {
    console.error('[Webhook Retry] Failed to move to dead letter queue:', error);
  }
}

/**
 * Process webhook with retry logic
 * 
 * @param event - Webhook event to process
 * @param handler - Async function that processes the webhook
 * @param webhookSecret - Secret for signature verification (optional)
 * @returns Processing result
 */
export async function processWebhookWithRetry(
  event: WebhookEvent,
  handler: (event: WebhookEvent) => Promise<void>,
  webhookSecret?: string
): Promise<WebhookProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Step 1: Check idempotency
    const isDuplicate = await isWebhookDuplicate(event.eventId);
    if (isDuplicate) {
      console.log(`[Webhook Retry] Duplicate webhook detected: ${event.eventId}`);
      return {
        success: true,
        processingDurationMs: Date.now() - startTime,
      };
    }
    
    // Step 2: Verify signature (if secret provided)
    if (webhookSecret && event.signature) {
      const payloadString = JSON.stringify(event.payload);
      const isValid = verifyWebhookSignature(payloadString, event.signature, webhookSecret);
      
      if (!isValid) {
        const error = 'Invalid webhook signature';
        await logWebhookEvent(event, 'failed', { success: false, error, processingDurationMs: Date.now() - startTime });
        return { success: false, error, processingDurationMs: Date.now() - startTime };
      }
    }
    
    // Step 3: Log as received
    const logId = await logWebhookEvent(event, 'received');
    
    // Step 4: Mark as processing
    await logWebhookEvent(event, 'processing');
    
    // Step 5: Execute handler
    try {
      await handler(event);
      
      const processingDurationMs = Date.now() - startTime;
      await logWebhookEvent(event, 'completed', { success: true, processingDurationMs });
      
      return { success: true, processingDurationMs };
    } catch (handlerError) {
      const error = handlerError instanceof Error ? handlerError.message : 'Handler execution failed';
      const processingDurationMs = Date.now() - startTime;
      
      console.error('[Webhook Retry] Handler failed:', error);
      
      // Get current attempt count
      const attemptResult = await query<{ attempt_count: number }>(
        `SELECT attempt_count FROM webhook_delivery_log WHERE id = $1`,
        [logId]
      );
      
      const attemptCount = attemptResult.rows[0]?.attempt_count || 0;
      
      // Schedule retry or move to dead letter
      if (attemptCount < RETRY_CONFIG.maxAttempts) {
        await scheduleWebhookRetry(logId, attemptCount);
        await logWebhookEvent(event, 'retry_scheduled', { success: false, error, processingDurationMs });
      } else {
        await moveToDeadLetterQueue(logId, error);
        await logWebhookEvent(event, 'failed', { success: false, error, processingDurationMs });
      }
      
      return { success: false, error, processingDurationMs };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingDurationMs = Date.now() - startTime;
    
    console.error('[Webhook Retry] Processing error:', error);
    
    return { success: false, error: errorMessage, processingDurationMs };
  }
}

/**
 * Process retry queue (called by cron job)
 */
export async function processWebhookRetryQueue(
  handler: (event: WebhookEvent) => Promise<void>
): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  try {
    // Get webhooks ready for retry
    const result = await query<{
      id: string;
      event_id: string;
      event_type: string;
      source: string;
      payload: unknown;
      signature: string | null;
      attempt_count: number;
    }>(`SELECT * FROM webhook_retry_queue LIMIT 50`);
    
    for (const webhook of result?.rows ?? []) {
      processed++;
      
      const event: WebhookEvent = {
        eventId: webhook.event_id,
        eventType: webhook.event_type,
        source: webhook.source,
        payload: webhook.payload,
        signature: webhook.signature || undefined,
      };
      
      // Mark as processing
      await query(
        `UPDATE webhook_delivery_log SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [webhook.id]
      );
      
      const startTime = Date.now();
      
      try {
        await handler(event);
        
        succeeded++;
        const processingDurationMs = Date.now() - startTime;
        
        await query(
          `UPDATE webhook_delivery_log 
           SET status = 'completed',
               processing_duration_ms = $2,
               completed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [webhook.id, processingDurationMs]
        );
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const attemptCount = webhook.attempt_count;
        
        if (attemptCount >= RETRY_CONFIG.maxAttempts) {
          await moveToDeadLetterQueue(webhook.id, errorMessage);
        } else {
          await scheduleWebhookRetry(webhook.id, attemptCount);
        }
      }
    }
  } catch (error) {
    console.error('[Webhook Retry] Queue processing error:', error);
  }
  
  return { processed, succeeded, failed };
}

/**
 * Get dead letter queue statistics
 */
export async function getDeadLetterQueueStats(): Promise<{
  totalFailed: number;
  bySource: Record<string, number>;
  byEventType: Record<string, number>;
}> {
  try {
    const result = await query<{
      source: string;
      event_type: string;
    }>(`SELECT source, event_type FROM webhook_dead_letter_queue`);
    
    const bySource: Record<string, number> = {};
    const byEventType: Record<string, number> = {};
    
    for (const row of result.rows) {
      bySource[row.source] = (bySource[row.source] || 0) + 1;
      byEventType[row.event_type] = (byEventType[row.event_type] || 0) + 1;
    }
    
    return {
      totalFailed: result?.rows?.length ?? 0,
      bySource,
      byEventType,
    };
  } catch (error) {
    console.error('[Webhook Retry] Failed to get DLQ stats:', error);
    return { totalFailed: 0, bySource: {}, byEventType: {} };
  }
}
