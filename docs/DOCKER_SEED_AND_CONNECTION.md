# Docker, data, and app–backend connection

## Do we need Docker?

**No.** The Buffr G2P app and backend do not use Docker. You run:

- **Backend:** Node.js (`npm run dev` in `backend/`) using Neon PostgreSQL (hosted; no local DB container).
- **Mobile:** Expo (`npx expo start` or `npx expo run:ios`) on the simulator or device.

Neon is a cloud Postgres service; you only need `DATABASE_URL` in `backend/.env`. No Docker, no local Postgres install.

---

## Where does app data come from?

**From the backend API only.** The app does not ship or store demo/placeholder data:

- **When `EXPO_PUBLIC_API_BASE_URL` is set:** All data (wallets, transactions, vouchers, contacts, groups, loans, notifications) comes from the backend API. The backend reads from PostgreSQL.
- **When `EXPO_PUBLIC_API_BASE_URL` is not set or the API fails:** Services return empty arrays or errors. The app does not fall back to local data.

To have real data, you need:

1. **Backend** running and reachable at `EXPO_PUBLIC_API_BASE_URL`.
2. **Database** with migrations applied and **registered users** (sign up via the app or your backend).

---

## Is the app connected to the backend?

**Only if you set the API URL.**

| `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` | Behaviour |
|---------------------------------------------|-----------|
| **Set** (e.g. `http://localhost:3001`)       | App calls the backend for wallets, transactions, vouchers, contacts, etc. Data comes from the **database** (after migrations and user registration). |
| **Empty or unset**                          | No backend calls. Services return empty data or errors; flows that require the API show a “Backend not configured” or “not found” style message. |

So:

1. **Backend running** + **`EXPO_PUBLIC_API_BASE_URL` set** + **DB migrated** + **users registered** → app is connected and uses real data from the database.
2. **Otherwise** → app has no data source; screens show empty states or errors as appropriate.

See `mobile/NETWORK_SETUP.md` for step-by-step setup and troubleshooting “Network request failed”.
