/**
 * Security Module - Centralized Export
 *
 * Complete PSD-12 Compliance Suite:
 * - 2FA Services (Section 12.2)
 * - Fraud Detection (Section 11.6)
 * - Audit Logging (Section 11.13)
 * - Encryption/Tokenization (Section 12.1)
 *
 * HTTP routes:
 * - Canonical: /api/v1/security/{fraud|auth|audit|payments}/*
 * - Legacy (deprecated): /api/{fraud|auth|audit|payments}/* — mounted from src/index.ts
 *
 * Note: /api/auth is the PSD-12 security API (2FA, etc.). Mobile OTP lives at /api/v1/auth only.
 */

import { Application } from 'express';
import { NextFunction, Request, Response } from 'express';

import fraudRoutes from './api/fraud';
import securityAuthApiRoutes from './api/auth';
import auditRoutes from './api/audit';
import paymentRoutes from './api/payments';

import { fraudDetectionService } from './services/FraudDetectionService';
import { twoFactorAuthService } from './services/TwoFactorAuthService';
import { encryptionService } from './services/EncryptionService';

import { require2FAForPayment, check2FAEnabled, initiate2FA } from './middleware/require2FA';

export { fraudRoutes, securityAuthApiRoutes, auditRoutes, paymentRoutes };

export type LegacySecurityMountOptions = {
  /** e.g. withLegacyApiDeprecation from middleware/apiVersionHeaders */
  wrap?: (req: Request, res: Response, next: NextFunction) => void;
};

/**
 * Mount legacy /api/fraud, /api/auth, /api/audit, /api/payments (same handlers as /api/v1/security/*).
 * Register these BEFORE app.use('/api', legacyApiRouter) so /api/auth is not captured by the mobile legacy tree.
 */
export function setupSecurityLegacyRoutes(
  app: Application,
  options?: LegacySecurityMountOptions
): void {
  const w = options?.wrap ?? ((_req: Request, _res: Response, next: NextFunction) => next());
  app.use('/api/fraud', w, fraudRoutes);
  app.use('/api/auth', w, securityAuthApiRoutes);
  app.use('/api/audit', w, auditRoutes);
  app.use('/api/payments', w, paymentRoutes);

  console.log('✅ Security legacy routes mounted (deprecated; prefer /api/v1/security/*):');
  console.log('   - /api/fraud/*');
  console.log('   - /api/auth/*');
  console.log('   - /api/audit/*');
  console.log('   - /api/payments/*');
}

/** Mounts legacy `/api/{fraud|auth|audit|payments}` only (no deprecation wrapper). Main server uses `setupSecurityLegacyRoutes` + `routes/v1/apiRouter.ts`. */
export function setupSecurityRoutes(app: Application): void {
  setupSecurityLegacyRoutes(app);
}

export const securityServices = {
  fraudDetection: fraudDetectionService,
  twoFactorAuth: twoFactorAuthService,
  encryption: encryptionService,
};

export const securityMiddleware = {
  require2FA: require2FAForPayment,
  check2FAEnabled: check2FAEnabled,
  initiate2FA: initiate2FA,
};

export { fraudDetectionService } from './services/FraudDetectionService';
export { twoFactorAuthService } from './services/TwoFactorAuthService';
export { encryptionService } from './services/EncryptionService';
export { require2FAForPayment, check2FAEnabled, initiate2FA } from './middleware/require2FA';

export default {
  setup: setupSecurityLegacyRoutes,
  services: securityServices,
  middleware: securityMiddleware,
};
