/**
 * PISP (Payment Initiation Services) Routes
 * Implements OBS v1.0 §4.4.11 Payment Initiation APIs
 * Location: fintech/smartpay/backend/src/routes/obs/pisRoutes.ts
 */
import { Router, Response } from 'express';
import {
  getActiveConsent,
  getDataProvider,
  makeDataProviderRequest,
  logConsentAudit,
} from '../../lib/obsConsent';
import { pool } from '../../lib/db';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';

const router = Router();

interface PaymentInitiationRequest {
  consentId: string;
  debtorAccountId: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryAccountIdentifier: string;
  remittanceInformation?: string;
}


/**
 * POST /api/v1/obs/pis/payments
 * Initiate a payment from linked bank account
 * Includes Strong Customer Authentication (SCA) redirect flow
 * PRD §4.4.11, Appendix H §G22
 */
router.post('/payments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      consentId,
      debtorAccountId,
      amount,
      currency,
      beneficiaryName,
      beneficiaryAccountIdentifier,
      remittanceInformation,
    }: PaymentInitiationRequest = req.body;

    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!consentId) {
      return res.status(400).json({ error: 'consentId is required' });
    }

    if (!debtorAccountId || !amount || !currency || !beneficiaryName || !beneficiaryAccountIdentifier) {
      return res.status(400).json({
        error: 'Missing required fields: debtorAccountId, amount, currency, beneficiaryName, beneficiaryAccountIdentifier',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const consent = await getActiveConsent(userId, consentId);

    if (consent.purpose !== 'pis') {
      return res.status(403).json({ error: 'Consent is not for PISP' });
    }

    if (!consent.scopes.includes('banking:payments.write')) {
      return res.status(403).json({ error: 'Consent does not include payment write scope' });
    }

    const provider = await getDataProvider(consent.dataProviderId);

    if (!provider.paymentsEndpoint) {
      return res.status(400).json({ error: 'Data Provider does not support payments endpoint' });
    }

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const paymentRequest = {
      debtorAccount: {
        identification: debtorAccountId,
      },
      instructedAmount: {
        amount: amount.toString(),
        currency: currency,
      },
      creditorAccount: {
        identification: beneficiaryAccountIdentifier,
      },
      creditorName: beneficiaryName,
      remittanceInformationUnstructured: remittanceInformation ?? `Payment from Smartpay`,
    };

    const paymentResponse = await makeDataProviderRequest(
      provider,
      provider.paymentsEndpoint,
      accessToken,
      'POST',
      paymentRequest
    );

    const payment = paymentResponse as any;

    await pool.query(
      `INSERT INTO obs_payment_initiations (
        consent_id, user_id, data_provider_id, payment_id, status,
        amount, currency, debtor_account_id, beneficiary_name,
        beneficiary_account_identifier, sca_redirect_uri
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        consentId,
        userId,
        consent.dataProviderId,
        payment.paymentId ?? payment.Data?.PaymentId,
        payment.status ?? payment.Data?.Status ?? 'pending',
        amount,
        currency,
        debtorAccountId,
        beneficiaryName,
        beneficiaryAccountIdentifier,
        payment.scaRedirectUri ?? payment._links?.scaRedirect?.href ?? null,
      ]
    );

    await logConsentAudit({
      consentId: consent.id,
      eventType: 'payment_initiated',
      userId: consent.userId,
      dataProviderId: consent.dataProviderId,
      scopes: consent.scopes,
      details: {
        paymentId: payment.paymentId ?? payment.Data?.PaymentId,
        amount,
        currency,
        beneficiaryName,
      },
    });

    const authorizationFlow = payment.scaRedirectUri || payment._links?.scaRedirect?.href
      ? {
          redirectUri: payment.scaRedirectUri ?? payment._links?.scaRedirect?.href,
          message: 'Strong Customer Authentication required at your bank',
        }
      : null;

    return res.json({
      paymentId: payment.paymentId ?? payment.Data?.PaymentId,
      status: payment.status ?? payment.Data?.Status ?? 'pending',
      authorizationFlow,
      message: authorizationFlow
        ? 'Payment initiated. Please complete authentication at your bank.'
        : 'Payment initiated successfully.',
    });
  } catch (error: any) {
    console.error('PISP initiate_payment error:', error);
    return res.status(500).json({
      error: 'Failed to initiate payment',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/pis/payments/:paymentId
 * Get payment status
 */
router.get('/payments/:paymentId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const paymentResult = await pool.query(
      `SELECT * FROM obs_payment_initiations
       WHERE payment_id = $1 AND user_id = $2`,
      [paymentId, userId]
    );

    if (!paymentResult.rows[0]) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0] as Record<string, unknown>;
    const consent = await getActiveConsent(userId, String(payment.consent_id));
    const provider = await getDataProvider(consent.dataProviderId);

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const statusEndpoint = `${provider.paymentsEndpoint}/${paymentId}`;
    const statusData = await makeDataProviderRequest(
      provider,
      statusEndpoint,
      accessToken,
      'GET'
    );

    const updatedStatus =
      (statusData as any).status ?? (statusData as any).Data?.Status ?? String(payment.status);

    if (updatedStatus !== String(payment.status)) {
      await pool.query(
        `UPDATE obs_payment_initiations
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [updatedStatus, payment.id]
      );
    }

    return res.json({
      paymentId: String(payment.payment_id),
      status: updatedStatus,
      amount: payment.amount,
      currency: payment.currency,
      beneficiaryName: String(payment.beneficiary_name),
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    });
  } catch (error: any) {
    console.error('PISP get_payment_status error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve payment status',
      message: error.message,
    });
  }
});

export default router;
