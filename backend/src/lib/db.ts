/**
 * Buffr G2P Backend – Neon PostgreSQL connection.
 * Same database as Ketchup Portal; backend runs in isolation (own scripts/API).
 * Use parameterized queries only. All env must be in a single canonical .env (B2).
 * Location: backend/src/lib/db.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

// Single canonical env load: backend/.env when run from repo root or backend/
const backendDir = resolve(process.cwd(), "backend");
config({ path: resolve(backendDir, ".env") });
if (process.cwd() !== backendDir) {
  config({ path: resolve(process.cwd(), ".env") });
}

/**
 * Database URL for Neon. Prefer this over process.env.DATABASE_URL so callers
 * do not need raw credentials (B4).
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required. Set it in backend/.env");
  }
  return url;
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in backend/.env (same as Ketchup Portal)."
  );
}

/**
 * Neon serverless SQL client. Use for parameterized queries.
 * Example: await sql`SELECT * FROM users WHERE id = ${id}`;
 */
export const sql = neon(DATABASE_URL);
