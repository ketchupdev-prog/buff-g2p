/**
 * Buffr AI / ML Service Client
 * Location: fintech/smartpay/backend/src/lib/buffrAiClient.ts
 *
 * Optional integration with Buffr AI ML API (fraud detection, credit scoring).
 * When BUFFR_AI_BASE_URL is not set, all methods no-op and return null;
 * the rest of the app continues without ML.
 *
 * API contract aligned with ketchup-smartpay/buffr/buffr_ai (ml_api.py).
 */

const BUFFR_AI_BASE = process.env.BUFFR_AI_BASE_URL?.replace(/\/$/, '');
const BUFFR_AI_API_KEY = process.env.BUFFR_AI_API_KEY;

export function isBuffrAiConfigured(): boolean {
  return Boolean(BUFFR_AI_BASE);
}

// --- Fraud check (Guardian agent) ---

export interface FraudCheckRequest {
  transaction_id: string;
  user_id: string;
  amount: number;
  merchant_name: string;
  merchant_mcc: number;
  merchant_location: { lat: number; lon: number };
  user_location: { lat: number; lon: number };
  timestamp: string; // ISO
  device_fingerprint: string;
  beneficiary_account_age_days?: number;
}

export interface FraudCheckResponse {
  transaction_id: string;
  fraud_probability: number;
  is_fraud: boolean;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_action: 'APPROVE' | 'REVIEW' | 'DECLINE' | 'BLOCK';
  model_scores: Record<string, number>;
  confidence: number;
  timestamp?: string;
}

export async function checkFraud(payload: FraudCheckRequest): Promise<FraudCheckResponse | null> {
  if (!BUFFR_AI_BASE) return null;
  try {
    const url = `${BUFFR_AI_BASE}/fraud/check`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (BUFFR_AI_API_KEY) {
      headers['x-api-key'] = BUFFR_AI_API_KEY;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn('[BuffrAI] fraud/check non-OK:', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as FraudCheckResponse;
    return data;
  } catch (err) {
    console.warn('[BuffrAI] fraud/check error:', err);
    return null;
  }
}

/** Returns true if the transaction should be blocked (high risk or decline/block). */
export function shouldBlockTransaction(fraud: FraudCheckResponse): boolean {
  if (fraud.recommended_action === 'DECLINE' || fraud.recommended_action === 'BLOCK') return true;
  if (fraud.risk_level === 'HIGH' || fraud.risk_level === 'CRITICAL') return true;
  return fraud.is_fraud;
}

// --- Credit assessment (Guardian agent) ---

export interface CreditAssessmentRequest {
  user_id: string;
  merchant_id?: string | null;
  total_transaction_volume: number;
  avg_transaction_amount: number;
  transaction_count: number;
  account_age_days: number;
  successful_transactions: number;
  failed_transactions?: number;
  avg_daily_balance: number;
  fraud_incidents?: number;
  disputed_transactions?: number;
  chargebacks?: number;
  monthly_income?: number | null;
  debt_to_income_ratio?: number | null;
}

export interface CreditAssessmentResponse {
  user_id: string;
  credit_score: number;
  credit_tier: string;
  max_loan_amount: number;
  interest_rate: number;
  confidence: number;
  risk_factors: string[];
  recommendations: string[];
  timestamp?: string;
}

export async function assessCredit(
  payload: CreditAssessmentRequest
): Promise<CreditAssessmentResponse | null> {
  if (!BUFFR_AI_BASE) return null;
  try {
    const url = `${BUFFR_AI_BASE}/credit/assess`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (BUFFR_AI_API_KEY) {
      headers['x-api-key'] = BUFFR_AI_API_KEY;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn('[BuffrAI] credit/assess non-OK:', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as CreditAssessmentResponse;
    return data;
  } catch (err) {
    console.warn('[BuffrAI] credit/assess error:', err);
    return null;
  }
}
