#!/usr/bin/env node
/**
 * Run SQL migrations in backend/migrations/ against DATABASE_URL.
 * Loads backend/.env. Run from repo root: node backend/scripts/run-migrations.mjs
 * Or from backend: npm run migrate
 * Requires: pg (npm install in backend)
 */

import { config } from "dotenv";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { readdir, readFile } from "fs/promises";
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

const migrationsDir = resolve(__dirname, "../migrations");

function splitStatements(content) {
  const statements = [];
  let current = "";
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") {
      continue;
    }
    current += line + "\n";
    if (trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(Boolean);
}

async function main() {
  let files;
  try {
    files = await readdir(migrationsDir);
  } catch (e) {
    console.error("Migrations dir not found:", migrationsDir, e.message);
    process.exit(1);
  }
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();
  if (sqlFiles.length === 0) {
    console.log("No .sql files in backend/migrations/");
    process.exit(0);
  }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    for (const file of sqlFiles) {
      const filePath = join(migrationsDir, file);
      const content = await readFile(filePath, "utf8");
      const statements = splitStatements(content);
      console.log(`Running ${file} (${statements.length} statements)...`);
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;
        try {
          await client.query(stmt);
        } catch (err) {
          if (err.code === "42P07") {
            console.log(`  (table/index already exists in ${file}, skipping)`);
          } else {
            console.error(`  Failed at statement ${i + 1}:`, err.message);
            throw err;
          }
        }
      }
      console.log(`  Done: ${file}`);
    }
    console.log("Migrations complete.");
  } catch (e) {
    console.error("Migration failed:", e.message);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}

main();
