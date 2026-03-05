# Buffr G2P – Development Rules

## Data: Backend and Database Only

All user-facing data comes from the backend API and database.

- **Wallets, transactions, vouchers, contacts, profile, agents, bills, loans, groups:** Fetch from API when `EXPO_PUBLIC_API_BASE_URL` is set. On failure, surface errors or empty results.
- **AI Companion:** Backend only (`EXPO_PUBLIC_BUFFR_AI_URL`).
- **Auth:** Production uses backend OTP and user/card endpoints. When API is unconfigured, local generation (e.g. generateBuffrIdFromPhone) is for development only and must not be treated as production data sources.
- **Contacts:** When backend is configured, use API contacts as source of truth. Device contacts may be used when API is unreachable; backend remains the source of truth when available.
- **UI:** Input hint text and empty-state UI (e.g. “Map unavailable”) are fine. All list and entity data must come from the API.

## Summary

| Do | Don’t |
|----|--------|
| Call backend/DB for all real data | Return hardcoded arrays/objects as sample or demo data |
| Surface “Backend not configured” or API errors to the user | Silently return data when API is missing or fails |
| Use backend for OTP, user card, wallets, transactions, vouchers | Use in-memory or local-only data as production source |
| Keep unconfigured-backend behavior clearly commented and scoped to dev | Rely on unconfigured-backend behavior as production |
