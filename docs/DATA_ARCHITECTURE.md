# Buffr G2P – Data architecture (no demo/fallback data)

**Purpose:** Describe how the app gets data. Use this for onboarding and for any “task completed” or status summaries.

---

## Data source

The app uses **only**:

1. **Backend API** at `EXPO_PUBLIC_API_BASE_URL` for all server data (wallets, transactions, vouchers, contacts, groups, loans, notifications, etc.).
2. **Database** (PostgreSQL) used by that backend; data comes from **registered users** and normal usage.

There is **no**:

- Hardcoded or bundled demo data.
- Local fallback data when the API is missing or fails.
- AsyncStorage (or similar) used as a data source for lists, balances, or entities.

When the API is not configured or a request fails, services return empty arrays, `null`, or an error; the UI shows empty states or messages like “Backend not configured” / “not found” as appropriate.

---

## What was done (summary for reports)

### Removed demo/fallback data and scripts

- Removed the `mobile/seed-data/` directory (previously contained demo JSON).
- Removed `mobile/services/seedData.ts` (previously re-exported that data).
- Removed `backend/scripts/seed-db.mjs` (previously loaded demo rows into the DB).
- Removed `backend/scripts/clear-and-seed.mjs` (previously reset and reloaded demo data).

### Mobile services

- **send.ts:** Removed AsyncStorage demo contacts fallback; contacts come from API or device contacts only.
- **tokenVault.ts:** When Token Vault is disabled, the service throws instead of returning a successful result or placeholder ID.
- **namqr.ts:** Token Vault status reports unavailable when disabled.

### Architecture

- **Backend:** 40+ API endpoints in `backend/src/server.ts` reading from PostgreSQL.
- **Database:** Migrations create tables for users, wallets, transactions, vouchers, loans, groups, notifications.
- **Mobile:** All services call the API with auth headers; on missing/failed API they return empty data or errors.

---

## PRD alignment

The app now requires:

1. **Device** – Mobile app (Expo/React Native).
2. **Backend** – Express API at `EXPO_PUBLIC_API_BASE_URL`.
3. **Database** – PostgreSQL with migrations applied and **registered users**.

All displayed data comes from the backend and database; there is no demo or fallback data in the mobile app.
