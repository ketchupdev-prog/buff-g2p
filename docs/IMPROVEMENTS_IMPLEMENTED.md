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
- **Behaviour** – Logs in dev; TODO: send to backend or third-party SDK in production.

## 6. Accessibility

- **Components** – `OfflineBanner` and `ErrorWithRetry` use `accessibilityRole="alert"`, `accessibilityLabel`, and `accessibilityRole="button"` for actions.
- **Screens** – Add `accessibilityLabel` / `accessibilityRole` to key buttons and inputs screen-by-screen as needed.

## 7. i18n (foundation)

- **Strings** – `i18n/strings.en.ts`: `stringsEn` with common, onboarding, home, groups. Use for `t('key')` when i18n is wired.
- **Next steps** – Install `expo-localization` and `i18n-js` (or similar), detect locale, and switch strings by locale.

## 8. Push notifications (stub)

- **Stub** – `services/notifications.ts`: `registerForPushNotifications()`, `setupNotificationHandlers()`. Return null / no-op until backend and FCM/APNs are ready.
- **Next steps** – Install `expo-notifications`, request permissions, get token, register with backend; handle notification response for deep links (incoming payment, voucher, group invite, request-to-pay).

## 9. Performance

- **No code change** – Use FlatList for long lists (already in use where applicable). Document bundle size / frame targets in PRD or team docs if needed.

---

**Summary:** Testing (Jest + CI), secure token storage, network retry + offline/error UI, analytics events, accessibility on new components, i18n strings file, and push/notifications stub are in place. Wire NetInfo, i18n runtime, and expo-notifications when ready.
