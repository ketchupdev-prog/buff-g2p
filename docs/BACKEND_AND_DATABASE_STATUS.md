# Buffr G2P – Backend, Database & Migrations Status

**Purpose:** Single reference for what is implemented, what is connected, and what is missing. Use for onboarding and deployment.

---

## 1. App logic (implemented)

**Yes.** All in-app logic is implemented in `buffr-g2p`:

- **Data layer:** Services in `services/` (wallets, transactions, send, vouchers, auth, cashout, etc.) call the backend API when `EXPO_PUBLIC_API_BASE_URL` is set; otherwise they use **AsyncStorage** (and seed data) so the app works offline/demo.
- **Screens:** All PRD §3 screens are implemented (onboarding, home, wallets, send, receive, groups, loans, cards, vouchers, merchants, bills, proof-of-life, transactions, profile, etc.).
- **Flows:** Send money, add money, cash-out, voucher redeem, loans, groups, add card, etc. are wired in the app.

---

## 2. Backend connection (conditional)

**The app does not host the API.** It **calls** a backend:

- **Env:** `EXPO_PUBLIC_API_BASE_URL` (e.g. `https://your-api.vercel.app` or `http://localhost:3000`).
- **When set:** Services use `fetch(EXPO_PUBLIC_API_BASE_URL + '/api/v1/mobile/...')` with auth headers (Bearer token from secure storage).
- **When not set:** All data comes from AsyncStorage and seed data; no backend calls.

**Where is the API?** The **buffr-g2p** repo only has:

- `backend/src/lib/db.ts` – Neon PostgreSQL client (for scripts or a future API).
- `backend/scripts/check-db.mjs` – DB connectivity check.

There are **no API routes** in this repo (no Express/Hono/Fastify server, no `/api/v1/mobile/*` handlers). The app expects one of:

1. **Ketchup SmartPay backend** (`ketchup-smartpay/backend`) – if that project exposes `/api/v1/mobile/*`, point `EXPO_PUBLIC_API_BASE_URL` at it.
2. **A separate backend** you deploy (e.g. Vercel serverless routes) that implements the same API contract.
3. **Demo mode** – leave `EXPO_PUBLIC_API_BASE_URL` unset and use AsyncStorage.

---

## 3. Database (backend only)

- **buffr-g2p:** The `backend/` folder has a **Neon** client (`backend/src/lib/db.ts`) and expects `DATABASE_URL` in `backend/.env`. Nothing in this repo **serves** HTTP using that DB; it’s for scripts or a future API.
- **Who uses the DB?** Whatever service implements `/api/v1/mobile/*` (e.g. ketchup-smartpay backend or your own). That service needs its own `DATABASE_URL` and migrations.

So: **we are not “connected to backend and database”** until (1) a backend that implements the mobile API is running, and (2) the app’s `EXPO_PUBLIC_API_BASE_URL` points to it. The DB is used by that backend, not by the app directly.

---

## 4. Migrations (added in this repo)

**Before:** There were **no migration files** in buffr-g2p. The PRD §16 has the full SQL schema (users, vouchers, wallets, loans, groups, notifications, etc.) but no runnable migrations.

**Now:**

- **`backend/migrations/001_prd_schema.sql`** – PRD §16 schema (core + loans + notifications + groups + P2P). Uses `CREATE TABLE IF NOT EXISTS` and skips existing objects where possible so the script can be re-run safely.
- **`backend/scripts/run-migrations.mjs`** – Runs all `.sql` files in `backend/migrations/` in order against `DATABASE_URL` (from `backend/.env`).

**How to run:**

```bash
cd backend
# Ensure backend/.env has DATABASE_URL (same as Ketchup Portal / your Neon DB).
npm install   # installs pg for migrations
npm run migrate
# Or: node scripts/run-migrations.mjs
```

**Note:** If you already use **ketchup-smartpay/backend** (or another backend) and its migrations, that backend may have its own schema. Use either:

- This repo’s migrations for a **standalone** Buffr G2P database, or  
- The other project’s migrations and treat PRD §16 as reference only.

---

## 5. Checklist

| Item | Status |
|------|--------|
| App logic (screens, services, flows) | ✅ Implemented |
| App calls backend when `EXPO_PUBLIC_API_BASE_URL` set | ✅ Implemented |
| App works without backend (AsyncStorage + seed) | ✅ Implemented |
| API server in buffr-g2p repo | ❌ Not present (only DB client + scripts) |
| Migrations in buffr-g2p | ✅ Added: `backend/migrations/` + run script |
| Database used by app directly | ❌ No (app talks to API; API uses DB) |
| Backend + DB “connected” | ⚠️ Only if you run a backend and set env vars |

---

## 6. Quick setup for “connected” mode

1. **Backend:** Deploy or run a service that implements `/api/v1/mobile/*` (e.g. ketchup-smartpay backend, or your own).
2. **Database:** Ensure that backend has `DATABASE_URL` and has run its migrations (or run `backend/scripts/run-migrations.mjs` for the PRD schema).
3. **App:** In the app root (or `.env`), set `EXPO_PUBLIC_API_BASE_URL` to that backend’s URL.
4. **Auth:** Backend must issue/validate tokens; app stores them via `getSecureItem('buffr_access_token')` and sends `Authorization: Bearer <token>`.

After that, the app is “connected” to backend and database (via that backend).
