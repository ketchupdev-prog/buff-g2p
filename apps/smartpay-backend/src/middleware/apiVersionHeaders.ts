/**
 * API versioning headers for Smartpay backend.
 * - API-Version: sent on all /api/* responses (RFC-style capability hint).
 * - Deprecation: on unversioned legacy mounts (/api/* without /api/v1 prefix).
 */
import { Request, Response, NextFunction } from 'express';

export const API_VERSION = '1';

/**
 * Sets API-Version on every response for requests under /api.
 * Place early in the stack (after body parsers).
 */
export function withApiVersionHeader(req: Request, res: Response, next: NextFunction): void {
  const path = req.originalUrl?.split('?')[0] ?? req.path;
  if (path.startsWith('/api')) {
    res.setHeader('API-Version', API_VERSION);
  }
  next();
}

/**
 * Marks responses from legacy unversioned paths as deprecated.
 * Use only on mounts like `/api` (not `/api/v1`).
 *
 * @see docs/API_ROUTING.md
 */
export function withLegacyApiDeprecation(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Deprecation', 'true');
  res.setHeader(
    'Link',
    '</api/v1>; rel="successor-version"; title="Smartpay API v1"'
  );
  res.setHeader('Warning', '299 - "Deprecated path; prefer /api/v1/*"');
  next();
}
