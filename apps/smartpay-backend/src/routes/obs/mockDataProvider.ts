/**
 * Mock Data Provider Implementation
 * Simulates FNB and Bank Windhoek OBS endpoints for testing
 * Implements PAR, Authorization, Token Exchange, AIS, and PISP
 * Location: fintech/smartpay/backend/src/routes/obs/mockDataProvider.ts
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

const mockSessions = new Map<
  string,
  {
    requestUri: string;
    clientId: string;
    scopes: string[];
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    consentId: string;
    expiresAt: number;
  }
>();

const mockAuthorizations = new Map<
  string,
  {
    code: string;
    state: string;
    codeChallenge: string;
    expiresAt: number;
  }
>();

const mockTokens = new Map<
  string,
  {
    accessToken: string;
    refreshToken: string;
    scope: string;
    expiresAt: number;
  }
>();

const mockAccounts = [
  {
    accountId: 'ACC-FNB-001',
    accountType: 'Current',
    currency: 'NAD',
    nickname: 'Main Account',
    accountNumber: '****1234',
  },
  {
    accountId: 'ACC-FNB-002',
    accountType: 'Savings',
    currency: 'NAD',
    nickname: 'Savings',
    accountNumber: '****5678',
  },
];

const mockBalances = [
  {
    accountId: 'ACC-FNB-001',
    balance: 4250.75,
    availableBalance: 4100.25,
    currency: 'NAD',
    creditDebitIndicator: 'Credit',
    type: 'InterimAvailable',
  },
  {
    accountId: 'ACC-FNB-002',
    balance: 12890.50,
    availableBalance: 12890.50,
    currency: 'NAD',
    creditDebitIndicator: 'Credit',
    type: 'InterimAvailable',
  },
];

const mockTransactions = [
  {
    transactionId: 'TXN-001',
    accountId: 'ACC-FNB-001',
    amount: 1500.0,
    currency: 'NAD',
    creditDebitIndicator: 'Debit',
    status: 'Booked',
    bookingDateTime: '2026-03-10T10:30:00Z',
    valueDateTime: '2026-03-10T10:30:00Z',
    transactionInformation: 'POS Purchase - Checkers',
    merchantName: 'Checkers',
    merchantCategoryCode: '5411',
  },
  {
    transactionId: 'TXN-002',
    accountId: 'ACC-FNB-001',
    amount: 5000.0,
    currency: 'NAD',
    creditDebitIndicator: 'Credit',
    status: 'Booked',
    bookingDateTime: '2026-03-01T08:00:00Z',
    valueDateTime: '2026-03-01T08:00:00Z',
    transactionInformation: 'Salary Payment',
  },
  {
    transactionId: 'TXN-003',
    accountId: 'ACC-FNB-001',
    amount: 350.0,
    currency: 'NAD',
    creditDebitIndicator: 'Debit',
    status: 'Booked',
    bookingDateTime: '2026-03-08T14:22:00Z',
    valueDateTime: '2026-03-08T14:22:00Z',
    transactionInformation: 'ATM Withdrawal',
  },
];

/**
 * POST /mock/obs/par
 * Pushed Authorization Request (RFC 9126)
 */
