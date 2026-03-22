/**
 * Account Information Service (AIS) — PostgreSQL via `pool` (Neon-compatible).
 */

import { pool } from '../../lib/db';
import { validateAccessToken } from './ConsentService';
import {
  Account,
  AccountBalance,
  Transaction,
  ListAccountsQuery,
  ListTransactionsQuery,
  OBSResponse,
  OBSErrorCode,
  OBSError,
  BalanceType,
} from '../../types/obs';

export async function listAccounts(
  accessToken: string,
  query: ListAccountsQuery
): Promise<OBSResponse<Account[]>> {
  const consent = await validateAccessToken(accessToken);

  if (!consent.scopes.includes('banking:accounts.basic.read')) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Insufficient scope',
      'Token does not have banking:accounts.basic.read scope'
    );
  }

  const page = query.page || 1;
  const pageSize = Math.min(query['page-size'] || 25, 1000);
  const offset = (page - 1) * pageSize;

  const hasAccountFilter = consent.accounts && consent.accounts.length > 0;
  const statusFilter = query.status ?? null;

  const whereParts = [
    'account_holder_id = $1',
    'dp_participant_id = $2',
  ];
  const params: unknown[] = [consent.accountHolderId, consent.dpParticipantId];
  let p = 3;

  if (statusFilter) {
    whereParts.push(`status = $${p++}`);
    params.push(statusFilter);
  }
  if (hasAccountFilter) {
    whereParts.push(`account_id = ANY($${p++}::text[])`);
    params.push(consent.accounts);
  }

  const whereSql = whereParts.join(' AND ');

  const countR = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM obs_accounts WHERE ${whereSql}`,
    params
  );
  const totalCount = parseInt(countR.rows[0]?.count ?? '0', 10);

  const accR = await pool.query(
    `SELECT * FROM obs_accounts WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p + 1}`,
    [...params, pageSize, offset]
  );

  const data: Account[] = accR.rows.map((acc: Record<string, unknown>) => ({
    accountId: String(acc.account_id),
    accountNumber: String(acc.account_number),
    accountType: acc.account_type as Account['accountType'],
    accountName: acc.account_name ? String(acc.account_name) : undefined,
    currency: String(acc.currency),
    status: acc.status as Account['status'],
    holderType: acc.holder_type as Account['holderType'] | undefined,
    details: {
      openedDate: acc.opened_date ? new Date(acc.opened_date as string).toISOString() : undefined,
      maturityDate: acc.maturity_date ? new Date(acc.maturity_date as string).toISOString() : undefined,
      interestRate: acc.interest_rate != null ? Number(acc.interest_rate) : undefined,
      overdraftLimit: acc.overdraft_limit != null ? Number(acc.overdraft_limit) : undefined,
    },
  }));

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const baseUrl = `/bon/v1/banking/accounts`;
  const links: Record<string, string> = {};
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&page-size=${pageSize}`;
    links.last = `${baseUrl}?page=${totalPages}&page-size=${pageSize}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&page-size=${pageSize}`;
    links.first = `${baseUrl}?page=1&page-size=${pageSize}`;
  }

  return {
    data,
    links: Object.keys(links).length > 0 ? links : undefined,
    meta: {
      totalRecords: totalCount,
      totalPages,
    },
  };
}

export async function getAccountBalance(
  accessToken: string,
  accountId: string
): Promise<OBSResponse<AccountBalance>> {
  const consent = await validateAccessToken(accessToken);

  if (!consent.scopes.includes('banking:accounts.basic.read')) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Insufficient scope',
      'Token does not have banking:accounts.basic.read scope'
    );
  }

  const accR = await pool.query(
    `SELECT * FROM obs_accounts
     WHERE account_id = $1 AND account_holder_id = $2 AND dp_participant_id = $3`,
    [accountId, consent.accountHolderId, consent.dpParticipantId]
  );
  const account = accR.rows[0] as Record<string, unknown> | undefined;

  if (!account) {
    throw createOBSError(
      OBSErrorCode.RESOURCE_NOT_FOUND,
      'Account not found',
      'Account does not exist or not accessible'
    );
  }

  if (consent.accounts && consent.accounts.length > 0 && !consent.accounts.includes(accountId)) {
    throw createOBSError(
      OBSErrorCode.CONSENT_INVALID,
      'Account not consented',
      'Account is not in the list of consented accounts'
    );
  }

  const balR = await pool.query(
    `SELECT * FROM obs_balances
     WHERE account_internal_id = $1
     ORDER BY date_time DESC
     LIMIT 10`,
    [account.id]
  );

  const data: AccountBalance = {
    accountId: String(account.account_id),
    balances: balR.rows.map((b: Record<string, unknown>) => ({
      type: b.balance_type as AccountBalance['balances'][0]['type'],
      amount: Number(b.amount),
      currency: String(b.currency),
      dateTime: new Date(b.date_time as string).toISOString(),
      creditDebitIndicator: b.credit_debit_indicator as AccountBalance['balances'][0]['creditDebitIndicator'],
    })),
  };

  return { data };
}

