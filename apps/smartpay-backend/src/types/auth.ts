/**
 * Shared auth principal types for middleware/services.
 *
 * Location: src/types/auth.ts
 */

export interface AuthPrincipal {
  sub: string;
  email?: string;
  sessionId?: string;
}

export interface AuthVerificationResult {
  valid: boolean;
  principal?: AuthPrincipal;
  error?: string;
}
