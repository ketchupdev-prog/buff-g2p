#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
/**
 * Database Migration Runner for Smartpay
 * Executes all SQL migration files in order
 * Location: backend/scripts/runMigrations.ts
 */
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/smartpay';
async function runMigrations() {
    const pool = new pg_1.Pool({ connectionString: DATABASE_URL });
    try {
        console.log('🚀 Starting database migrations...\n');
        // Create migrations tracking table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        // Create copilot_audit_log table if not exists (required for migration 010)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS copilot_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tool_name TEXT NOT NULL,
        action TEXT NOT NULL,
        input JSONB DEFAULT '{}',
        result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        // Read all migration files
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        const migrations = files.map(filename => {
            const match = filename.match(/^(\d+)_(.+)\.sql$/);
            if (!match)
                throw new Error(`Invalid migration filename: ${filename}`);
            const [, number, description] = match;
            const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
            return {
                filename,
                number: parseInt(number, 10),
                description: description.replace(/_/g, ' '),
                sql
            };
        });
        console.log(`📁 Found ${migrations.length} migration files\n`);
        // Execute each migration
        for (const migration of migrations) {
            const version = migration.filename.replace('.sql', '');
            // Check if already executed
            const result = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
            if (result.rowCount && result.rowCount > 0) {
                console.log(`⏭️  Skipping ${version} (already executed)`);
                continue;
            }
            console.log(`⚙️  Executing ${version}: ${migration.description}`);
            try {
                await pool.query('BEGIN');
                await pool.query(migration.sql);
                await pool.query('INSERT INTO schema_migrations (version, description) VALUES ($1, $2)', [version, migration.description]);
                await pool.query('COMMIT');
                console.log(`✅ ${version} completed successfully\n`);
            }
            catch (error) {
                await pool.query('ROLLBACK');
                console.error(`❌ Migration ${version} failed:`, error);
                throw error;
            }
        }
        console.log('🎉 All migrations completed successfully!');
    }
    catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
// Execute if run directly
if (require.main === module) {
    runMigrations();
}
//# sourceMappingURL=runMigrations.js.map