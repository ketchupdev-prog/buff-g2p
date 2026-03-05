#!/usr/bin/env node
/**
 * Check database connectivity and verify all migrations are applied (Neon PostgreSQL).
 * Loads backend/.env. Run from repo root: node backend/scripts/check-db.mjs
 * Or from backend: npm run db:check
 *
 * Verifies: expected tables and functions from backend/migrations/*.sql.
 * Exit 0 = all OK, 1 = connection failed or migrations missing.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
config({ path: resolve(root, "backend/.env") });
config({ path: resolve(root, "backend/.env.local") });
config({ path: resolve(root, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set. Add backend/.env (same as Ketchup Portal).");
  process.exit(1);
}

/** Expected objects per migration file (tables + key functions/indexes). */
const MIGRATION_CHECKS = [
  {
    file: "001_prd_schema.sql",
    tables: ["users", "wallets", "wallet_transactions", "vouchers", "notifications", "loans", "groups", "p2p_transactions"],
  },
  {
    file: "002_analytics_notifications_atm.sql",
    tables: ["analytics_events", "device_tokens", "atm_codes"],
  },
  {
    file: "003_user_profile_and_pin.sql",
    columns: [{ table: "users", column: "pin_hash" }],
  },
  {
    file: "004_otp_verification.sql",
    tables: ["otp_codes", "otp_rate_limits"],
    functions: ["create_otp", "verify_otp", "generate_otp"],
  },
  {
    file: "004b_otp_rate_limits_unique.sql",
    indexes: [{ table: "otp_rate_limits", index: "otp_rate_limits_phone_purpose_key" }],
  },
  {
    file: "005_fineract_mapping.sql",
    tables: ["fineract_sync_log"],
    columns: [
      { table: "users", column: "fineract_client_id" },
      { table: "wallets", column: "fineract_savings_account_id" },
      { table: "loans", column: "fineract_loan_id" },
    ],
  },
  {
    file: "006_api_and_compliance.sql",
    tables: ["public_keys", "compliance_incident_reports", "audit_logs", "verification_tokens"],
    columns: [{ table: "wallet_transactions", column: "reference" }],
  },
  {
    file: "007_ai_companion.sql",
    tables: ["conversations", "exchange_rates", "exchange_rate_fetch_log"],
  },
  {
    file: "008_knowledge_base.sql",
    tables: ["knowledge_base_documents"],
  },
];

async function tableExists(client, tableName) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return r.rowCount > 0;
}

async function columnExists(client, tableName, columnName) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return r.rowCount > 0;
}

async function functionExists(client, funcName) {
  const r = await client.query(
    `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = $1`,
    [funcName]
  );
  return r.rowCount > 0;
}

async function indexExists(client, tableName, indexName) {
  const r = await client.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
    [tableName, indexName]
  );
  return r.rowCount > 0;
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  let allOk = true;
  try {
    await client.connect();
    console.log("Database: connected (Neon PostgreSQL)\n");
    console.log("Migration check:");
    console.log("----------------");

    for (const check of MIGRATION_CHECKS) {
      let ok = true;
      const missing = [];

      if (check.tables) {
        for (const t of check.tables) {
          const exists = await tableExists(client, t);
          if (!exists) {
            ok = false;
            missing.push(`table:${t}`);
          }
        }
      }
      if (check.columns) {
        for (const { table, column } of check.columns) {
          const exists = await columnExists(client, table, column);
          if (!exists) {
            ok = false;
            missing.push(`${table}.${column}`);
          }
        }
      }
      if (check.functions) {
        for (const f of check.functions) {
          const exists = await functionExists(client, f);
          if (!exists) {
            ok = false;
            missing.push(`function:${f}`);
          }
        }
      }
      if (check.indexes) {
        for (const { table, index } of check.indexes) {
          const exists = await indexExists(client, table, index);
          if (!exists) {
            ok = false;
            missing.push(`index:${index}`);
          }
        }
      }

      const status = ok ? "OK" : "MISSING";
      if (!ok) allOk = false;
      const detail = missing.length ? ` (${missing.join(", ")})` : "";
      console.log(`  ${check.file.padEnd(32)} ${status}${detail}`);
    }

    console.log("----------------");
    if (allOk) {
      console.log("All migrations appear applied. Run 'npm run migrate' if you need to apply any.");
    } else {
      console.log("Some objects are missing. Run: cd backend && npm run migrate");
    }
  } catch (e) {
    console.error("DB check failed:", e.message);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
  process.exit(allOk ? 0 : 1);
}

main();
