/**
 * Buffr G2P Backend – Neon PostgreSQL connection.
 * Same database as Ketchup Portal; backend runs in isolation (own scripts/API).
 * Loads .env from backend folder. Use parameterized queries only.
 * Location: backend/src/lib/db.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

// Load backend/.env (when run from repo root or backend/)
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "backend/.env.local") });

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

/**
 * Env for Buffr/Neon Auth (same vars as Ketchup Portal).
 */
export function getEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    BUFFR_API_URL: process.env.BUFFR_API_URL ?? "",
    BUFFR_API_KEY: process.env.BUFFR_API_KEY ?? "",
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL ?? "",
    NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET ?? "",
  };
}
