/**
 * API v1 router composition — all paths are relative to the mount (/api/v1 or legacy /api).
 * @see docs/API_ROUTING.md
 */
import { Router } from 'express';
import { mobileRoutesV1, mobileRoutesLegacyApiMount } from '../mobile';
import complianceDocsRoutes from '../complianceDocs';
import complianceRoutes from '../compliance';
import kycRoutes from '../kyc';
import copilotProxyRoutes from '../copilotProxy';
import copilotRoutes from '../copilotEndpoint';
import knowledgeBaseRoutes from '../knowledgeBase';
import buffrRoutes from '../buffr';
import buffrWebhooks from '../buffr-webhooks';
import obsRoutes from '../obs';
import {
  fraudRoutes,
  securityAuthApiRoutes,
  auditRoutes,
  paymentRoutes,
} from '../../security';

function buildVersionedApiRouter(mobileRouter: Router): Router {
  const r = Router();
  r.use(mobileRouter);
  r.use(complianceDocsRoutes);
  r.use(complianceRoutes);
  r.use(kycRoutes);
  r.use(copilotProxyRoutes);
  r.use(copilotRoutes);
  r.use(knowledgeBaseRoutes);
  r.use('/buffr', buffrRoutes);
  r.use('/buffr', buffrWebhooks);
  r.use('/obs', obsRoutes);
  r.use('/security/fraud', fraudRoutes);
  r.use('/security/auth', securityAuthApiRoutes);
  r.use('/security/audit', auditRoutes);
  r.use('/security/payments', paymentRoutes);
  return r;
}

/** Canonical mount: app.use('/api/v1', v1Router) */
export const v1Router = buildVersionedApiRouter(mobileRoutesV1);

/**
 * Legacy unversioned alias: app.use('/api', withLegacyApiDeprecation, legacyApiRouter)
 * Mobile OTP stays at /api/v1/auth (not /api/auth — reserved for PSD-12 security API).
 */
export const legacyApiRouter = buildVersionedApiRouter(mobileRoutesLegacyApiMount);

export default v1Router;
