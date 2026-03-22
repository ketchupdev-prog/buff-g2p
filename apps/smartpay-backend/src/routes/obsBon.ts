/**
 * Namibia Open Banking Standards (OBS) v1.0 — bon API routes
 * File: `src/routes/obsBon.ts` (mounted at `/api/v1/obs/bon` via `routes/obs/index.ts`)
 * 
 * Implements complete REST API following OBS URI structure:
 * https://{provider}/bon/{version}/{industry}/{resource}
 * 
 * Example: https://api.smartpay.na/bon/v1/banking/accounts
 * 
 * Standards: Chapter 9.1.2 - Resource Naming Standards
 */

import express, { Request, Response, NextFunction } from 'express';
import * as ConsentService from '../services/obs/ConsentService';
import * as AISService from '../services/obs/AccountInformationService';
import * as PISService from '../services/obs/PaymentInitiationService';
import {
  OBSRequestHeaders,
  OBSResponseHeaders,
  OBSErrorResponse,
  OBSErrorCode,
} from '../types/obs';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════

/**
 * Validate OBS Request Headers (OBS 9.1.5)
 */
function validateOBSHeaders(req: Request, res: Response, next: NextFunction) {
  const participantId = req.headers['participantid'] as string;
  const apiVersion = req.headers['x-v'] as string;

  if (!participantId) {
    return sendOBSError(res, 400, {
      code: OBSErrorCode.INVALID_REQUEST,
      title: 'Missing ParticipantId header',
      detail: 'ParticipantId header is required for all requests',
    });
  }

  if (!apiVersion) {
    return sendOBSError(res, 400, {
      code: OBSErrorCode.INVALID_REQUEST,
      title: 'Missing x-v header',
      detail: 'x-v header is required to specify API version',
    });
  }

  // Validate API version
  if (apiVersion !== '1') {
    return sendOBSError(res, 406, {
      code: OBSErrorCode.INVALID_REQUEST,
      title: 'Unsupported API version',
      detail: `API version ${apiVersion} is not supported. Supported version: 1`,
    });
  }

  // Store in request for later use
  req.obsHeaders = {
    ParticipantId: participantId,
    'x-v': apiVersion,
  };

  next();
}

/**
 * Extract and validate Bearer token
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Set OBS Response Headers (OBS 9.1.6)
 */
function setOBSResponseHeaders(res: Response, dpParticipantId: string = 'API000001') {
  res.setHeader('ParticipantId', dpParticipantId);
  res.setHeader('x-v', '1');
}

/**
 * Send OBS-compliant error response
 */
function sendOBSError(res: Response, statusCode: number, error: any) {
  const response: OBSErrorResponse = {
    errors: [
      {
        code: error.code || OBSErrorCode.INTERNAL_SERVER_ERROR,
        title: error.title || 'Internal Server Error',
        detail: error.detail || 'An unexpected error occurred',
        source: error.source,
      },
    ],
  };

  setOBSResponseHeaders(res);
  res.status(statusCode).json(response);
}

// ═══════════════════════════════════════════════════════════
// CONSENT ENDPOINTS (Common Service)
// ═══════════════════════════════════════════════════════════

/**
 * POST /bon/v1/common/par
 * Pushed Authorization Request (RFC 9126)
 */
