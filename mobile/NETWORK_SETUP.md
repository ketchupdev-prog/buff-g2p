# Fixing "Network request failed" (Buffr G2P Mobile)

The app shows **Network request failed** when it tries to call the backend but cannot reach it. Use this checklist.

## 1. Backend must be running

From the **backend** directory:

```bash
cd /path/to/buffr-g2p/backend
npm run dev
```

You should see: `Buffr G2P backend listening on http://localhost:3001`

If you see "No users found in database", run migrations and **seed** the DB:

```bash
npm run migrate
npm run db:seed
```

Then start the backend again. The seed adds one demo user, a Buffr Account wallet, two vouchers, and sample transactions.

## 2. Point the app at the backend

In **mobile** `.env` (copy from `.env.example` if needed), set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Use the URL that **the device or simulator** can reach:

| Where the app runs | Use this base URL |
|--------------------|-------------------|
| **iOS Simulator**  | `http://localhost:3001` |
| **Android Emulator** | `http://10.0.2.2:3001` |
| **Physical device** (same Wi‑Fi as your Mac) | `http://YOUR_MAC_IP:3001` (e.g. `http://192.168.1.5:3001`) |

To find your Mac’s IP: **System Settings → Network → Wi‑Fi → Details** or run `ipconfig getifaddr en0`.

## 3. Restart Expo after changing .env

`EXPO_PUBLIC_*` is baked in at build. After editing `.env`:

- Stop the Expo dev server (Ctrl+C).
- Start again: `npx expo start` (or `npm start`).
- Reload the app (e.g. shake device → Reload).

## 4. Quick test

With the backend running, open in a browser:

- **http://localhost:3001/healthz** → should return `{"status":"ok"}`

If that works but the app still fails, the app is likely using a different host (e.g. Android emulator needs `10.0.2.2`, not `localhost`).

## 5. Optional: use API without backend

If you don’t run the backend, leave `EXPO_PUBLIC_API_BASE_URL` **empty** or unset. The app will use AsyncStorage fallbacks for wallets, transactions, contacts, and vouchers (no real API calls).
