/**
 * Payment Initiation Service (PIS) — PostgreSQL via `pool` (Neon-compatible).
 */

import { pool } from '../../lib/db';
import crypto from 'crypto';
import { validateAccessToken } from './ConsentService';
import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  Beneficiary,
  PaymentStatus,
  OBSResponse,
  OBSErrorCode,
  OBSError,
} from '../../types/obs';

export async function initiatePayment(
  accessToken: string,
  request: PaymentInitiationRequest,
  tppParticipantId: string,
  dpParticipantId: string
): Promise<OBSResponse<PaymentInitiationResponse>> {
  const consent = await validateAccessToken(accessToken);

  if (!consent.scopes.includes('banking:payments.write')) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Insufficient scope',
      'Token does not have banking:payments.write scope'
    );
  }

  const validPaymentTypes = ['OnUs', 'EnCR', 'NRTC', 'RTGS', 'IPP'];
  if (!validPaymentTypes.includes(request.paymentType)) {
    throw createOBSError(
      OBSErrorCode.PAYMENT_INVALID,
      'Invalid payment type',
      `Payment type must be one of: ${validPaymentTypes.join(', ')}`
    );
  }

  const accR = await pool.query(
    `SELECT * FROM obs_accounts
     WHERE account_id = $1 AND account_holder_id = $2 AND dp_participant_id = $3 AND status = 'open'`,
    [request.debtorAccount.accountId, consent.accountHolderId, consent.dpParticipantId]
  );
  const debtorAccount = accR.rows[0] as Record<string, unknown> | undefined;

  if (!debtorAccount) {
    throw createOBSError(
      OBSErrorCode.RESOURCE_NOT_FOUND,
      'Debtor account not found',
      'Debtor account does not exist or is not accessible'
    );
  }

  if (
    consent.accounts &&
    consent.accounts.length > 0 &&
    !consent.accounts.includes(request.debtorAccount.accountId)
  ) {
    throw createOBSError(
      OBSErrorCode.CONSENT_INVALID,
      'Account not consented',
      'Debtor account is not in the list of consented accounts'
    );
  }

  if (request.instructedAmount.amount <= 0) {
    throw createOBSError(
      OBSErrorCode.PAYMENT_INVALID,
      'Invalid amount',
      'Payment amount must be greater than 0'
    );
  }

  if (request.instructedAmount.currency !== 'NAD') {
    throw createOBSError(
      OBSErrorCode.PAYMENT_INVALID,
      'Invalid currency',
      'Only NAD currency is supported'
    );
  }

  const balR = await pool.query(
    `SELECT * FROM obs_balances
     WHERE account_internal_id = $1 AND balance_type = 'Available'
     ORDER BY date_time DESC LIMIT 1`,
    [debtorAccount.id]
  );
  const latestBalance = balR.rows[0] as { amount: number } | undefined;

  if (latestBalance && latestBalance.amount < request.instructedAmount.amount) {
    throw createOBSError(
      OBSErrorCode.INSUFFICIENT_FUNDS,
      'Insufficient funds',
      'Debtor account has insufficient balance for this payment'
    );
  }

  const paymentId = crypto.randomUUID();
  const now = new Date();
  const endToEnd = request.endToEndIdentification || crypto.randomUUID();

  const ins = await pool.query(
    `INSERT INTO obs_payments (
      payment_id, tpp_participant_id, dp_participant_id, account_holder_id, payment_type,
      debtor_account_internal_id, debtor_account_number, creditor_name, creditor_account_number, creditor_bank_id,
      instructed_amount, instructed_currency, remittance_information, end_to_end_identification,
      status, status_reason, creation_date_time, status_update_date_time, consent_external_id
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14,
      'Initiated', $15, $16, $16, $17
    )
    RETURNING *`,
    [
      paymentId,
      tppParticipantId,
      dpParticipantId,
      consent.accountHolderId,
      request.paymentType,
      debtorAccount.id,
      request.debtorAccount.accountNumber ?? null,
      request.creditor.name,
      request.creditor.accountNumber,
      request.creditor.bankId ?? null,
      request.instructedAmount.amount,
      request.instructedAmount.currency,
      request.remittanceInformation ?? null,
      endToEnd,
      'Payment initiated successfully',
      now,
      consent.consentId,
    ]
  );

  const payment = ins.rows[0] as Record<string, unknown>;

  await pool.query(
    `UPDATE obs_payments SET status = 'Pending', status_reason = $2, status_update_date_time = $3 WHERE id = $1`,
    [payment.id, 'Payment accepted for processing', new Date()]
  );

  const data: PaymentInitiationResponse = {
    paymentId: String(payment.payment_id),
    status: 'Pending',
    creationDateTime: new Date(payment.creation_date_time as string).toISOString(),
    statusUpdateDateTime: new Date().toISOString(),
    initiation: {
      paymentType: payment.payment_type as PaymentInitiationResponse['initiation']['paymentType'],
      debtorAccount: {
        accountId: String(debtorAccount.account_id),
        accountNumber: String(payment.debtor_account_number ?? request.debtorAccount.accountNumber ?? ''),
      },
      creditor: {
        name: String(payment.creditor_name),
        accountNumber: String(payment.creditor_account_number),
        bankId: payment.creditor_bank_id ? String(payment.creditor_bank_id) : undefined,
      },
      instructedAmount: {
        amount: Number(payment.instructed_amount),
        currency: String(payment.instructed_currency),
      },
      remittanceInformation: payment.remittance_information
        ? String(payment.remittance_information)
        : undefined,
      endToEndIdentification: payment.end_to_end_identification
        ? String(payment.end_to_end_identification)
        : undefined,
    },
  };

  return { data };
}