router.post('/v1/common/par', validateOBSHeaders, async (req, res) => {
  try {
    const tppParticipantId = req.obsHeaders!.ParticipantId;
    const dpParticipantId = req.body.dp_participant_id || 'API000001'; // SmartPay as DP

    const result = await ConsentService.createPushedAuthorizationRequest(
      req.body,
      tppParticipantId,
      dpParticipantId
    );

    setOBSResponseHeaders(res, dpParticipantId);
    res.status(201).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * POST /bon/v1/common/token
 * Token Exchange (OAuth 2.0)
 */
router.post('/v1/common/token', validateOBSHeaders, async (req, res) => {
  try {
    const tppParticipantId = req.obsHeaders!.ParticipantId;

    let result;
    if (req.body.grant_type === 'authorization_code') {
      result = await ConsentService.exchangeAuthorizationCode(req.body, tppParticipantId);
    } else if (req.body.grant_type === 'refresh_token') {
      result = await ConsentService.refreshAccessToken(req.body, tppParticipantId);
    } else {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.UNSUPPORTED_GRANT_TYPE,
        title: 'Unsupported grant type',
        detail: 'Only authorization_code and refresh_token are supported',
      });
    }

    setOBSResponseHeaders(res);
    res.status(200).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * POST /bon/v1/common/revoke
 * Token Revocation
 */
router.post('/v1/common/revoke', validateOBSHeaders, async (req, res) => {
  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.INVALID_REQUEST,
        title: 'Missing token',
        detail: 'token parameter is required',
      });
    }

    await ConsentService.revokeAccessToken(token, 'Revoked by TPP');

    setOBSResponseHeaders(res);
    res.status(200).json({ success: true });
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * GET /bon/v1/common/consents/:consentId
 * Get Consent Details
 */
router.get('/v1/common/consents/:consentId', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    // Validate token first
    await ConsentService.validateAccessToken(accessToken);

    const consentId = req.params.consentId;
    if (!consentId) {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.INVALID_REQUEST,
        title: 'Missing consentId',
        detail: 'consentId path param is required',
      });
    }

    const consent = await ConsentService.getConsent(consentId);

    setOBSResponseHeaders(res);
    res.status(200).json({ data: consent });
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * DELETE /bon/v1/common/consents/:consentId
 * Revoke Consent
 */
router.delete('/v1/common/consents/:consentId', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const tppParticipantId = req.obsHeaders!.ParticipantId;
    const consentId = req.params.consentId;
    if (!consentId) {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.INVALID_REQUEST,
        title: 'Missing consentId',
        detail: 'consentId path param is required',
      });
    }

    await ConsentService.revokeConsentByTPP(consentId, tppParticipantId, req.body.reason);

    setOBSResponseHeaders(res);
    res.status(204).send();
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

// ═══════════════════════════════════════════════════════════
// ACCOUNT INFORMATION SERVICE (AIS) ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /bon/v1/banking/accounts
 * List Accounts (OBS 9.2.5 - Use Case 1)
 */
router.get('/v1/banking/accounts', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const query = {
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      'page-size': req.query['page-size'] ? parseInt(req.query['page-size'] as string) : undefined,
    };

    const result = await AISService.listAccounts(accessToken, query);

    setOBSResponseHeaders(res);
    res.status(200).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * GET /bon/v1/banking/accounts/:accountId/balances
 * Get Account Balance (OBS 9.2.5 - Use Case 2)
 */
router.get('/v1/banking/accounts/:accountId/balances', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const accountId = req.params.accountId;
    if (!accountId) {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.INVALID_REQUEST,
        title: 'Missing accountId',
        detail: 'accountId path param is required',
      });
    }

    const result = await AISService.getAccountBalance(accessToken, accountId);

    setOBSResponseHeaders(res);
    res.status(200).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * GET /bon/v1/banking/accounts/:accountId/transactions
 * List Transactions (OBS 9.2.5 - Use Case 3)
 */
router.get('/v1/banking/accounts/:accountId/transactions', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const query = {
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      'page-size': req.query['page-size'] ? parseInt(req.query['page-size'] as string) : undefined,
    };

    const accountId = req.params.accountId;
    if (!accountId) {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.INVALID_REQUEST,
        title: 'Missing accountId',
        detail: 'accountId path param is required',
      });
    }

    const result = await AISService.listTransactions(accessToken, accountId, query);

    setOBSResponseHeaders(res);
    res.status(200).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

// ═══════════════════════════════════════════════════════════
// PAYMENT INITIATION SERVICE (PIS) ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * POST /bon/v1/banking/payments
 * Initiate Payment (OBS 9.2.5 - PIS Use Case 1)
 */
