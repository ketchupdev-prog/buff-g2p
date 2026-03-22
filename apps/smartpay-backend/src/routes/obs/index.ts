/**
 * Open Banking (OBS) routes — mobile proxy + bon (TPP) API + SCA + mock provider.
 * Canonical base: /api/v1/obs (alias: /api/obs).
 */
import { Router } from 'express';
import { pool } from '../../lib/db';
import { requireAuth } from '../../middleware/requireAuth';
import consentRoutes from './consentRoutes';
import aisRoutes from './aisRoutes';
import pisRoutes from './pisRoutes';
import mockDataProvider from './mockDataProvider';
import bonRouter from '../obsBon';
import scaRouter from '../obs-sca';

const router = Router();

/** GET /api/v1/obs/providers — list active data providers (copilot + mobile). */
router.get('/providers', requireAuth, async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, provider_code, provider_name, authorization_endpoint, token_endpoint,
              par_endpoint, revocation_endpoint, accounts_endpoint, balances_endpoint,
              transactions_endpoint, payments_endpoint, is_active, created_at
       FROM data_providers
       WHERE is_active = true
       ORDER BY provider_name ASC`
    );
    const list = r.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.provider_name,
      providerCode: row.provider_code,
      type: 'bank',
      supportsAIS: Boolean(row.accounts_endpoint),
      supportsPIS: Boolean(row.payments_endpoint),
    }));
    res.json(list);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to list providers', message });
  }
});

router.use('/consents', consentRoutes);
router.use('/ais', aisRoutes);
router.use('/pis', pisRoutes);
router.use('/', scaRouter);
router.use('/bon', bonRouter);

export const mockObsRouter = Router();
mockObsRouter.use('/', mockDataProvider);

router.use('/mock', mockObsRouter);

export default router;