export async function listTransactions(
  accessToken: string,
  accountId: string,
  query: ListTransactionsQuery
): Promise<OBSResponse<Transaction[]>> {
  const consent = await validateAccessToken(accessToken);

  if (!consent.scopes.includes('banking:accounts.basic.read')) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Insufficient scope',
      'Token does not have banking:accounts.basic.read scope'
    );
  }

  const accR = await pool.query(
    `SELECT * FROM obs_accounts
     WHERE account_id = $1 AND account_holder_id = $2 AND dp_participant_id = $3`,
    [accountId, consent.accountHolderId, consent.dpParticipantId]
  );
  const account = accR.rows[0] as Record<string, unknown> | undefined;

  if (!account) {
    throw createOBSError(
      OBSErrorCode.RESOURCE_NOT_FOUND,
      'Account not found',
      'Account does not exist or not accessible'
    );
  }

  if (consent.accounts && consent.accounts.length > 0 && !consent.accounts.includes(accountId)) {
    throw createOBSError(
      OBSErrorCode.CONSENT_INVALID,
      'Account not consented',
      'Account is not in the list of consented accounts'
    );
  }

  const fromDate = query.fromDate || consent.transactionFromDateTime;
  const toDate = query.toDate || consent.transactionToDateTime;

  const whereParts = ['account_internal_id = $1'];
  const params: unknown[] = [account.id];
  let p = 2;

  if (fromDate) {
    whereParts.push(`booking_date_time >= $${p++}`);
    params.push(new Date(fromDate));
  }
  if (toDate) {
    whereParts.push(`booking_date_time <= $${p++}`);
    params.push(new Date(toDate));
  }

  const whereSql = whereParts.join(' AND ');

  const page = query.page || 1;
  const pageSize = Math.min(query['page-size'] || 25, 1000);
  const offset = (page - 1) * pageSize;

  const countR = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM obs_transactions WHERE ${whereSql}`,
    params
  );
  const totalCount = parseInt(countR.rows[0]?.count ?? '0', 10);

  const txnR = await pool.query(
    `SELECT * FROM obs_transactions WHERE ${whereSql} ORDER BY booking_date_time DESC LIMIT $${p} OFFSET $${p + 1}`,
    [...params, pageSize, offset]
  );

  const data: Transaction[] = txnR.rows.map((txn: Record<string, unknown>) => ({
    transactionId: String(txn.transaction_id),
    accountId,
    bookingDateTime: new Date(txn.booking_date_time as string).toISOString(),
    valueDateTime: txn.value_date_time
      ? new Date(txn.value_date_time as string).toISOString()
      : undefined,
    transactionInformation: txn.transaction_information
      ? String(txn.transaction_information)
      : undefined,
    amount: {
      amount: Number(txn.amount),
      currency: String(txn.currency),
    },
    creditDebitIndicator: txn.credit_debit_indicator as Transaction['creditDebitIndicator'],
    status: txn.status as Transaction['status'],
    transactionReference: txn.transaction_reference ? String(txn.transaction_reference) : undefined,
    balanceAfterTransaction:
      txn.balance_after_amount != null
        ? {
            amount: Number(txn.balance_after_amount),
            currency: String(txn.balance_after_currency || txn.currency),
            type: txn.balance_after_type as BalanceType,
          }
        : undefined,
    proprietaryBankTransactionCode:
      txn.proprietary_bank_code != null
        ? {
            code: String(txn.proprietary_bank_code),
            issuer: txn.proprietary_bank_code_issuer
              ? String(txn.proprietary_bank_code_issuer)
              : undefined,
          }
        : undefined,
    merchantDetails:
      txn.merchant_name != null
        ? {
            merchantName: String(txn.merchant_name),
            merchantCategoryCode: txn.merchant_category_code
              ? String(txn.merchant_category_code)
              : undefined,
          }
        : undefined,
    debtor:
      txn.debtor_name != null
        ? {
            name: String(txn.debtor_name),
            accountNumber: txn.debtor_account ? String(txn.debtor_account) : undefined,
            bankId: txn.debtor_bank_id ? String(txn.debtor_bank_id) : undefined,
          }
        : undefined,
    creditor:
      txn.creditor_name != null
        ? {
            name: String(txn.creditor_name),
            accountNumber: txn.creditor_account ? String(txn.creditor_account) : undefined,
            bankId: txn.creditor_bank_id ? String(txn.creditor_bank_id) : undefined,
          }
        : undefined,
  }));

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const baseUrl = `/bon/v1/banking/accounts/${accountId}/transactions`;
  const links: Record<string, string> = {};
  if (page < totalPages) {
    links.next = `${baseUrl}?page=${page + 1}&page-size=${pageSize}`;
    links.last = `${baseUrl}?page=${totalPages}&page-size=${pageSize}`;
  }
  if (page > 1) {
    links.prev = `${baseUrl}?page=${page - 1}&page-size=${pageSize}`;
    links.first = `${baseUrl}?page=1&page-size=${pageSize}`;
  }

  return {
    data,
    links: Object.keys(links).length > 0 ? links : undefined,
    meta: {
      totalRecords: totalCount,
      totalPages,
    },
  };
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