export async function listBeneficiaries(accessToken: string): Promise<OBSResponse<Beneficiary[]>> {
  const consent = await validateAccessToken(accessToken);

  if (!consent.scopes.includes('banking:accounts.basic.read')) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Insufficient scope',
      'Token does not have banking:accounts.basic.read scope'
    );
  }

  const r = await pool.query(
    `SELECT * FROM obs_beneficiaries WHERE account_holder_id = $1 ORDER BY added_date DESC`,
    [consent.accountHolderId]
  );

  const data: Beneficiary[] = r.rows.map((b: Record<string, unknown>) => ({
    beneficiaryId: String(b.beneficiary_id),
    name: String(b.name),
    accountNumber: String(b.account_number),
    bankId: b.bank_id ? String(b.bank_id) : undefined,
    bankName: b.bank_name ? String(b.bank_name) : undefined,
    reference: b.reference ? String(b.reference) : undefined,
    addedDate: new Date(b.added_date as string).toISOString(),
  }));

  return { data };
}

export async function getPaymentStatus(
  accessToken: string,
  paymentId: string,
  tppParticipantId: string
): Promise<OBSResponse<PaymentInitiationResponse>> {
  const consent = await validateAccessToken(accessToken);

  if (!consent.scopes.includes('banking:payments.read')) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Insufficient scope',
      'Token does not have banking:payments.read scope'
    );
  }

  const payR = await pool.query(
    `SELECT * FROM obs_payments
     WHERE payment_id = $1 AND tpp_participant_id = $2 AND account_holder_id = $3`,
    [paymentId, tppParticipantId, consent.accountHolderId]
  );
  const payment = payR.rows[0] as Record<string, unknown> | undefined;

  if (!payment) {
    throw createOBSError(
      OBSErrorCode.RESOURCE_NOT_FOUND,
      'Payment not found',
      'Payment does not exist or not accessible'
    );
  }

  const accR = await pool.query(`SELECT account_id FROM obs_accounts WHERE id = $1`, [
    payment.debtor_account_internal_id,
  ]);
  const debtorExtId = accR.rows[0]?.account_id
    ? String(accR.rows[0].account_id)
    : String(payment.debtor_account_internal_id);

  const data: PaymentInitiationResponse = {
    paymentId: String(payment.payment_id),
    status: payment.status as PaymentStatus,
    creationDateTime: new Date(payment.creation_date_time as string).toISOString(),
    statusUpdateDateTime: new Date(payment.status_update_date_time as string).toISOString(),
    initiation: {
      paymentType: payment.payment_type as PaymentInitiationResponse['initiation']['paymentType'],
      debtorAccount: {
        accountId: debtorExtId,
        accountNumber: String(payment.debtor_account_number ?? ''),
      },
      creditor: {
        name: String(payment.creditor_name),
        accountNumber: String(payment.creditor_account_number),
        bankId: payment.creditor_bank_id ? String(payment.creditor_bank_id) : undefined,
      },
      instructedAmount: {
        amount: Number(payment.instructed_amount),
        currency: String(payment.instructed_currency),
      },
      remittanceInformation: payment.remittance_information
        ? String(payment.remittance_information)
        : undefined,
      endToEndIdentification: payment.end_to_end_identification
        ? String(payment.end_to_end_identification)
        : undefined,
    },
  };

  return { data };
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  statusReason?: string,
  actualExecutionDateTime?: Date
): Promise<void> {
  await pool.query(
    `UPDATE obs_payments SET
      status = $2,
      status_reason = $3,
      status_update_date_time = $4,
      actual_execution_date_time = COALESCE($5, actual_execution_date_time)
     WHERE payment_id = $1`,
    [paymentId, status, statusReason ?? null, new Date(), actualExecutionDateTime ?? null]
  );
}

export async function cancelPayment(
  accessToken: string,
  paymentId: string,
  tppParticipantId: string,
  reason?: string
): Promise<void> {
  const consent = await validateAccessToken(accessToken);

  const payR = await pool.query(
    `SELECT id, status FROM obs_payments
     WHERE payment_id = $1 AND tpp_participant_id = $2 AND account_holder_id = $3`,
    [paymentId, tppParticipantId, consent.accountHolderId]
  );
  const payment = payR.rows[0] as { id: string; status: string } | undefined;

  if (!payment) {
    throw createOBSError(
      OBSErrorCode.RESOURCE_NOT_FOUND,
      'Payment not found',
      'Payment does not exist or not accessible'
    );
  }

  if (!['Initiated', 'Pending'].includes(payment.status)) {
    throw createOBSError(
      OBSErrorCode.PAYMENT_INVALID,
      'Cannot cancel payment',
      `Payment status is ${payment.status} and cannot be cancelled`
    );
  }

  await pool.query(
    `UPDATE obs_payments SET status = 'Cancelled', status_reason = $2, status_update_date_time = $3 WHERE id = $1`,
    [payment.id, reason || 'Cancelled by TPP', new Date()]
  );
}

function createOBSError(
  code: OBSErrorCode,
  title: string,
  detail: string
): Error & { obsError: OBSError } {
  const error = new Error(detail) as Error & { obsError: OBSError };
  error.obsError = { code, title, detail };
  return error;
}
