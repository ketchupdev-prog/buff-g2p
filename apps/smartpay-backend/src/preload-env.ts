/**
 * Load .env before any other imports so process.env is set for auth, Buffr, etc.
 * Must be the first import in index.ts.
 */
import dotenv from 'dotenv';
import path from 'path';

// Resolve the backend .env explicitly relative to this file.
// This prevents "process.cwd()" issues when the backend is started from a
// different directory (which can cause wrong/missing DATABASE_URL).
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });
