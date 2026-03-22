-- 001_kyc_tables.sql
-- Creates KYC tables required by:
-- - POST /api/v1/kyc/submit
-- - POST /api/v1/kyc/upload-documents
--
-- Location: fintech/apps/smartpay-backend/migrations/001_kyc_tables.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  id_number text NOT NULL,
  id_type text NOT NULL,
  date_of_birth date NOT NULL,
  address text,
  status text NOT NULL,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  kyc_submission_id uuid NOT NULL,
  doc_type text NOT NULL,
  mime_type text NOT NULL,
  file_name text,
  file_size_bytes bigint NOT NULL,
  sha256 text NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (kyc_submission_id, doc_type)
);

