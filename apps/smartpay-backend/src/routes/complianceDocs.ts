/**
 * Compliance documentation API.
 * GET /api/v1/compliance/docs – returns list of compliance reference docs (PRD §10.3).
 * Location: backend/src/routes/complianceDocs.ts
 */
import { Router, Request, Response } from 'express';
import { COMPLIANCE_DOCS } from '../lib/complianceReferences';

const router = Router();

/**
 * GET /api/v1/compliance/docs
 * Returns compliance reference documents for KYC/AML and BON PSD.
 * No auth required (read-only reference list). Rate-limited by standard middleware.
 */
router.get('/compliance/docs', (_req: Request, res: Response) => {
  res.status(200).json({
    docs: COMPLIANCE_DOCS,
    description: 'Smartpay compliance reference documentation (Namibia KYC, BON PSD). Use paths relative to project root.',
  });
});

export default router;
