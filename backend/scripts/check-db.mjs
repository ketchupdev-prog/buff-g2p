#!/usr/bin/env node
/**
 * Check database connectivity (Neon). Same DB as Ketchup Portal.
 * Loads backend/.env. Run from repo root: node backend/scripts/check-db.mjs
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
    const rows = await sql`SELECT 1 as ok`;
    console.log("DB OK:", rows?.[0]?.ok === 1 ? "connected (same Neon as Ketchup Portal)" : "unexpected");
  } catch (e) {
    console.error("DB check failed:", e.message);
    process.exit(1);
  }
}

main();
