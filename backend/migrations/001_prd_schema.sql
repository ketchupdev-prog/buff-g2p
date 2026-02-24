-- Buffr G2P – PRD §16 schema. Run once on empty DB (or align with existing backend).
-- Order matters: users first, then tables that reference users/wallets.

-- Users (from auth; profile from onboarding; proof-of-life §2.4)
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(20) NOT NULL UNIQUE,
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  photo_url         TEXT,
  last_proof_of_life      TIMESTAMPTZ,
  proof_of_life_due_date  TIMESTAMPTZ,
  wallet_status           VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (wallet_status IN ('active', 'frozen', 'deactivated')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_proof_of_life_due ON users(proof_of_life_due_date) WHERE wallet_status = 'active';

-- Proof-of-life events (audit)
CREATE TABLE IF NOT EXISTS proof_of_life_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  method            VARCHAR(50) NOT NULL,
  performed_by      UUID REFERENCES users(id),
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address        INET,
  user_agent        TEXT
);
CREATE INDEX IF NOT EXISTS idx_proof_of_life_user ON proof_of_life_events(user_id, performed_at DESC);

-- Vouchers (issued by G2P engine; synced to app)
CREATE TABLE IF NOT EXISTS vouchers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  amount            NUMERIC(14,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  status            VARCHAR(20) NOT NULL DEFAULT 'available',
  type              VARCHAR(50),
  expires_at        TIMESTAMPTZ NOT NULL,
  external_id       VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_status ON vouchers(user_id, status);

-- Voucher redemptions (audit; used for loan eligibility)
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id        UUID NOT NULL REFERENCES vouchers(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  method            VARCHAR(20) NOT NULL,
  redemption_point  VARCHAR(200),
  amount_credited   NUMERIC(14,2) NOT NULL,
  redeemed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user ON voucher_redemptions(user_id, redeemed_at DESC);

-- Wallets (beneficiary wallets)
CREATE TABLE IF NOT EXISTS wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  name              VARCHAR(100) NOT NULL,
  type              VARCHAR(20) NOT NULL DEFAULT 'main',
  balance           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Wallet transactions (all balance-changing events)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id         UUID NOT NULL REFERENCES wallets(id),
  type              VARCHAR(50) NOT NULL,
  amount            NUMERIC(14,2) NOT NULL,
  balance_after     NUMERIC(14,2),
  reference_type    VARCHAR(50),
  reference_id      UUID,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

-- Cash-out codes (USSD and app; 6-digit code for agent/ATM cash-out)
CREATE TABLE IF NOT EXISTS cash_out_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  code              VARCHAR(6) NOT NULL UNIQUE,
  amount            NUMERIC(14,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  method            VARCHAR(20) NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_out_codes_code ON cash_out_codes(code);
CREATE INDEX IF NOT EXISTS idx_cash_out_codes_user_expires ON cash_out_codes(user_id, expires_at);

-- Loans (voucher-backed advance)
CREATE TABLE IF NOT EXISTS loans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  wallet_id               UUID REFERENCES wallets(id),
  amount                  NUMERIC(14,2) NOT NULL,
  interest_rate           NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  total_repayment         NUMERIC(14,2) NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
  previous_voucher_value  NUMERIC(14,2),
  disbursed_at            TIMESTAMPTZ,
  repaid_at               TIMESTAMPTZ,
  repayment_voucher_redemption_id UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id           UUID NOT NULL REFERENCES loans(id),
  amount            NUMERIC(14,2) NOT NULL,
  voucher_redemption_id UUID NOT NULL REFERENCES voucher_redemptions(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications (receive flows, in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  type              VARCHAR(50) NOT NULL,
  title             VARCHAR(200),
  body              TEXT,
  data              JSONB DEFAULT '{}',
  read              BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- Groups (optional G2P feature)
CREATE TABLE IF NOT EXISTS groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  role              VARCHAR(20) DEFAULT 'member',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- P2P / send-money transactions
CREATE TABLE IF NOT EXISTS p2p_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         UUID NOT NULL REFERENCES users(id),
  recipient_id      UUID NOT NULL REFERENCES users(id),
  wallet_id         UUID NOT NULL REFERENCES wallets(id),
  amount            NUMERIC(14,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  note              TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_p2p_recipient ON p2p_transactions(recipient_id, created_at DESC);
