-- 011_obs_open_banking.sql
-- Open Banking (OBS): mobile consent flow + TPP/DTP OAuth (bon) + AIS/PIS persistence
-- Mobile tables: data_providers, obs_consents, obs_consent_pkce, obs_consent_audit_log, obs_payment_initiations
-- TPP OAuth uses obs_oauth_* to avoid clashing with mobile obs_consents schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Data providers (mobile AIS/PIS proxy) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS data_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  authorization_endpoint text NOT NULL,
  token_endpoint text NOT NULL,
  par_endpoint text,
  revocation_endpoint text,
  accounts_endpoint text,
  balances_endpoint text,
  transactions_endpoint text,
  payments_endpoint text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- ─── Mobile user consents (obsConsent.ts, routes/obs/*) ───────────────────────
CREATE TABLE IF NOT EXISTS obs_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data_provider_id uuid NOT NULL REFERENCES data_providers(id) ON DELETE CASCADE,
  scopes text[] NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('ais', 'pis')),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  pkce_verifier_hash text,
  redirect_uri text NOT NULL,
  state text NOT NULL,
  access_token text,
  token_expires_at timestamptz,
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_consents_user_id ON obs_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_obs_consents_state ON obs_consents(state);
CREATE INDEX IF NOT EXISTS idx_obs_consents_data_provider ON obs_consents(data_provider_id);
CREATE INDEX IF NOT EXISTS idx_obs_consents_status ON obs_consents(status);

CREATE TABLE IF NOT EXISTS obs_consent_pkce (
  state text PRIMARY KEY,
  code_verifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obs_consent_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id uuid NOT NULL REFERENCES obs_consents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  user_id uuid NOT NULL,
  data_provider_id uuid NOT NULL,
  scopes text[],
  revoked_by text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_consent_audit_consent ON obs_consent_audit_log(consent_id);

CREATE TABLE IF NOT EXISTS obs_payment_initiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id uuid NOT NULL REFERENCES obs_consents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data_provider_id uuid NOT NULL REFERENCES data_providers(id) ON DELETE CASCADE,
  payment_id text NOT NULL,
  status text NOT NULL,
  amount numeric(15, 2) NOT NULL,
  currency text NOT NULL,
  debtor_account_id text NOT NULL,
  beneficiary_name text NOT NULL,
  beneficiary_account_identifier text NOT NULL,
  sca_redirect_uri text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_payment_init_user ON obs_payment_initiations(user_id);
CREATE INDEX IF NOT EXISTS idx_obs_payment_init_payment ON obs_payment_initiations(payment_id);

-- ─── TPP / Data Provider registry (bon API) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS obs_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id text NOT NULL UNIQUE,
  role text NOT NULL,
  organization_name text NOT NULL,
  organization_id text NOT NULL UNIQUE,
  certificate text,
  qwac text,
  certificate_expiry timestamptz,
  nca_name text NOT NULL,
  nca_id text NOT NULL,
  sectors text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  operation_types text[] NOT NULL DEFAULT '{}',
  status text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT NOW(),
  last_active timestamptz,
  api_base_url text,
  developer_portal_url text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_participants_pid ON obs_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_obs_participants_status ON obs_participants(status);

-- OAuth consents for /bon flow (distinct from mobile obs_consents)
CREATE TABLE IF NOT EXISTS obs_oauth_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id text NOT NULL UNIQUE,
  account_holder_id text NOT NULL,
  tpp_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  dp_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  status text NOT NULL,
  status_reason text,
  scopes text[] NOT NULL,
  permissions jsonb,
  creation_date_time text NOT NULL,
  expiration_date_time text NOT NULL,
  status_update_date_time text,
  transaction_from_date_time text,
  transaction_to_date_time text,
  account_ids text[] NOT NULL DEFAULT '{}',
  authorization_code text UNIQUE,
  auth_code_expires_at timestamptz,
  auth_code_used boolean NOT NULL DEFAULT false,
  code_challenge text,
  code_challenge_method text,
  redirect_uri text,
  state text,
  revoked_at timestamptz,
  revoked_by text,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_oauth_consents_ext ON obs_oauth_consents(consent_id);
CREATE INDEX IF NOT EXISTS idx_obs_oauth_consents_auth_code ON obs_oauth_consents(authorization_code);
CREATE INDEX IF NOT EXISTS idx_obs_oauth_consents_holder ON obs_oauth_consents(account_holder_id);

CREATE TABLE IF NOT EXISTS obs_oauth_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL UNIQUE,
  refresh_token text UNIQUE,
  token_type text NOT NULL DEFAULT 'Bearer',
  scope text NOT NULL,
  expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  revoked_reason text,
  consent_internal_id uuid NOT NULL REFERENCES obs_oauth_consents(id) ON DELETE CASCADE,
  last_used_at timestamptz,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_oauth_tokens_access ON obs_oauth_access_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_obs_oauth_tokens_refresh ON obs_oauth_access_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_obs_oauth_tokens_consent ON obs_oauth_access_tokens(consent_internal_id);

CREATE TABLE IF NOT EXISTS obs_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL UNIQUE,
  dp_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  account_holder_id text NOT NULL,
  account_number text NOT NULL,
  account_type text NOT NULL,
  account_name text,
  currency text NOT NULL DEFAULT 'NAD',
  status text NOT NULL DEFAULT 'open',
  holder_type text,
  opened_date timestamptz,
  closed_date timestamptz,
  maturity_date timestamptz,
  interest_rate double precision,
  overdraft_limit double precision,
  last_sync_at timestamptz,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_accounts_holder ON obs_accounts(account_holder_id);
CREATE INDEX IF NOT EXISTS idx_obs_accounts_dp ON obs_accounts(dp_participant_id);
CREATE INDEX IF NOT EXISTS idx_obs_accounts_ext_id ON obs_accounts(account_id);

CREATE TABLE IF NOT EXISTS obs_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_internal_id uuid NOT NULL REFERENCES obs_accounts(id) ON DELETE CASCADE,
  balance_type text NOT NULL,
  amount double precision NOT NULL,
  currency text NOT NULL DEFAULT 'NAD',
  credit_debit_indicator text NOT NULL,
  date_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_balances_account ON obs_balances(account_internal_id);

CREATE TABLE IF NOT EXISTS obs_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  account_internal_id uuid NOT NULL REFERENCES obs_accounts(id) ON DELETE CASCADE,
  booking_date_time timestamptz NOT NULL,
  value_date_time timestamptz,
  transaction_information text,
  amount double precision NOT NULL,
  currency text NOT NULL DEFAULT 'NAD',
  credit_debit_indicator text NOT NULL,
  status text NOT NULL,
  transaction_reference text,
  end_to_end_reference text,
  balance_after_amount double precision,
  balance_after_currency text,
  balance_after_type text,
  proprietary_bank_code text,
  proprietary_bank_code_issuer text,
  merchant_name text,
  merchant_category_code text,
  debtor_name text,
  debtor_account text,
  debtor_bank_id text,
  creditor_name text,
  creditor_account text,
  creditor_bank_id text,
  retrieved_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_txn_account ON obs_transactions(account_internal_id);
CREATE INDEX IF NOT EXISTS idx_obs_txn_booking ON obs_transactions(booking_date_time);

CREATE TABLE IF NOT EXISTS obs_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  tpp_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  dp_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  account_holder_id text NOT NULL,
  payment_type text NOT NULL,
  debtor_account_internal_id uuid NOT NULL REFERENCES obs_accounts(id) ON DELETE CASCADE,
  debtor_account_number text,
  creditor_name text NOT NULL,
  creditor_account_number text NOT NULL,
  creditor_bank_id text,
  instructed_amount double precision NOT NULL,
  instructed_currency text NOT NULL DEFAULT 'NAD',
  remittance_information text,
  end_to_end_identification text,
  status text NOT NULL,
  status_reason text,
  creation_date_time timestamptz NOT NULL DEFAULT NOW(),
  status_update_date_time timestamptz NOT NULL DEFAULT NOW(),
  expected_execution_date_time timestamptz,
  actual_execution_date_time timestamptz,
  consent_external_id text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_payments_payment_id ON obs_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_obs_payments_holder ON obs_payments(account_holder_id);

CREATE TABLE IF NOT EXISTS obs_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id text NOT NULL UNIQUE,
  account_holder_id text NOT NULL,
  name text NOT NULL,
  account_number text NOT NULL,
  bank_id text,
  bank_name text,
  reference text,
  added_date timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_beneficiaries_holder ON obs_beneficiaries(account_holder_id);

CREATE TABLE IF NOT EXISTS obs_api_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  from_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  to_participant_id text NOT NULL REFERENCES obs_participants(participant_id) ON DELETE CASCADE,
  method text NOT NULL,
  endpoint text NOT NULL,
  api_version text NOT NULL,
  request_headers jsonb NOT NULL,
  request_body jsonb,
  status_code integer NOT NULL,
  response_headers jsonb,
  response_body jsonb,
  request_time timestamptz NOT NULL,
  response_time timestamptz,
  duration_ms integer,
  error_code text,
  error_message text,
  access_token text,
  consent_external_id text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_api_calls_to ON obs_api_calls(to_participant_id);
CREATE INDEX IF NOT EXISTS idx_obs_api_calls_time ON obs_api_calls(request_time);

CREATE TABLE IF NOT EXISTS obs_service_level_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id text NOT NULL,
  metric_type text NOT NULL,
  metric_value double precision NOT NULL,
  target_value double precision NOT NULL,
  met_met boolean NOT NULL,
  measurement_date timestamptz NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  notes text,
  additional_data jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_slm_participant ON obs_service_level_metrics(participant_id);

-- Minimal participants so PAR/token flows can run in dev (adjust in production)
INSERT INTO obs_participants (
  participant_id, role, organization_name, organization_id,
  nca_name, nca_id, sectors, services, operation_types, status
) VALUES
  (
    'API000001', 'DP', 'SmartPay Data Provider', 'ORG-SMARTPAY-DP',
    'Bank of Namibia', 'NA-BON',
    ARRAY['Banking']::text[], ARRAY['AIS', 'PIS']::text[],
    ARRAY['AIS.Read', 'PIS.Write']::text[], 'active'
  ),
  (
    'TPP-SMARTPAY-001', 'TPP', 'SmartPay', 'ORG-SMARTPAY-TPP',
    'Bank of Namibia', 'NA-BON',
    ARRAY['Banking']::text[], ARRAY['AIS', 'PIS']::text[],
    ARRAY['AIS.Read', 'PIS.Write']::text[], 'active'
  )
ON CONFLICT (participant_id) DO NOTHING;