router.post('/par', (req: Request, res: Response) => {
  try {
    const {
      client_id,
      response_type,
      redirect_uri,
      state,
      scope,
      code_challenge,
      code_challenge_method,
      consent_id,
    } = req.body;

    if (!client_id || !redirect_uri || !state || !scope || !code_challenge) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      });
    }

    if (code_challenge_method !== 'S256') {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Only S256 code_challenge_method is supported',
      });
    }

    const requestUri = `urn:ietf:params:oauth:request_uri:${crypto.randomBytes(16).toString('hex')}`;
    const expiresIn = 300;

    mockSessions.set(requestUri, {
      requestUri,
      clientId: client_id,
      scopes: scope.split(' '),
      redirectUri: redirect_uri,
      state,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      consentId: consent_id,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    return res.json({
      request_uri: requestUri,
      expires_in: expiresIn,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

/**
 * GET /mock/obs/authorize
 * Authorization endpoint - simulates user consent at bank
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const { client_id, request_uri } = req.query;

    if (!client_id || !request_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing client_id or request_uri',
      });
    }

    const session = mockSessions.get(request_uri as string);

    if (!session || session.expiresAt < Date.now()) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid or expired request_uri',
      });
    }

    const authCode = `AUTH_${crypto.randomBytes(16).toString('hex')}`;

    mockAuthorizations.set(authCode, {
      code: authCode,
      state: session.state,
      codeChallenge: session.codeChallenge,
      expiresAt: Date.now() + 600000,
    });

    mockSessions.delete(request_uri as string);

    const redirectUrl = `${session.redirectUri}?code=${authCode}&state=${session.state}`;

    return res.redirect(redirectUrl);
  } catch (error: any) {
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

/**
 * POST /mock/obs/token
 * Token exchange endpoint
 */
router.post('/token', (req: Request, res: Response) => {
  try {
    const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported',
      });
    }

    if (!code || !redirect_uri || !client_id || !code_verifier) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      });
    }

    const authorization = mockAuthorizations.get(code);

    if (!authorization || authorization.expiresAt < Date.now()) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
      });
    }

    const computedChallenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    if (computedChallenge !== authorization.codeChallenge) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Code verifier does not match code challenge',
      });
    }

    const accessToken = `ACCESS_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `REFRESH_${crypto.randomBytes(32).toString('hex')}`;
    const expiresIn = 3600;

    mockTokens.set(accessToken, {
      accessToken,
      refreshToken,
      scope: 'banking:accounts.basic.read banking:payments.write',
      expiresAt: Date.now() + expiresIn * 1000,
    });

    mockAuthorizations.delete(code);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: 'banking:accounts.basic.read banking:payments.write',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

/**
 * POST /mock/obs/revoke
 * Token revocation endpoint
 */
router.post('/revoke', (req: Request, res: Response) => {
  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing token parameter',
      });
    }

    mockTokens.delete(token);

    return res.status(200).send();
  } catch (error: any) {
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

/**
 * Middleware to verify Bearer token
 */
function verifyToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.substring(7);
  const tokenData = mockTokens.get(token);

  if (!tokenData || tokenData.expiresAt < Date.now()) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token is expired or invalid',
    });
  }

  (req as any).tokenData = tokenData;
  next();
}

/**
 * GET /mock/obs/accounts
 * AIS: Get accounts
 */
router.get('/accounts', verifyToken, (req: Request, res: Response) => {
  return res.json({
    Data: {
      Account: mockAccounts,
    },
    Links: {
      Self: '/mock/obs/accounts',
    },
    Meta: {
      TotalPages: 1,
    },
  });
});

/**
 * POST /mock/obs/balances
 * AIS: Get balances
 */
router.post('/balances', verifyToken, (req: Request, res: Response) => {
  const { accountIds } = req.body;

  if (!accountIds || !Array.isArray(accountIds)) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'accountIds array is required',
    });
  }

  const filteredBalances = mockBalances.filter((b) => accountIds.includes(b.accountId));

  return res.json({
    Data: {
      Balance: filteredBalances,
    },
    Links: {
      Self: '/mock/obs/balances',
    },
  });
});

/**
 * GET /mock/obs/transactions
 * AIS: Get transactions
 */
router.get('/transactions', verifyToken, (req: Request, res: Response) => {
  const { accountId, fromDate, toDate, limit } = req.query;

  if (!accountId) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'accountId is required',
    });
  }

  let filteredTransactions = mockTransactions.filter((t) => t.accountId === accountId);

  if (fromDate) {
    filteredTransactions = filteredTransactions.filter(
      (t) => new Date(t.bookingDateTime) >= new Date(fromDate as string)
    );
  }

  if (toDate) {
    filteredTransactions = filteredTransactions.filter(
      (t) => new Date(t.bookingDateTime) <= new Date(toDate as string)
    );
  }

  if (limit) {
    filteredTransactions = filteredTransactions.slice(0, parseInt(limit as string));
  }

  return res.json({
    Data: {
      Transaction: filteredTransactions,
    },
    Links: {
      Self: `/mock/obs/transactions?accountId=${accountId}`,
    },
    Meta: {
      TotalPages: 1,
      FirstAvailableDateTime: '2026-01-01T00:00:00Z',
      LastAvailableDateTime: new Date().toISOString(),
    },
  });
});

/**
 * POST /mock/obs/payments
 * PISP: Initiate payment
 */
router.post('/payments', verifyToken, (req: Request, res: Response) => {
  const {
    debtorAccount,
    instructedAmount,
    creditorAccount,
    creditorName,
    remittanceInformationUnstructured,
  } = req.body;

  if (!debtorAccount || !instructedAmount || !creditorAccount || !creditorName) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing required payment parameters',
    });
  }

  const paymentId = `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const scaRedirectUri = `https://mock-bank.example.com/sca?paymentId=${paymentId}`;

  return res.status(201).json({
    Data: {
      PaymentId: paymentId,
      ConsentId: req.body.consentId ?? 'CONSENT-MOCK-001',
      Status: 'AwaitingAuthorisation',
      CreationDateTime: new Date().toISOString(),
      StatusUpdateDateTime: new Date().toISOString(),
      Initiation: {
        InstructedAmount: instructedAmount,
        DebtorAccount: debtorAccount,
        CreditorAccount: creditorAccount,
        CreditorName: creditorName,
        RemittanceInformation: {
          Unstructured: remittanceInformationUnstructured ?? 'Payment',
        },
      },
    },
    Links: {
      Self: `/mock/obs/payments/${paymentId}`,
      scaRedirect: {
        href: scaRedirectUri,
      },
    },
    Meta: {},
  });
});

/**
 * GET /mock/obs/payments/:paymentId
 * PISP: Get payment status
 */
router.get('/payments/:paymentId', verifyToken, (req: Request, res: Response) => {
  const { paymentId } = req.params;

  return res.json({
    Data: {
      PaymentId: paymentId,
      Status: 'AcceptedSettlementCompleted',
      CreationDateTime: new Date(Date.now() - 3600000).toISOString(),
      StatusUpdateDateTime: new Date().toISOString(),
    },
    Links: {
      Self: `/mock/obs/payments/${paymentId}`,
    },
  });
});

export default router;
