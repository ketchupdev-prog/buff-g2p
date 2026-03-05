# Buffr G2P – Testing

Run all tests from repo root or per package.

## Quick reference

| Command | Where | What |
|--------|--------|------|
| `npm test` | **root** | Backend type-check + Mobile Jest (no Python) |
| `npm run test:backend` | root | Backend `tsc --noEmit` only |
| `npm run test:mobile` | root | Mobile Jest only |
| `npm run test:ai` | root | Buffr AI verify (requires backend venv) |
| `npm run test:ai-unit` | root or backend | Python unit tests (buffr_ai/tests) |
| `npm test` | **backend** | Same as `npm run type-check` |
| `npm run test:verify-ai` | backend | Python verify script (venv `ai` active) |
| `npm test` | **mobile** | Jest unit tests |

## 1. Backend (Node)

- **Type-check:** `cd backend && npm run test` or `npm run type-check`.
- **Buffr AI verify:** From `backend/` with venv `ai` active:
  ```bash
  source ai/bin/activate
  npm run test:verify-ai
  ```
  Or from root: `npm run test:ai` (uses system/default Python; for full check use venv in backend).

- **Buffr AI unit tests (user_profile, etc.):** From `backend/`:
  ```bash
  npm run test:ai-unit
  ```
  Runs `buffr_ai/tests/test_*.py` with unittest.

No Jest/Vitest in backend yet; tests are type-check, the Python verify script, and buffr_ai unit tests.

## 2. Mobile (Expo / React Native)

- **Unit tests:** `cd mobile && npm test`.
- **Watch:** `npm run test:watch`.
- **Config:** `jest.config.js`, `jest.setup.js` (mocks for SecureStore, AsyncStorage).
- **Tests:** `utils/__tests__/walletDisplay.test.ts`, `services/__tests__/companionApi.test.ts` (COMPANION_NOT_CONFIGURED, checkCompanionHealth, sendCompanionMessage body/auth/response, lastAssistantReply).

## 3. Buffr AI (Python)

- **Verify imports and graph:** From `backend/` with venv active:
  ```bash
  PYTHONPATH=. python scripts/verify_buffr_ai.py
  ```
- **Unit tests:** From `backend/`: `npm run test:ai-unit` (or `PYTHONPATH=. python -m unittest discover -s buffr_ai/tests -p 'test_*.py' -v`). Covers `user_profile` formatters (`format_user_context`, `format_user_info_response`).

## Project structure (relevant to tests)

```
buffr-g2p/
├── package.json          # Root: test, test:backend, test:mobile, test:ai
├── backend/
│   ├── package.json      # test (= type-check), test:verify-ai
│   ├── src/              # TypeScript (tsc --noEmit)
│   ├── buffr_ai/         # Python Companion + ML
│   └── scripts/
│       └── verify_buffr_ai.py
└── mobile/
    ├── package.json      # test (Jest), test:watch
    ├── jest.config.js
    ├── jest.setup.js
    ├── utils/__tests__/
    └── services/         # Add __tests__/ as needed
```

## Vulnerability check

- **Mobile:** `cd mobile && npm audit` / `npm audit fix`.
- **Backend:** `cd backend && npm audit` (if applicable).
