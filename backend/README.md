# Buffr G2P – Backend

Backend for the Buffr G2P app. Uses the **same Neon PostgreSQL database** as the Ketchup Portal, in isolation (separate codebase, scripts, and API).

## Setup

1. **Env** – `backend/.env` is already present (same `DATABASE_URL` and vars as Ketchup Portal). For local overrides use `backend/.env.local` (add to `.gitignore` if it contains secrets).

2. **Install**
   ```bash
   cd backend && npm install
   ```

3. **Check DB**
   ```bash
   npm run db:check
   ```
   Or from repo root: `node backend/scripts/check-db.mjs`

## Database

- **Same DB as Ketchup Portal** – `DATABASE_URL` points to the same Neon project.
- **Isolation** – This backend does not depend on the portal codebase; use separate schema/tables or namespacing if you need to avoid conflicts with portal tables.

## Usage

```ts
import { sql, getEnv } from "./src/lib/db.js";

// Parameterized query (always use this; never string concat)
const rows = await sql`SELECT * FROM my_table WHERE id = ${id}`;
const env = getEnv();
```

## Env (from .env)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL (same as portal) |
| `BUFFR_API_URL` / `BUFFR_API_KEY` | Buffr voucher sync |
| `NEON_AUTH_*` | Neon Auth (optional) |

See `.env` comments for the full list.
