/**
 * AIS (Account Information Services) Routes
 * Implements OBS v1.0 §4.4.10 Account Information APIs
 * Location: fintech/smartpay/backend/src/routes/obs/aisRoutes.ts
 */
import { Router, Response } from 'express';
import {
  getActiveConsent,
  getDataProvider,
  makeDataProviderRequest,
  logConsentAudit,
} from '../../lib/obsConsent';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';

const router = Router();

/**
 * GET /api/v1/obs/ais/accounts
 * Retrieve linked bank accounts from Data Provider
 * PRD §4.4.10, Appendix H §G22
 */
router.get('/accounts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { consentId } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!consentId || typeof consentId !== 'string') {
      return res.status(400).json({ error: 'consentId is required' });
    }

    const consent = await getActiveConsent(userId, consentId);

    if (consent.purpose !== 'ais') {
      return res.status(403).json({ error: 'Consent is not for AIS' });
    }

    if (!consent.scopes.includes('banking:accounts.basic.read')) {
      return res.status(403).json({ error: 'Consent does not include account read scope' });
    }

    const provider = await getDataProvider(consent.dataProviderId);

    if (!provider.accountsEndpoint) {
      return res.status(400).json({ error: 'Data Provider does not support accounts endpoint' });
    }

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const accountsData = await makeDataProviderRequest(
      provider,
      provider.accountsEndpoint,
      accessToken,
      'GET'
    );

    await logConsentAudit({
      consentId: consent.id,
      eventType: 'data_accessed',
      userId: consent.userId,
      dataProviderId: consent.dataProviderId,
      scopes: consent.scopes,
      details: { operation: 'get_accounts', accountCount: (accountsData as any).accounts?.length ?? 0 },
    });

    return res.json(accountsData);
  } catch (error: any) {
    console.error('AIS get_accounts error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve accounts',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/obs/ais/balances
 * Retrieve account balances from Data Provider
 */
router.post('/balances', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { consentId, accountIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!consentId || !accountIds || !Array.isArray(accountIds)) {
      return res.status(400).json({ error: 'consentId and accountIds[] are required' });
    }

    const consent = await getActiveConsent(userId, consentId);

    if (consent.purpose !== 'ais') {
      return res.status(403).json({ error: 'Consent is not for AIS' });
    }

    if (!consent.scopes.includes('banking:accounts.basic.read')) {
      return res.status(403).json({ error: 'Consent does not include account read scope' });
    }

    const provider = await getDataProvider(consent.dataProviderId);

    if (!provider.balancesEndpoint) {
      return res.status(400).json({ error: 'Data Provider does not support balances endpoint' });
    }

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const balancesData = await makeDataProviderRequest(
      provider,
      provider.balancesEndpoint,
      accessToken,
      'POST',
      { accountIds }
    );

    await logConsentAudit({
      consentId: consent.id,
      eventType: 'data_accessed',
      userId: consent.userId,
      dataProviderId: consent.dataProviderId,
      scopes: consent.scopes,
      details: { operation: 'get_balances', accountIds },
    });

    return res.json(balancesData);
  } catch (error: any) {
    console.error('AIS get_balances error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve balances',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/ais/transactions
 * Retrieve transaction history from Data Provider
 */
router.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { consentId, accountId, fromDate, toDate, limit } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!consentId || typeof consentId !== 'string') {
      return res.status(400).json({ error: 'consentId is required' });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({ error: 'accountId is required' });
    }

    const consent = await getActiveConsent(userId, consentId);

    if (consent.purpose !== 'ais') {
      return res.status(403).json({ error: 'Consent is not for AIS' });
    }

    if (!consent.scopes.includes('banking:accounts.basic.read')) {
      return res.status(403).json({ error: 'Consent does not include account read scope' });
    }

    const provider = await getDataProvider(consent.dataProviderId);

    if (!provider.transactionsEndpoint) {
      return res.status(400).json({ error: 'Data Provider does not support transactions endpoint' });
    }

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const params = new URLSearchParams({
      accountId: accountId as string,
      ...(fromDate && { fromDate: fromDate as string }),
      ...(toDate && { toDate: toDate as string }),
      ...(limit && { limit: limit as string }),
    });

    const transactionsEndpoint = `${provider.transactionsEndpoint}?${params.toString()}`;

    const transactionsData = await makeDataProviderRequest(
      provider,
      transactionsEndpoint,
      accessToken,
      'GET'
    );

    await logConsentAudit({
      consentId: consent.id,
      eventType: 'data_accessed',
      userId: consent.userId,
      dataProviderId: consent.dataProviderId,
      scopes: consent.scopes,
      details: {
        operation: 'get_transactions',
        accountId,
        fromDate,
        toDate,
        limit,
        transactionCount: (transactionsData as any).transactions?.length ?? 0,
      },
    });

    return res.json(transactionsData);
  } catch (error: any) {
    console.error('AIS get_transactions error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve transactions',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/ais/balances/:accountId?consentId=
 * Alias for clients that pass accountId in the path (see ENDPOINT_INCONSISTENCIES).
 */
router.get('/balances/:accountId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { consentId } = req.query;
    const userId = req.userId;
    const accountId = req.params.accountId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!consentId || typeof consentId !== 'string') {
      return res.status(400).json({ error: 'consentId is required' });
    }

    const consent = await getActiveConsent(userId, consentId);
    if (consent.purpose !== 'ais') {
      return res.status(403).json({ error: 'Consent is not for AIS' });
    }
    if (!consent.scopes.includes('banking:accounts.basic.read')) {
      return res.status(403).json({ error: 'Consent does not include account read scope' });
    }

    const provider = await getDataProvider(consent.dataProviderId);
    if (!provider.balancesEndpoint) {
      return res.status(400).json({ error: 'Data Provider does not support balances endpoint' });
    }

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const balancesData = await makeDataProviderRequest(
      provider,
      provider.balancesEndpoint,
      accessToken,
      'POST',
      { accountIds: [accountId] }
    );

    await logConsentAudit({
      consentId: consent.id,
      eventType: 'data_accessed',
      userId: consent.userId,
      dataProviderId: consent.dataProviderId,
      scopes: consent.scopes,
      details: { operation: 'get_balances_path', accountIds: [accountId] },
    });

    return res.json(balancesData);
  } catch (error: any) {
    console.error('AIS get_balances (path) error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve balances',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/obs/ais/transactions/:accountId?consentId=&fromDate=&toDate=&limit=
 */
router.get('/transactions/:accountId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { consentId, fromDate, toDate, limit } = req.query;
    const userId = req.userId;
    const accountId = req.params.accountId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!consentId || typeof consentId !== 'string') {
      return res.status(400).json({ error: 'consentId is required' });
    }

    const consent = await getActiveConsent(userId, consentId);
    if (consent.purpose !== 'ais') {
      return res.status(403).json({ error: 'Consent is not for AIS' });
    }
    if (!consent.scopes.includes('banking:accounts.basic.read')) {
      return res.status(403).json({ error: 'Consent does not include account read scope' });
    }

    const provider = await getDataProvider(consent.dataProviderId);
    if (!provider.transactionsEndpoint) {
      return res.status(400).json({ error: 'Data Provider does not support transactions endpoint' });
    }

    const accessToken = consent.accessToken;
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token available' });
    }

    const params = new URLSearchParams({
      accountId,
      ...(fromDate && { fromDate: fromDate as string }),
      ...(toDate && { toDate: toDate as string }),
      ...(limit && { limit: limit as string }),
    });
    const transactionsEndpoint = `${provider.transactionsEndpoint}?${params.toString()}`;

    const transactionsData = await makeDataProviderRequest(
      provider,
      transactionsEndpoint,
      accessToken,
      'GET'
    );

    await logConsentAudit({
      consentId: consent.id,
      eventType: 'data_accessed',
      userId: consent.userId,
      dataProviderId: consent.dataProviderId,
      scopes: consent.scopes,
      details: { operation: 'get_transactions_path', accountId, fromDate, toDate, limit },
    });

    return res.json(transactionsData);
  } catch (error: any) {
    console.error('AIS get_transactions (path) error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve transactions',
      message: error.message,
    });
  }
});

export default router;
