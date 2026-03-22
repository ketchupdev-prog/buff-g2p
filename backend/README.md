# Buffr G2P – Backend

Backend for the Buffr G2P app. Uses the **same Neon PostgreSQL database** as the Ketchup Portal, in isolation (separate codebase, scripts, and API).

## Setup

1. **Env** – `backend/.env` is already present (same `DATABASE_URL` and vars as Ketchup Portal). For local overrides use `backend/.env.local` (add to `.gitignore` if it contains secrets). Copy from `backend/.env.example` if needed.

2. **Install**
   ```bash
   cd backend && npm install
   ```

3. **Check DB**
   ```bash
   npm run db:check
   ```
   Or from repo root: `node backend/scripts/check-db.mjs`

4. **Migrations** (if not yet run)
   ```bash
   npm run migrate
   ```
   Or from repo root: `node backend/scripts/run-migrations.mjs`

## Run server

```bash
cd backend && npm run dev
```

Listens on `http://localhost:3001` (or `PORT` from `.env`).

**Buffr AI (Companion, optional):** The Python venv is **`ai`** in `backend/` (there is no venv inside `buffr_ai/`). Create it once if missing, then activate and run:

```bash
cd backend
# Create venv once (if you get "no such file or directory: ai/bin/activate")
python3 -m venv ai
source ai/bin/activate
pip install -r buffr_ai/requirements.txt

# Start the API. Use --host 0.0.0.0 so the mobile app on a physical device (same LAN) can reach it.
PYTHONPATH=. uvicorn buffr_ai.main:app --reload --host 0.0.0.0 --port 8000
```
See [buffr_ai/README.md](buffr_ai/README.md).

## Database

- **Same DB as Ketchup Portal** – `DATABASE_URL` points to the same Neon project.
- **Isolation** – This backend does not depend on the portal codebase; use separate schema/tables or namespacing if you need to avoid conflicts with portal tables.
- **Schema** – See [docs/DB_STRUCTURE.md](docs/DB_STRUCTURE.md) for full table and function reference.

## Usage

```ts
import { sql, getDatabaseUrl } from "./src/lib/db.js";

// Parameterized query (always use this; never string concat)
const rows = await sql`SELECT * FROM my_table WHERE id = ${id}`;
const dbUrl = getDatabaseUrl();
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:check` | Verify Neon connectivity |
| `npm run migrate` | Run SQL migrations |
| `node scripts/send-test-email.mjs [email]` | Send a generic test email via SMTP (default recipient in script) |

From repo root, use `node backend/scripts/...` for the same scripts.

## Env (from .env)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL (same as portal) |
| `BUFFR_API_URL` / `BUFFR_API_KEY` | Buffr voucher sync |
| `NEON_AUTH_*` | Neon Auth (optional) |
| `SMTP_*` | Email (OTP, notifications) – see [docs/EMAIL_SMTP.md](docs/EMAIL_SMTP.md) |

See `.env.example` and `.env` comments for the full list.

## Documentation

| Doc | Description |
|-----|--------------|
| [docs/DB_STRUCTURE.md](docs/DB_STRUCTURE.md) | Full database schema (tables, indexes, OTP functions) |
| [docs/OTP_ONBOARDING.md](docs/OTP_ONBOARDING.md) | OTP and onboarding: migrations, email/SMS setup |
| [docs/EMAIL_SMTP.md](docs/EMAIL_SMTP.md) | SMTP configuration and test send (ichigo@ketchup.cc) |
| [buffr_ai/README.md](buffr_ai/README.md) | Buffr AI Companion (Python). Venv: **`ai`** in `backend/` (create with `python3 -m venv ai` if missing). |
| [FINERACT.md](FINERACT.md) | Fineract integration (core banking) |
| [API_AUDIT.md](API_AUDIT.md) | API endpoints overview |
| [SECURITY.md](SECURITY.md) | Security and compliance notes |

## OTP and onboarding

If users don’t receive OTP by email/SMS (only on screen), run migrations then configure delivery. See **[docs/OTP_ONBOARDING.md](docs/OTP_ONBOARDING.md)** and **[docs/EMAIL_SMTP.md](docs/EMAIL_SMTP.md)**.
