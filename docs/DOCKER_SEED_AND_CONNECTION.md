# Docker, seed data, and app–backend connection

## Do we need Docker?

**No.** The Buffr G2P app and backend do not use Docker. You run:

- **Backend:** Node.js (`npm run dev` in `backend/`) using Neon PostgreSQL (hosted; no local DB container).
- **Mobile:** Expo (`npx expo start` or `npx expo run:ios`) on the simulator or device.

Neon is a cloud Postgres service; you only need `DATABASE_URL` in `backend/.env`. No Docker, no local Postgres install.

---

## Where is the seed data?

There are **two** places:

### 1. In the app (AsyncStorage) – used when there is no backend

- **File:** `mobile/services/seedData.ts`
- **When:** On first launch, if `EXPO_PUBLIC_API_BASE_URL` is **not** set, `AppProviders` calls `seedDemoDataIfNeeded()` and writes demo wallets, transactions, vouchers, and contacts into AsyncStorage.
- **Purpose:** So the app works in demo/offline mode without any backend.

### 2. In the database – used when the app talks to the backend

- **Script:** `backend/scripts/seed-db.mjs`
- **When:** You run `npm run db:seed` in the backend (once, after `npm run migrate`).
- **What it does:** If the `users` table is empty, it inserts one demo user, one “Buffr Account” wallet, two vouchers, and two wallet transactions.
- **Purpose:** So when the app is pointed at the backend, the API has at least one user and wallet and does not return “No users found”.

**Typical flow:** Run `npm run migrate` then `npm run db:seed` once per environment (e.g. local Neon DB). After that, the backend serves this demo data to the app.

---

## Is the app connected to the backend?

**Only if you set the API URL.**

| `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` | Behaviour |
|---------------------------------------------|-----------|
| **Set** (e.g. `http://localhost:3001`)      | App calls the backend for wallets, transactions, vouchers, contacts, send, etc. Data comes from the **database** (after you’ve run migrate + seed). |
| **Empty or unset**                          | App uses **AsyncStorage** and the in-app seed data only. No backend calls; works offline/demo. |

So:

1. **Backend running** + **`EXPO_PUBLIC_API_BASE_URL` set** + **DB migrated and seeded** → app is connected to the backend and gets details from the database.
2. **Otherwise** → app uses only local seed data in AsyncStorage.

See `mobile/NETWORK_SETUP.md` for step-by-step setup and troubleshooting “Network request failed”.
