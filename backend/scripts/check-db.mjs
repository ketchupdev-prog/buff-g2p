#!/usr/bin/env node
/**
 * Check database connectivity and print schema (Neon). Same DB as Ketchup Portal.
 * Use to align backend/server.ts with live DB columns.
 * Run from repo root: node backend/scripts/check-db.mjs
 * Or from backend: npm run db:check
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

async function main() {
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(DATABASE_URL);

    const ping = await sql`SELECT 1 as ok`;
    if (ping?.[0]?.ok !== 1) {
      console.error("Unexpected ping result");
      process.exit(1);
    }
    console.log("DB OK: connected\n");

    // List tables in public schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log("=== TABLES (public) ===");
    if (tables.length === 0) {
      console.log("(none)");
    } else {
      tables.forEach((r) => console.log(" ", r.table_name));
    }

    // Columns for tables the mobile API uses
    const apiTables = ["users", "wallets", "wallet_transactions"];
    console.log("\n=== COLUMNS (tables used by mobile API) ===");
    for (const tableName of apiTables) {
      const cols = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      if (cols.length === 0) {
        console.log(`\n${tableName}: (table missing or empty)`);
      } else {
        console.log(`\n${tableName}:`);
        cols.forEach((c) => {
          console.log(`   ${c.column_name}  ${c.data_type}  ${c.is_nullable === "YES" ? "NULL" : "NOT NULL"}`);
        });
      }
    }

    // Row counts for quick sanity check
    console.log("\n=== ROW COUNTS ===");
    for (const tableName of apiTables) {
      try {
        let count;
        if (tableName === "users") count = await sql`SELECT count(*)::int as n FROM users`;
        else if (tableName === "wallets") count = await sql`SELECT count(*)::int as n FROM wallets`;
        else if (tableName === "wallet_transactions") count = await sql`SELECT count(*)::int as n FROM wallet_transactions`;
        else count = [{ n: 0 }];
        console.log(`  ${tableName}: ${count?.[0]?.n ?? 0}`);
      } catch (e) {
        console.log(`  ${tableName}: error - ${e.message}`);
      }
    }

    console.log("\nDone. Use this output to align backend/src/server.ts with the live schema.");
  } catch (e) {
    console.error("DB check failed:", e.message);
    if (e.code) console.error("  code:", e.code);
    process.exit(1);
  }
}

main();
