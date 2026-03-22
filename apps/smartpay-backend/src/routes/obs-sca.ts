/**
 * Strong Customer Authentication (SCA) Redirect Flow (TPP / bon OAuth consents)
 */

import express, { Request, Response } from 'express';
import * as ConsentService from '../services/obs/ConsentService';
import { pool } from '../lib/db';

const router = express.Router();

router.get('/v1/authorize', async (req: Request, res: Response) => {
  try {
    const { request_uri, client_id } = req.query;

    if (!request_uri || !client_id) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'request_uri and client_id are required',
      });
    }

    const consentId = (request_uri as string).split(':').pop();
    if (!consentId) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid request_uri format',
      });
    }

    const r = await pool.query<{
      consent_id: string;
      status: string;
      scopes: string[];
      expiration_date_time: string;
      tpp_participant_id: string;
      tpp_org: string;
      dp_org: string;
    }>(
      `SELECT c.consent_id, c.status, c.scopes, c.expiration_date_time, c.tpp_participant_id,
              tpp.organization_name AS tpp_org, dp.organization_name AS dp_org
       FROM obs_oauth_consents c
       JOIN obs_participants tpp ON tpp.participant_id = c.tpp_participant_id
       JOIN obs_participants dp ON dp.participant_id = c.dp_participant_id
       WHERE c.consent_id = $1`,
      [consentId]
    );

    const consent = r.rows[0];
    if (!consent) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'Consent request not found',
      });
    }

    if (consent.tpp_participant_id !== client_id) {
      return res.status(400).json({
        error: 'invalid_client',
        error_description: 'client_id does not match',
      });
    }

    if (consent.status !== 'AwaitingAuthorisation') {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: `Consent is already ${consent.status}`,
      });
    }

    const tppName = consent.tpp_org;
    const dpName = consent.dp_org;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Access - ${dpName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 80px; height: 80px; background: #4CAF50; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; }
    .consent-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .consent-item { margin: 10px 0; display: flex; align-items: start; }
    .consent-item::before { content: "✓"; color: #4CAF50; font-weight: bold; margin-right: 10px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .buttons { display: flex; gap: 10px; margin-top: 30px; }
    button { flex: 1; padding: 15px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .btn-approve { background: #4CAF50; color: white; }
    .btn-reject { background: #f44336; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏦</div>
      <h1>${dpName}</h1>
      <p>Authorization Request</p>
    </div>
    <div class="consent-details">
      <h3>${tppName} is requesting access to:</h3>
      ${consent.scopes.map((scope: string) => `<div class="consent-item">${getScopeDescription(scope)}</div>`).join('')}
      <p style="margin-top: 15px; color: #666;">
        <strong>Duration:</strong> Until ${new Date(consent.expiration_date_time).toLocaleDateString()}
      </p>
    </div>
    <div class="warning">
      <strong>Important:</strong> By approving, you authorize ${tppName} to access your account information through ${dpName}.
    </div>
    <div class="buttons">
      <button class="btn-reject" onclick="handleReject()">Reject</button>
      <button class="btn-approve" onclick="handleApprove()">Approve</button>
    </div>
  </div>
  <script>
    async function handleApprove() {
      const response = await fetch('/api/v1/obs/v1/authorize/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId: '${consentId}', approved: true }),
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirectUri + '?code=' + data.authorizationCode + '&state=' + data.state;
      } else {
        alert('Authorization failed. Please try again.');
      }
    }
    async function handleReject() {
      const response = await fetch('/api/v1/obs/v1/authorize/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId: '${consentId}', approved: false }),
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirectUri + '?error=access_denied&error_description=User rejected authorization&state=' + data.state;
      }
    }
  </script>
</body>
</html>
`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Authorization page error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error',
    });
  }
});

router.post('/v1/authorize/confirm', async (req: Request, res: Response) => {
  try {
    const { consentId, approved, accountIds } = req.body;
    const accountHolderId =
      (req as express.Request & { user?: { id?: string } }).user?.id || 'mock-user-id';

    if (approved) {
      const result = await ConsentService.authorizeConsent(
        consentId,
        accountHolderId,
        accountIds || []
      );
      return res.json({
        success: true,
        authorizationCode: result.authorizationCode,
        redirectUri: result.redirectUri,
        state: result.state,
      });
    }

    await ConsentService.rejectConsent(consentId, 'User rejected authorization');

    const r = await pool.query<{ redirect_uri: string | null; state: string | null }>(
      `SELECT redirect_uri, state FROM obs_oauth_consents WHERE consent_id = $1`,
      [consentId]
    );
    const row = r.rows[0];
    if (!row?.redirect_uri) {
      return res.status(404).json({ error: 'not_found' });
    }

    return res.json({
      success: true,
      redirectUri: row.redirect_uri,
      state: row.state,
    });
  } catch (error) {
    console.error('Authorization confirm error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to process authorization',
    });
  }
});

function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    'banking:accounts.basic.read': 'View your account information, balances, and transactions',
    'banking:payments.write': 'Initiate payments from your accounts',
    'banking:payments.read': 'View status of payments made on your behalf',
    'consent:authorisationcode.write': 'Manage authorization',
    'consent:authorisationtoken.write': 'Manage access tokens',
  };
  return descriptions[scope] || scope;
}

export default router;
