# Buffr G2P – Improvements Implemented

Aligned with PRD §3.13.2 (Areas for improvement). Implemented in `buffr-g2p` repo.

## 1. Testing

- **Jest** – `jest.config.js`, `jest.setup.js`, `jest-expo` preset.
- **Scripts** – `npm test`, `npm run test:watch`.
- **Unit tests** – `utils/__tests__/walletDisplay.test.ts` (getWalletIcon, getWalletProgress).
- **CI** – `.github/workflows/ci.yml` runs `npm test -- --passWithNoTests` after typecheck.

## 2. CI/CD

- **Workflow** – Added "Run tests" step to existing CI (TypeScript + tests).
- **Optional** – Add `npm run lint` when ESLint is configured.

## 3. Security (tokens)

- **Secure storage** – `services/secureStorage.ts`: `buffr_access_token`, `buffr_refresh_token` use `expo-secure-store`; other keys use AsyncStorage.
- **Auth** – `services/auth.ts` reads token via `getSecureItem('buffr_access_token')`.
- **Usage** – All group screens, wallets, add-card, and services that need the token now use `getSecureItem` from `services/secureStorage.ts`.

## 4. Offline & edge cases

- **Network** – `services/network.ts`: `isOnline()`, `setNetworkState()`, `withRetry(fn, { maxRetries, delayMs })`.
- **UI** – `components/common/OfflineBanner.tsx` (message + optional Retry), `components/common/ErrorWithRetry.tsx` (title, message, Try again).
- **NetInfo** – Not added; when needed install `@react-native-community/netinfo` and call `setNetworkState` from its listener. Use `OfflineBanner` in root or key screens when `!isOnline()`.

## 5. Analytics

- **Events** – `services/analytics.ts`: `recordEvent(event)`. Typed events: onboarding_complete, send_money, request_money, voucher_redeem, cash_out, group_create, group_add_member, wallet_add_money, screen_view.
- **Behaviour** – Logs in dev; ✅ Implemented: sends to backend `/api/v1/mobile/events` in production.
- **Backend** – `backend/src/server.ts`: `POST /api/v1/mobile/events` endpoint stores events in `analytics_events` table.

## 6. Accessibility

- **Components** – `OfflineBanner` and `ErrorWithRetry` use `accessibilityRole="alert"`, `accessibilityLabel`, and `accessibilityRole="button"` for actions.
- **Screens** – Add `accessibilityLabel` / `accessibilityRole` to key buttons and inputs screen-by-screen as needed.

## 7. i18n (foundation)

- **Strings** – `i18n/strings.en.ts`: `stringsEn` with common, onboarding, home, groups. Use for `t('key')` when i18n is wired.
- **Next steps** – Install `expo-localization` and `i18n-js` (or similar), detect locale, and switch strings by locale.

## 8. Push notifications

- **Implementation** - `services/notifications.ts`: Full implementation with `registerForPushNotifications()`, `setupNotificationHandlers()`, `getStoredPushToken()`.
- **Backend** - `POST /api/v1/mobile/device/register` endpoint stores tokens in `device_tokens` table.
- **Notifications** - `GET /api/v1/mobile/notifications` and `PATCH /api/v1/mobile/notifications/:id/read` endpoints.
- **Database** - Tables: `notifications`, `device_tokens` (via migration `002_analytics_notifications_atm.sql`).
- **Screen** - `app/profile/notifications.tsx` fetches from backend API.

## 9. Notifications Screen

- **Screen** - `app/profile/notifications.tsx` now fetches notifications from backend API.
- **Backend** - `GET /api/v1/mobile/notifications` returns user notifications.

## 10. ATM Code Generation

- **Backend** - `POST /api/cashout/atm-code` endpoint generates 6-digit codes, stores in `atm_codes` table.
- **Mobile** - `services/cashout.ts`: `getATMCode()` function connected to backend endpoint.
- **Database** - Table: `atm_codes` (via migration `002_analytics_notifications_atm.sql`).

## 11. Onboarding Photo Upload

- **Implementation** - `app/onboarding/photo.tsx`: Now uses `pickImageFromGallery()` and `captureImage()` from `services/device.ts`.
- **No more placeholders** - Gallery and camera functionality fully implemented.

## 12. Profile Management

- **Backend** - `PATCH /api/v1/mobile/user/profile` endpoint for updating profile.
- **Backend** - `POST /api/v1/mobile/auth/change-pin` endpoint for PIN changes.
- **Mobile** - `services/profile.ts`: New service with `updateProfile()` and `changePin()` functions.
- **Mobile** - `app/(tabs)/profile/edit-profile.tsx`: Full edit profile screen with first name, last name, photo.
- **Mobile** - `app/(tabs)/profile/change-pin.tsx`: Full change PIN screen with validation.

## 13. Database Migration 003

- **Migration** - `backend/migrations/003_user_profile_and_pin.sql`: Adds missing columns to production database.
- **Script** - `backend/scripts/run-migration-003.mjs`: Standalone script to run migration.
- **Columns added**:
  - `pin_hash` VARCHAR(255) to users table
  - `first_name` VARCHAR(100) to users table
  - `last_name` VARCHAR(100) to users table  
  - `photo_url` TEXT to users table
  - `type`, `data`, `is_read` columns to notifications table
  - Index on notifications(user_id, is_read, created_at)

---

**Summary:** Testing (Jest + CI), secure token storage, network retry + offline/error UI, ✅ Analytics events sent to backend, ✅ Push notifications implementation, ✅ Notifications screen API integration, ✅ ATM code generation, ✅ Onboarding photo upload, ✅ Profile editing and PIN change, ✅ Database migration 003 for user profile fields, accessibility on new components, i18n strings file.
