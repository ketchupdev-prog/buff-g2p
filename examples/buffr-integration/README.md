# Buffr + Fintech (React Native / Expo)

End-to-end style example: **OAuth PKCE**, **accounts**, **transactions**, **affordability** using [`@buffr/sdk`](../../../buffr-connect/packages/buffr-sdk).

## Prerequisites

- Node 18–22
- iOS Simulator or Android emulator (or Expo Go)
- Running Buffr Connect instance (local or staging)

## Setup

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Or manually: build `buffr-connect/packages/buffr-types` + `buffr-sdk`, then `npm install` in this folder.

Copy `.env.example` → `.env` and set:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_BUFFR_BASE_URL` | Buffr Connect origin |
| `EXPO_PUBLIC_BUFFR_CLIENT_ID` | Registered OAuth client |
| `EXPO_PUBLIC_OAUTH_REDIRECT_URI` | Must match app scheme (`buffrfintech://oauth`) |
| `EXPO_PUBLIC_TOKEN_BRIDGE_URL` | **Recommended:** your backend that exchanges the code |
| `EXPO_PUBLIC_DEV_ACCESS_TOKEN` | Optional dev-only JWT from a browser session |

## Run

```bash
npx expo start
```

## OAuth note

`POST /api/oidc/token` may require an authenticated Buffr session. For production mobile apps, implement a **token bridge** on your backend (see `server-examples/token-bridge.route.example.ts`).

## Tests

```bash
npm test
```

## Layout

| Path | Role |
|------|------|
| `app/index.tsx` | Start OAuth, navigation |
| `app/accounts.tsx` | `useAccounts` / `useTransactions` |
| `app/loan.tsx` | `client.enrichment.affordability` |
| `lib/oauthFlow.ts` | PKCE + `WebBrowser.openAuthSessionAsync` |
