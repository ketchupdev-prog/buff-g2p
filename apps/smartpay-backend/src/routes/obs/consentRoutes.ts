/**
 * OBS Consent Management Routes
 * Handles consent initiation, callback, revocation, and status
 * Location: fintech/smartpay/backend/src/routes/obs/consentRoutes.ts
 */
import { Router, Request, Response } from 'express';
import {
  initiateConsent,
  handleConsentCallback,
  revokeConsent,
  getActiveConsent,
} from '../../lib/obsConsent';
import { pool } from '../../lib/db';
import { requireAuth, type AuthenticatedRequest as AuthReq } from '../../middleware/requireAuth';

const router = Router();

interface ConsentInitiationRequest {
  dataProviderId: string;
  purpose: 'ais' | 'pis';
  scopes: string[];
  durationDays?: number;
}

/**
 * POST /api/v1/obs/consents/initiate
 * Start OBS consent flow with PAR/PKCE
 * PRD §4.4.10, §G12
 */
router.post('/initiate', requireAuth, async (req: AuthReq, res: Response) => {
  try {
    const { dataProviderId, purpose, scopes, durationDays }: ConsentInitiationRequest = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!dataProviderId || !purpose || !scopes || !Array.isArray(scopes)) {
      return res.status(400).json({
        error: 'Missing required fields: dataProviderId, purpose, scopes[]',
      });
    }

    if (!['ais', 'pis'].includes(purpose)) {
      return res.status(400).json({ error: 'Purpose must be "ais" or "pis"' });
    }

    const validScopes = [
      'banking:accounts.basic.read',
      'banking:payments.write',
      'banking:payments.read',
      'consent:authorisationcode.write',
    ];

    const invalidScopes = scopes.filter((s) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        error: `Invalid scopes: ${invalidScopes.join(', ')}`,
        validScopes,
      });
    }

    const result = await initiateConsent(
      userId,
      dataProviderId,
      scopes,
      purpose,
      durationDays ?? 90
    );

    return res.json({
      consentId: result.consentId,
      authorizationUrl: result.authorizationUrl,
      state: result.state,
      expiresAt: result.expiresAt,
      message: 'Redirect user to authorizationUrl to complete consent at Data Provider',
    });
  } catch (error: any) {
    console.error('Consent initiation error:', error);
    return res.status(500).json({
      error: 'Failed to initiate consent',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/consents/callback
 * Handle OAuth callback from Data Provider
 * Exchanges authorization code for access token
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        error: `Authorization failed: ${error}`,
        description: error_description ?? 'User declined or error occurred at Data Provider',
      });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    const result = await handleConsentCallback(code, state);

    return res.json({
      consentId: result.consentId,
      status: 'active',
      message: 'Consent granted successfully. You can now use AIS/PISP services.',
    });
  } catch (error: any) {
    console.error('Consent callback error:', error);
    return res.status(500).json({
      error: 'Failed to process consent callback',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/consents
 * List user's consents
 */
router.get('/', requireAuth, async (req: AuthReq, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await pool.query(
      `SELECT
        c.id,
        c.purpose,
        c.scopes,
        c.status,
        c.granted_at,
        c.expires_at,
        c.created_at,
        dp.provider_name,
        dp.provider_code
      FROM obs_consents c
      JOIN data_providers dp ON c.data_provider_id = dp.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.json({
      consents: result.rows,
    });
  } catch (error: any) {
    console.error('List consents error:', error);
    return res.status(500).json({
      error: 'Failed to list consents',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/consents/:consentId/audit
 * (Registered before /:consentId so "audit" is not captured as an id.)
 */
router.get('/:consentId/audit', requireAuth, async (req: AuthReq, res: Response) => {
  try {
    const { consentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const consentResult = await pool.query(
      `SELECT user_id FROM obs_consents WHERE id = $1`,
      [consentId]
    );

    if (!consentResult.rows[0] || consentResult.rows[0].user_id !== userId) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    const auditResult = await pool.query(
      `SELECT
        id,
        event_type,
        scopes,
        revoked_by,
        details,
        created_at
      FROM obs_consent_audit_log
      WHERE consent_id = $1
      ORDER BY created_at DESC`,
      [consentId]
    );

    return res.json({
      consentId,
      auditTrail: auditResult.rows,
    });
  } catch (error: any) {
    console.error('Get audit trail error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve audit trail',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/consents/:consentId
 * Get consent details
 */
router.get('/:consentId', requireAuth, async (req: AuthReq, res: Response) => {
  try {
    const { consentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!consentId) {
      return res.status(400).json({ error: 'Consent ID is required' });
    }

    const consent = await getActiveConsent(userId, consentId);

    return res.json({
      id: consent.id,
      purpose: consent.purpose,
      scopes: consent.scopes,
      status: consent.status,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt,
      createdAt: consent.createdAt,
    });
  } catch (error: any) {
    console.error('Get consent error:', error);
    return res.status(404).json({
      error: 'Consent not found or inactive',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/obs/consents/:consentId
 * Revoke consent
 */
router.delete('/:consentId', requireAuth, async (req: AuthReq, res: Response) => {
  try {
    const { consentId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!consentId) {
      return res.status(400).json({ error: 'Consent ID is required' });
    }

    await revokeConsent(userId, consentId, 'user');

    return res.json({
      message: 'Consent revoked successfully',
      consentId,
    });
  } catch (error: any) {
    console.error('Revoke consent error:', error);
    return res.status(500).json({
      error: 'Failed to revoke consent',
      message: error.message,
    });
  }
});

export default router;
