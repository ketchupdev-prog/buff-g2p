/**
 * mTLS client reference – Buffr G2P Backend.
 * When calling Data Provider (bank) APIs per Namibian Open Banking, use HTTPS agent with QWAC
 * and request headers: Authorization: Bearer <access_token>, x-v: 1, ParticipantId, x-fapi-interaction-id.
 * Mobile app does not perform mTLS; it calls Buffr backend over HTTPS.
 * Location: backend/src/lib/mTLSClient.ts
 */

// import https from 'https';
// import { readFileSync } from 'fs';
// import { randomUUID } from 'crypto';

// export function createMTLSAgent(certPath: string, keyPath: string, caPath?: string): https.Agent {
//   const options: https.AgentOptions = {
//     cert: readFileSync(certPath),
//     key: readFileSync(keyPath),
//   };
//   if (caPath) options.ca = readFileSync(caPath);
//   return new https.Agent(options);
// }

/**
 * Open Banking request headers per Namibian Open Banking Standards v1.0 (§9.1).
 * Use for every request from TPP (Buffr backend) to Data Provider (bank).
 */
// export function openBankingHeaders(accessToken: string, participantId: string): Record<string, string> {
//   return {
//     Authorization: `Bearer ${accessToken}`,
//     'Content-Type': 'application/json',
//     'x-v': '1',
//     ParticipantId: participantId,
//     'x-fapi-interaction-id': randomUUID(),
//   };
// }