router.post('/v1/banking/payments', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const tppParticipantId = req.obsHeaders!.ParticipantId;
    const dpParticipantId = 'API000001'; // SmartPay as DP

    const result = await PISService.initiatePayment(
      accessToken,
      req.body.data,
      tppParticipantId,
      dpParticipantId
    );

    setOBSResponseHeaders(res, dpParticipantId);
    res.status(201).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * GET /bon/v1/banking/beneficiaries
 * List Beneficiaries (OBS 9.2.5 - PIS Use Case 2)
 */
router.get('/v1/banking/beneficiaries', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const result = await PISService.listBeneficiaries(accessToken);

    setOBSResponseHeaders(res);
    res.status(200).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

/**
 * GET /bon/v1/banking/payments/:paymentId
 * Get Payment Status (OBS 9.2.5 - PIS Use Case 3)
 */
router.get('/v1/banking/payments/:paymentId', validateOBSHeaders, async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return sendOBSError(res, 401, {
        code: OBSErrorCode.UNAUTHORIZED_CLIENT,
        title: 'Missing access token',
        detail: 'Authorization header with Bearer token is required',
      });
    }

    const tppParticipantId = req.obsHeaders!.ParticipantId;
    const paymentId = req.params.paymentId;
    if (!paymentId) {
      return sendOBSError(res, 400, {
        code: OBSErrorCode.INVALID_REQUEST,
        title: 'Missing paymentId',
        detail: 'paymentId path param is required',
      });
    }
    const result = await PISService.getPaymentStatus(
      accessToken,
      paymentId,
      tppParticipantId
    );

    setOBSResponseHeaders(res);
    res.status(200).json(result);
  } catch (error: any) {
    handleOBSError(res, error);
  }
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

function handleOBSError(res: Response, error: any) {
  console.error('OBS API Error:', error);

  if (error.obsError) {
    const statusCode = getStatusCodeForError(error.obsError.code);
    sendOBSError(res, statusCode, error.obsError);
  } else {
    sendOBSError(res, 500, {
      code: OBSErrorCode.INTERNAL_SERVER_ERROR,
      title: 'Internal Server Error',
      detail: error.message || 'An unexpected error occurred',
    });
  }
}

function getStatusCodeForError(code: OBSErrorCode): number {
  const statusCodes: Record<string, number> = {
    [OBSErrorCode.INVALID_REQUEST]: 400,
    [OBSErrorCode.INVALID_CLIENT]: 400,
    [OBSErrorCode.INVALID_GRANT]: 400,
    [OBSErrorCode.UNAUTHORIZED_CLIENT]: 401,
    [OBSErrorCode.UNSUPPORTED_GRANT_TYPE]: 400,
    [OBSErrorCode.INVALID_SCOPE]: 400,
    [OBSErrorCode.RESOURCE_NOT_FOUND]: 404,
    [OBSErrorCode.RESOURCE_INVALID]: 400,
    [OBSErrorCode.CONSENT_INVALID]: 400,
    [OBSErrorCode.CONSENT_EXPIRED]: 403,
    [OBSErrorCode.CONSENT_REVOKED]: 403,
    [OBSErrorCode.CONSENT_NOT_AUTHORISED]: 403,
    [OBSErrorCode.PAYMENT_INVALID]: 400,
    [OBSErrorCode.INSUFFICIENT_FUNDS]: 400,
    [OBSErrorCode.PAYMENT_TIMEOUT]: 408,
    [OBSErrorCode.PAYMENT_REJECTED]: 400,
    [OBSErrorCode.TOO_MANY_REQUESTS]: 429,
    [OBSErrorCode.INTERNAL_SERVER_ERROR]: 500,
    [OBSErrorCode.SERVICE_UNAVAILABLE]: 503,
    [OBSErrorCode.GATEWAY_TIMEOUT]: 504,
  };

  return statusCodes[code] || 500;
}

// ═══════════════════════════════════════════════════════════
// TYPE AUGMENTATION
// ═══════════════════════════════════════════════════════════

declare global {
  namespace Express {
    interface Request {
      obsHeaders?: OBSRequestHeaders;
    }
  }
}

export default router;
