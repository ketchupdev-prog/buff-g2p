/**
 * Mobile API Routes Index
 * Location: fintech/smartpay/backend/src/routes/mobile/index.ts
 * Registers all mobile API endpoints for the Smartpay Copilot
 *
 * Paths are relative to the API mount (/api/v1 or legacy /api). Auth mount differs:
 * - v1: /auth → /api/v1/auth/*
 * - legacy: /v1/auth → /api/v1/auth/* (avoids clashing with /api/auth security API)
 */
import { Router } from 'express';
import sendMoneyRouter from './sendMoney';
import cashOutRouter from './cashOut';
import vouchersRouter from './vouchers';
import loansRouter from './loans';
import groupsRouter from './groups';
import proofOfLifeRouter from './proofOfLife';
import incidentsRouter from './incidents';
import agentsRouter, { agentLocationAliasRouter } from '../v1/agents';
import walletsRouter from './wallets';
import transactionsRouter from './transactions';
import inviteRouter from './invite';
import notificationsRouter from './notifications';
import usersRouter from './users';
import userMgmtRouter from '../users';
import authRouter from '../auth';

/** Shared mobile routes (no auth mount — see createMobileApiRouter). */
export const mobileRoutesBase = Router();

mobileRoutesBase.use(sendMoneyRouter);
mobileRoutesBase.use(cashOutRouter);
mobileRoutesBase.use(vouchersRouter);
mobileRoutesBase.use(loansRouter);
mobileRoutesBase.use(groupsRouter);
mobileRoutesBase.use(inviteRouter);

mobileRoutesBase.use(proofOfLifeRouter);
mobileRoutesBase.use(incidentsRouter);

mobileRoutesBase.use('/agents', agentsRouter);
mobileRoutesBase.use(agentLocationAliasRouter);

mobileRoutesBase.use(walletsRouter);
mobileRoutesBase.use(transactionsRouter);
mobileRoutesBase.use(notificationsRouter);
mobileRoutesBase.use(usersRouter);
mobileRoutesBase.use('/users', userMgmtRouter);

mobileRoutesBase.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'smartpay-mobile-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      sendMoney: '/api/v1/send-money',
      cashOut: {
        bank: '/api/v1/cash-out/bank',
        till: '/api/v1/cash-out/till',
        agent: '/api/v1/cash-out/agent',
        merchant: '/api/v1/cash-out/merchant',
        atm: '/api/v1/cash-out/atm',
      },
      vouchers: {
        list: '/api/v1/vouchers',
        redeemByCode: '/api/v1/vouchers/redeem',
        redeem: '/api/v1/vouchers/:id/redeem',
        redeemNampost: '/api/v1/vouchers/:id/redeem-nampost',
        redeemSmartpay: '/api/v1/vouchers/:id/redeem-smartpay',
      },
      loans: {
        eligibility: '/api/v1/loans/eligibility',
        apply: '/api/v1/loans/apply',
        list: '/api/v1/loans',
      },
      groups: {
        list: '/api/v1/groups',
        create: '/api/v1/groups',
        details: '/api/v1/groups/:groupId',
        inviteMember: '/api/v1/groups/:groupId/members',
        join: '/api/v1/groups/:groupId/join',
        removeMember: '/api/v1/groups/:groupId/members/:memberId',
        createSplit: '/api/v1/groups/:groupId/split',
        paySplit: '/api/v1/groups/:groupId/splits/:splitId/pay',
        remindSplit: '/api/v1/groups/:groupId/splits/:splitId/remind',
        delete: '/api/v1/groups/:groupId',
        wallet: '/api/v1/groups/:id/wallet',
        contributions: '/api/v1/groups/:id/contributions',
        contribute: '/api/v1/groups/:id/contribute',
        withdraw: '/api/v1/groups/:id/withdraw',
        send: '/api/v1/groups/:id/send',
      },
      invite: {
        validate: '/api/v1/invite/validate?code=XXX',
        register: '/api/v1/invite/register',
        me: '/api/v1/invite/me',
        referrals: '/api/v1/invite/referrals',
        leaderboard: '/api/v1/invite/leaderboard',
      },
      proofOfLife: {
        profile: '/api/v1/user/profile',
        startVerification: '/api/v1/user/proof-of-life',
        completeVerification: '/api/v1/user/proof-of-life/verify',
      },
      incidents: {
        create: '/api/v1/incidents',
        list: '/api/v1/incidents',
        detail: '/api/v1/incidents/:id',
      },
      agents: {
        nearest: '/api/v1/agents/nearest',
        atmsNearby: '/api/v1/atms/nearby',
        locationsNampost: '/api/v1/locations/nampost',
        search: '/api/v1/agents/search',
        byCode: '/api/v1/agents/:agentCode',
        byRegion: '/api/v1/agents/region/:region',
      },
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      notifications: {
        list: '/api/v1/notifications',
        markRead: '/api/v1/notifications/:id/read',
        markAllRead: '/api/v1/notifications/mark-all-read',
        delete: '/api/v1/notifications/:id',
      },
      users: {
        lookup: '/api/v1/users/lookup',
      },
      paymentRequests: {
        create: '/api/v1/payment-requests',
        get: '/api/v1/payment-requests/:id',
        pay: '/api/v1/payment-requests/:id/pay',
        cancel: '/api/v1/payment-requests/:id/cancel',
      },
    },
  });
});

export function createMobileApiRouter(authMount: '/auth' | '/v1/auth'): Router {
  const r = Router();
  r.use(mobileRoutesBase);
  r.use(authMount, authRouter);
  return r;
}

/** Mounted at /api/v1 — mobile auth at /api/v1/auth */
export const mobileRoutesV1 = createMobileApiRouter('/auth');

/** Mounted at /api — mobile auth at /api/v1/auth (legacy alias, not /api/auth) */
export const mobileRoutesLegacyApiMount = createMobileApiRouter('/v1/auth');

export default mobileRoutesV1;
